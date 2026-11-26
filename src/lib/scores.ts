// Leaderboard and play history for every game.
//
// Every finished game is saved as a PlayRecord stamped with the gamer name
// and avatar at the time it was played (like an arcade machine). We keep:
//   - history: the most recent plays, newest first
//   - top:     the 10 best plays of each game, best first
//   - players: per-name totals and personal bests, for the profile screen
// Everything lives on the phone in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameId } from '../theme';
import { currentProfile } from './profile';

const STORAGE_KEY = 'puzzleGames.scores.v1';
const HISTORY_LIMIT = 200;
export const TOP_LIMIT = 10;

export type PlayRecord = {
  id: string;
  game: GameId;
  player: string;
  avatar: string;
  date: number; // ms since epoch
  won: boolean;
  // Game-specific numbers; only the ones a game uses are set.
  moves?: number; // sliding, number match, jigsaw, fruit pop, pipes / lights (taps), maze (steps), flood
  hints?: number; // sliding, sudoku
  score?: number; // word search, fruit pop
  timeLeft?: number; // word search, seconds
  found?: number; // word search
  total?: number; // word search
  difficulty?: string; // word search
  level?: number; // monument valley, sudoku, jigsaw, fruit pop, pipes, ...
  stars?: number; // monument valley, fruit pop, pipes, maze, lights, flood, picture cross
  turns?: number; // monument valley
  time?: number; // sudoku, jigsaw, pipes: seconds taken
  mistakes?: number; // sudoku, picture cross
  puzzle?: number; // sudoku, jigsaw, word search: numbered puzzle within the level
  theme?: string; // word search: e.g. "🐾 Animals"
  picture?: string; // jigsaw, picture cross: picture name
  pieces?: number; // jigsaw
};

export type NewPlay = Omit<PlayRecord, 'id' | 'player' | 'avatar' | 'date'>;

export type PlayerStats = {
  plays: Partial<Record<GameId, number>>;
  wins: Partial<Record<GameId, number>>;
  best: Partial<Record<GameId, PlayRecord>>;
};

export type ScoreStore = {
  history: PlayRecord[];
  top: Partial<Record<GameId, PlayRecord[]>>;
  players: Record<string, PlayerStats>; // keyed by playerKey(name)
};

export type RecordResult = {
  rank: number | null; // 1-based place in the game's top 10, or null
  personalBest: boolean;
};

const emptyStore = (): ScoreStore => ({ history: [], top: {}, players: {} });

/** Names are matched without caring about upper/lower case. */
export const playerKey = (name: string): string => name.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Ranking rules per game

/** Negative when a is the better play, positive when b is. */
export const comparePlays = (a: PlayRecord, b: PlayRecord): number => {
  const byWin = Number(b.won) - Number(a.won);
  if (byWin !== 0) return byWin;
  const diff = (() => {
    switch (a.game) {
      case 'sliding':
        // Harder level first (older plays from before levels have none).
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (a.moves ?? 0) - (b.moves ?? 0) ||
          (a.hints ?? 0) - (b.hints ?? 0)
        );
      case 'numbermatch':
        return (a.moves ?? 0) - (b.moves ?? 0);
      case 'wordsearch':
        // Levelled plays (with a level) rank by level, then time, then hints.
        // Older plays from before levels have none and fall back to score.
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (a.time ?? 0) - (b.time ?? 0) ||
          (a.hints ?? 0) - (b.hints ?? 0) ||
          (b.score ?? 0) - (a.score ?? 0) ||
          (b.timeLeft ?? 0) - (a.timeLeft ?? 0)
        );
      case 'monumentvalley':
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (b.stars ?? 0) - (a.stars ?? 0) ||
          (a.turns ?? 0) - (b.turns ?? 0)
        );
      case 'sudoku':
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (a.time ?? 0) - (b.time ?? 0) ||
          (a.mistakes ?? 0) + (a.hints ?? 0) - ((b.mistakes ?? 0) + (b.hints ?? 0))
        );
      case 'jigsaw':
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (a.time ?? 0) - (b.time ?? 0) ||
          (a.moves ?? 0) - (b.moves ?? 0)
        );
      case 'fruitpop':
        return (b.level ?? 0) - (a.level ?? 0) || (b.score ?? 0) - (a.score ?? 0);
      case 'pipes':
      case 'maze':
      case 'lights':
      case 'flood':
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (b.stars ?? 0) - (a.stars ?? 0) ||
          (a.moves ?? 0) - (b.moves ?? 0) ||
          (a.time ?? 0) - (b.time ?? 0)
        );
      case 'picross':
        return (
          (b.level ?? 0) - (a.level ?? 0) ||
          (b.stars ?? 0) - (a.stars ?? 0) ||
          (a.mistakes ?? 0) - (b.mistakes ?? 0) ||
          (a.time ?? 0) - (b.time ?? 0)
        );
    }
  })();
  return diff || a.date - b.date; // ties: whoever got there first
};

