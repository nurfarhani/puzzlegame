// Saved progress for Monument Valley: which levels are done, and how well.
// Stored on the phone with AsyncStorage, so it survives closing the app.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey } from './accounts';
import { TOTAL_LEVELS } from './levelGenerator';

const STORAGE_KEY = 'monumentValley.progress.v1';

export type Stars = 1 | 2 | 3;

export type LevelResult = {
  stars: Stars;
  bestTurns: number; // fewest turns used to finish it
  bestPar: number; // the par on the play that set bestTurns
};

export type Progress = {
  // Keyed by level number (1-based). Levels unlock in order, so the
  // completed levels are always 1..n.
  results: Record<number, LevelResult>;
};

export const emptyProgress = (): Progress => ({ results: {} });

export const loadProgress = async (): Promise<Progress> => {
  try {
    const raw = await AsyncStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Progress;
    return parsed && typeof parsed.results === 'object' ? parsed : emptyProgress();
  } catch {
    return emptyProgress(); // unreadable save: start fresh rather than crash
  }
};

export const saveProgress = async (progress: Progress): Promise<void> => {
  try {
    await AsyncStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(progress));
  } catch {
    // Saving failed (storage full or unavailable); the game keeps working
    // and the progress stays in memory for this session.
  }
};

/**
 * Stars for a finished level:
 * 3 = matched par without a hint, 2 = close to par (or used a hint),
 * 1 = finished.
 */
export const starsFor = (turns: number, par: number, usedHint: boolean): Stars => {
  const slack = Math.max(2, Math.round(par * 0.5));
  if (turns <= par && !usedHint) return 3;
  if (turns <= par + slack) return 2;
  return 1;
};

/** Record a finished level, keeping the better of the old and new result. */
export const withResult = (
  progress: Progress,
  level: number,
  result: LevelResult
): Progress => {
  const old = progress.results[level];
  const better: LevelResult = old
    ? {
        stars: Math.max(old.stars, result.stars) as Stars,
        bestTurns: Math.min(old.bestTurns, result.bestTurns),
        bestPar: old.bestTurns <= result.bestTurns ? old.bestPar : result.bestPar,
      }
    : result;
  return { results: { ...progress.results, [level]: better } };
};

export const completedCount = (progress: Progress): number =>
  Object.keys(progress.results).length;

/** The next level to play: the first one not finished yet. */
export const currentLevel = (progress: Progress): number => {
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    if (!progress.results[n]) return n;
  }
  return TOTAL_LEVELS; // everything done: point at the last level
};

export const totalStars = (progress: Progress): number =>
  Object.values(progress.results).reduce((sum, r) => sum + r.stars, 0);
