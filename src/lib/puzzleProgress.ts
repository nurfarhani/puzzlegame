// Saved progress for games with numbered puzzles in each level (Sudoku,
// Jigsaw): which puzzles are solved, with the best stars and time.
// Stored on the phone with AsyncStorage, separately for each player.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey } from './accounts';

export type PuzzleResult = {
  stars: number; // 1-3, best so far
  bestTime: number; // seconds, fastest so far
};

// results[level][puzzleNumber]
export type PuzzleProgress = {
  results: Record<number, Record<number, PuzzleResult>>;
};

export const emptyPuzzleProgress = (): PuzzleProgress => ({ results: {} });

export const loadPuzzleProgress = async (storageKey: string): Promise<PuzzleProgress> => {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(storageKey));
    if (!raw) return emptyPuzzleProgress();
    const parsed = JSON.parse(raw) as PuzzleProgress;
    return parsed && typeof parsed.results === 'object' ? parsed : emptyPuzzleProgress();
  } catch {
    return emptyPuzzleProgress(); // unreadable save: start fresh rather than crash
  }
};

export const savePuzzleProgress = async (storageKey: string, progress: PuzzleProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(scopedKey(storageKey), JSON.stringify(progress));
  } catch {
    // Storage unavailable: progress stays in memory for this session.
  }
};

/** Record a solved puzzle, keeping the best stars and the best time. */
export const withPuzzleResult = (
  progress: PuzzleProgress,
  level: number,
  puzzle: number,
  result: PuzzleResult
): PuzzleProgress => {
  const levelResults = progress.results[level] ?? {};
  const old = levelResults[puzzle];
  const best: PuzzleResult = old
    ? { stars: Math.max(old.stars, result.stars), bestTime: Math.min(old.bestTime, result.bestTime) }
    : result;
  return {
    results: { ...progress.results, [level]: { ...levelResults, [puzzle]: best } },
  };
};

export const resultFor = (progress: PuzzleProgress, level: number, puzzle: number) =>
  progress.results[level]?.[puzzle];

// `count`: only puzzles 1..count (older saves may hold puzzles a level no longer has).
export const solvedCount = (progress: PuzzleProgress, level: number, count = Infinity): number =>
  Object.keys(progress.results[level] ?? {}).filter((n) => Number(n) <= count).length;

export const starCount = (progress: PuzzleProgress, level: number, count = Infinity): number =>
  Object.entries(progress.results[level] ?? {}).reduce((sum, [n, r]) => (Number(n) <= count ? sum + r.stars : sum), 0);

/** Puzzles unlock in order: #1 is always open, then each one after a solved one. */
export const isUnlocked = (progress: PuzzleProgress, level: number, puzzle: number): boolean =>
  puzzle === 1 || resultFor(progress, level, puzzle - 1) !== undefined;

/** The next puzzle to play in a level: the first unsolved one. */
export const nextPuzzle = (progress: PuzzleProgress, level: number, count: number): number => {
  for (let n = 1; n <= count; n++) {
    if (!resultFor(progress, level, n)) return n;
  }
  return count; // all solved: point at the last one
};