/** One line explaining how a game's leaderboard is ranked. */
export const RANKING_RULE: Record<GameId, string> = {
  monumentvalley: 'Furthest level wins',
  sliding: 'Hardest level, then fewest moves',
  numbermatch: 'Fewest moves wins',
  wordsearch: 'Hardest level, then fastest time',
  sudoku: 'Hardest level, then fastest time',
  jigsaw: 'Hardest level, then fastest time',
  fruitpop: 'Furthest level, then highest score',
  pipes: 'Furthest level, then fewest taps',
  maze: 'Furthest maze, then fewest steps',
  lights: 'Furthest level, then fewest taps',
  flood: 'Furthest level, then fewest moves',
  picross: 'Most pictures, then fewest mistakes',
};

// ---------------------------------------------------------------------------
// Describing a play for the screens

export const formatSeconds = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** 12345 -> "12,345" */
export const withCommas = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** The big number on a leaderboard row, with its label. */
export const headline = (play: PlayRecord): { value: string; label: string } => {
  switch (play.game) {
    case 'sliding':
    case 'numbermatch':
      return {
        value: String(play.moves ?? 0),
        label: `${play.moves === 1 ? 'move' : 'moves'}${play.level ? ` · lv ${play.level}` : ''}`,
      };
    case 'wordsearch':
      return play.level
        ? { value: formatSeconds(play.time ?? 0), label: `level ${play.level}` }
        : { value: String(play.score ?? 0), label: 'points' }; // from before levels
    case 'monumentvalley':
      return { value: String(play.level ?? 0), label: 'level' };
    case 'sudoku':
    case 'jigsaw':
      return { value: formatSeconds(play.time ?? 0), label: `level ${play.level ?? 0}` };
    case 'fruitpop':
      return { value: withCommas(play.score ?? 0), label: `points · lv ${play.level ?? 0}` };
    case 'pipes':
    case 'maze':
    case 'lights':
    case 'flood':
      return { value: String(play.level ?? 0), label: 'level' };
    case 'picross':
      return { value: String(play.level ?? 0), label: 'picture' };
  }
};

