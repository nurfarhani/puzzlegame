// The players on this phone, and who is playing now.
//
// Each player has their own saved progress (stars, levels, which guides they
// have seen): storage keys go through scopedKey(), which adds the player's id.
// A player can be a plain one on this phone, or linked to a Google account
// (see google.ts); either way everything is saved only on this phone.
// The leaderboard is shared by everyone on the phone.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVATARS, DEFAULT_PROFILE, NAME_MAX_LENGTH, cleanName, setCurrentProfile, type Profile } from './profile';
import { forgetPlayer, playerKey } from './scores';

export type Account = Profile & {
  id: string;
  google?: { id: string; email: string };
};

export type AccountStore = {
  accounts: Account[];
  current: string | null; // id of the player who is signed in, or null
};

const STORE_KEY = 'puzzleGames.accounts.v1';
// Where the single profile lived before there could be several players.
const LEGACY_PROFILE_KEY = 'puzzleGames.profile.v1';
// Saves that belong to the whole phone, not to one player.
const SHARED_KEYS = new Set([STORE_KEY, LEGACY_PROFILE_KEY, 'puzzleGames.scores.v1']);
// The first player keeps the plain storage keys, so progress saved before
// there were several players stays with them.
const FIRST_ID = 'main';
const SCOPE = '@';

let store: AccountStore = { accounts: [], current: null };

/** The players as they are now (a new object after every change). */
export const accountStore = (): AccountStore => store;

export const currentAccount = (): Account | null =>
  store.accounts.find((a) => a.id === store.current) ?? null;

/** The storage key for the player who is signed in. */
export const scopedKey = (key: string): string =>
  !store.current || store.current === FIRST_ID ? key : `${key}${SCOPE}${store.current}`;

const apply = (next: AccountStore) => {
  store = next;
  const account = currentAccount();
  setCurrentProfile(account ? { name: account.name, avatar: account.avatar } : null);
  return store;
};

const persist = async (next: AccountStore) => {
  apply(next);
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the players still work for this session.
  }
  return store;
};

const isAccount = (a: Partial<Account> | null): a is Account =>
  Boolean(a) && typeof a?.id === 'string' && typeof a.name === 'string' && typeof a.avatar === 'string';

export const loadAccounts = async (): Promise<AccountStore> => {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AccountStore>;
      const accounts = (Array.isArray(parsed.accounts) ? parsed.accounts : []).filter(isAccount);
      const current = accounts.some((a) => a.id === parsed.current) ? (parsed.current as string) : null;
      return apply({ accounts, current });
    }
    // An older save with one profile: that player becomes the first one and
    // stays signed in, with all their progress.
    const legacy = await AsyncStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<Profile>;
      if (typeof parsed.name === 'string' && typeof parsed.avatar === 'string') {
        const first: Account = {
          id: FIRST_ID,
          name: cleanName(parsed.name) || DEFAULT_PROFILE.name,
          avatar: parsed.avatar,
        };
        return persist({ accounts: [first], current: FIRST_ID });
      }
    }
  } catch {
    // Unreadable save: start with no players rather than crash.
  }
  return apply({ accounts: [], current: null });
};

/** True if another player on this phone already has this name. */
export const nameTaken = (name: string, exceptId?: string): boolean =>
  store.accounts.some((a) => a.id !== exceptId && playerKey(a.name) === playerKey(name));

/** The name, or the name with a number on the end if another player has it. */
export const uniqueName = (name: string): string => {
  const base = cleanName(name) || DEFAULT_PROFILE.name;
  if (!nameTaken(base)) return base;
  for (let n = 2; ; n++) {
    const tail = String(n);
    const candidate = `${base.slice(0, NAME_MAX_LENGTH - tail.length).trim()}${tail}`;
    if (!nameTaken(candidate)) return candidate;
  }
};

export const randomAvatar = (): string => AVATARS[Math.floor(Math.random() * AVATARS.length)];

export const findGoogleAccount = (googleId: string): Account | null =>
  store.accounts.find((a) => a.google?.id === googleId) ?? null;

/** Add a player and sign them in. */
export const createAccount = async (profile: Profile, google?: Account['google']): Promise<Account> => {
  const takenIds = new Set(store.accounts.map((a) => a.id));
  let id = FIRST_ID;
  while (takenIds.has(id)) id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const account: Account = { id, name: profile.name, avatar: profile.avatar, ...(google ? { google } : {}) };
  await persist({ accounts: [...store.accounts, account], current: id });
  return account;
};

export const updateAccount = async (id: string, change: Partial<Omit<Account, 'id'>>): Promise<void> => {
  await persist({
    ...store,
    accounts: store.accounts.map((a) => (a.id === id ? { ...a, ...change } : a)),
  });
};

export const signInAs = async (id: string): Promise<void> => {
  if (store.accounts.some((a) => a.id === id)) await persist({ ...store, current: id });
};

export const signOut = async (): Promise<void> => {
  await persist({ ...store, current: null });
};

/** Delete a player, their saved progress and their leaderboard scores. */
export const removeAccount = async (id: string): Promise<void> => {
  const account = store.accounts.find((a) => a.id === id);
  if (!account) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const theirs = keys.filter((k) =>
      id === FIRST_ID ? !k.includes(SCOPE) && !SHARED_KEYS.has(k) : k.endsWith(`${SCOPE}${id}`)
    );
    await AsyncStorage.multiRemove(theirs);
    if (id === FIRST_ID) await AsyncStorage.removeItem(LEGACY_PROFILE_KEY);
  } catch {
    // Storage unavailable: the player is still removed from the list.
  }
  await forgetPlayer(account.name);
  await persist({
    accounts: store.accounts.filter((a) => a.id !== id),
    current: store.current === id ? null : store.current,
  });
};
