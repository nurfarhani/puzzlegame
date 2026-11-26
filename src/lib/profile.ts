// A player's profile: a gamer name and an emoji avatar. The players on this
// phone, and who is playing now, are kept by accounts.ts.

export const NAME_MAX_LENGTH = 16;

export type Profile = {
  name: string;
  avatar: string; // one emoji
};

export const AVATARS = [
  '🦊', '🐼', '🐯', '🐸', '🦄', '🐙',
  '🐵', '🐨', '🦁', '🐧', '🐶', '🐱',
  '🐰', '🐲', '🦖', '🐝', '🦉', '🐳',
] as const;

export const DEFAULT_PROFILE: Profile = { name: 'Player', avatar: '🦊' };

// The player who is playing now, so games can stamp scores with their name
// without waiting on storage. Set by accounts.ts.
let cached: Profile | null = null;

export const currentProfile = (): Profile => cached ?? DEFAULT_PROFILE;

export const setCurrentProfile = (profile: Profile | null): void => {
  cached = profile;
};

/** Trim, squash repeated spaces and cut to the maximum length. */
export const cleanName = (raw: string): string =>
  raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH).trim();

const NAME_STARTS = [
  'Super', 'Speedy', 'Happy', 'Brave', 'Clever', 'Lucky', 'Sunny', 'Mighty',
  'Zippy', 'Bouncy', 'Cosmic', 'Turbo', 'Jolly', 'Sparkly', 'Ninja', 'Rocket',
];
const NAME_ENDS = [
  'Fox', 'Panda', 'Tiger', 'Frog', 'Unicorn', 'Octopus', 'Monkey', 'Koala',
  'Lion', 'Penguin', 'Puppy', 'Kitty', 'Bunny', 'Dragon', 'Dino', 'Owl',
];

/** A fun random gamer name such as "ZippyPanda27" (always within the length limit). */
export const randomGamerName = (): string => {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  const number = Math.floor(Math.random() * 90) + 10;
  return `${pick(NAME_STARTS)}${pick(NAME_ENDS)}${number}`.slice(0, NAME_MAX_LENGTH);
};