/** A short line of detail under the player's name. */
export const describe = (play: PlayRecord): string => {
  switch (play.game) {
    case 'sliding': {
      const base = `${plural(play.moves ?? 0, 'move')} · ${plural(play.hints ?? 0, 'hint')}`;
      return play.level
        ? `Level ${play.level}${play.puzzle ? ` #${play.puzzle}` : ''} · ${play.picture ?? ''} · ${base}`
        : base; // from before levels: always the 4x4 numbers board
    }
    case 'numbermatch':
      return `All 8 pairs in ${plural(play.moves ?? 0, 'move')}`;
    case 'wordsearch': {
      if (play.level) {
        return `Level ${play.level}${play.puzzle ? ` #${play.puzzle}` : ''} · ${play.theme ?? ''} · ${
          play.total ?? 0
        } words · ${plural(play.hints ?? 0, 'hint')}`;
      }
      // From before levels: a timed game with a score.
      const words = `${play.found ?? 0}/${play.total ?? 0} words`;
      const level = play.difficulty ? `${play.difficulty} · ` : '';
      return play.won
        ? `${level}${words} · ${formatSeconds(play.timeLeft ?? 0)} left`
        : `${level}⏰ Time's up · ${words}`;
    }
    case 'monumentvalley':
      return `Level ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(
        play.turns ?? 0,
        'turn'
      )}`;
    case 'sudoku':
      return `Level ${play.level ?? 0}${play.puzzle ? ` #${play.puzzle}` : ''} · ${formatSeconds(
        play.time ?? 0
      )} · ${plural(
        play.mistakes ?? 0,
        'mistake'
      )} · ${plural(play.hints ?? 0, 'hint')}`;
    case 'jigsaw':
      return `${play.puzzle ? `#${play.puzzle} ` : ''}${play.picture ?? 'Picture'} · ${
        play.pieces ?? 0
      } pieces · ${formatSeconds(
        play.time ?? 0
      )}`;
    case 'fruitpop':
      return play.won
        ? `Level ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(play.moves ?? 0, 'move')}`
        : `Level ${play.level ?? 0} · 😮 Out of moves`;
    case 'pipes':
      return `Level ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(
        play.moves ?? 0,
        'tap'
      )} · ${formatSeconds(play.time ?? 0)}`;
    case 'maze':
      return `Maze ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(play.moves ?? 0, 'step')} · ${formatSeconds(
        play.time ?? 0
      )}`;
    case 'lights':
      return `Level ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(play.moves ?? 0, 'tap')} · ${formatSeconds(
        play.time ?? 0
      )}`;
    case 'flood':
      return play.won
        ? `Level ${play.level ?? 0} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(play.moves ?? 0, 'move')}`
        : `Level ${play.level ?? 0} · 😮 Out of moves`;
    case 'picross':
      return `${play.picture ?? 'Picture'} · ${'⭐'.repeat(play.stars ?? 0)} · ${plural(
        play.mistakes ?? 0,
        'mistake'
      )} · ${formatSeconds(play.time ?? 0)}`;
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Just now", "5 min ago", "Today 3:42 PM", "Yesterday", "20 Nov". */
export const timeAgo = (date: number, now = Date.now()): string => {
  const minutes = Math.floor((now - date) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const d = new Date(date);
  const today = new Date(now);
  const sameDay = (x: Date, y: Date) =>
    x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  const clock = () => {
    const h = d.getHours() % 12 || 12;
    return `${h}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  };
  if (sameDay(d, today)) return `Today ${clock()}`;
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday ${clock()}`;
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? day : `${day} ${d.getFullYear()}`;
};

// ---------------------------------------------------------------------------
// Storage

let cache: ScoreStore | null = null;
// Saves run one after another so two quick wins can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();

export const loadScores = async (): Promise<ScoreStore> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ScoreStore) : null;
    cache =
      parsed && Array.isArray(parsed.history) && parsed.top && parsed.players
        ? parsed
        : emptyStore();
  } catch {
    cache = emptyStore(); // unreadable save: start fresh rather than crash
  }
  return cache;
};

const persist = async (store: ScoreStore) => {
  cache = store;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable: scores stay in memory for this session.
  }
};

/** Add a play to the history and leaderboard. Resolves with where it placed. */
export const recordPlay = (play: NewPlay): Promise<RecordResult> => {
  const run = async (): Promise<RecordResult> => {
    const store = await loadScores();
    const profile = currentProfile();
    const record: PlayRecord = {
      ...play,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      player: profile.name,
      avatar: profile.avatar,
      date: Date.now(),
    };

    // Top 10 for this game.
    const top = [...(store.top[play.game] ?? []), record].sort(comparePlays).slice(0, TOP_LIMIT);
    const index = top.findIndex((r) => r.id === record.id);

    // The player's totals and personal best.
    const key = playerKey(record.player);
    const old = store.players[key] ?? { plays: {}, wins: {}, best: {} };
    const previousBest = old.best[play.game];
    const isBetter = !previousBest || comparePlays(record, previousBest) < 0;
    const personalBest = record.won && isBetter;
    const stats: PlayerStats = {
      plays: { ...old.plays, [play.game]: (old.plays[play.game] ?? 0) + 1 },
      wins: { ...old.wins, [play.game]: (old.wins[play.game] ?? 0) + (record.won ? 1 : 0) },
      best: isBetter ? { ...old.best, [play.game]: record } : old.best,
    };

    await persist({
      history: [record, ...store.history].slice(0, HISTORY_LIMIT),
      top: { ...store.top, [play.game]: top },
      players: { ...store.players, [key]: stats },
    });
    return { rank: index >= 0 ? index + 1 : null, personalBest };
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
};

/** Wipe every score, the history and all player totals. */
export const clearScores = async (): Promise<ScoreStore> => {
  const fresh = emptyStore();
  queue = queue.then(() => persist(fresh));
  await queue;
  return fresh;
};

/** Remove one player's plays and totals (when the player is deleted). */
export const forgetPlayer = async (name: string): Promise<void> => {
  const key = playerKey(name);
  const theirs = (r: PlayRecord) => playerKey(r.player) === key;
  const run = async () => {
    const store = await loadScores();
    const top: ScoreStore['top'] = {};
    for (const [game, plays] of Object.entries(store.top) as [GameId, PlayRecord[]][]) {
      top[game] = plays.filter((r) => !theirs(r));
    }
    const players = { ...store.players };
    delete players[key];
    await persist({ history: store.history.filter((r) => !theirs(r)), top, players });
  };
  queue = queue.then(run, run).catch(() => undefined);
  await queue;
};

/** Text for the win popup, or undefined if the play wasn't special. */
export const badgeFor = (result: RecordResult): string | undefined => {
  if (result.rank === 1) return '🏆 New top score! #1 on the leaderboard';
  if (result.rank !== null && result.personalBest) return `🏅 New personal best! #${result.rank} on the leaderboard`;
  if (result.rank !== null) return `🏅 #${result.rank} on the leaderboard`;
  if (result.personalBest) return '⭐ New personal best!';
  return undefined;
};
