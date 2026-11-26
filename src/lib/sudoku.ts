// Sudoku puzzles for kids: 5 levels from a tiny 4x4 up to a hard 9x9, with
// 50 numbered puzzles in each. Puzzle #12 of a level is built from a seed,
// so it is the same puzzle every time. Every puzzle has exactly one solution.

import { seededRandom } from './random';

export const PUZZLES_PER_LEVEL = 50;

export type SudokuLevel = {
  level: number; // 1-5
  name: string;
  emoji: string;
  size: number; // digits 1..size; the grid is size x size
  boxRows: number; // each box is boxRows x boxCols
  boxCols: number;
  givens: number; // numbers filled in at the start (fewer = harder)
};

export const SUDOKU_LEVELS: SudokuLevel[] = [
  { level: 1, name: 'Tiny', emoji: '🐣', size: 4, boxRows: 2, boxCols: 2, givens: 8 },
  { level: 2, name: 'Small', emoji: '🐥', size: 6, boxRows: 2, boxCols: 3, givens: 18 },
  { level: 3, name: 'Easy', emoji: '🦊', size: 9, boxRows: 3, boxCols: 3, givens: 40 },
  { level: 4, name: 'Medium', emoji: '🦁', size: 9, boxRows: 3, boxCols: 3, givens: 32 },
  { level: 5, name: 'Hard', emoji: '🐲', size: 9, boxRows: 3, boxCols: 3, givens: 26 },
];

export type SudokuPuzzle = {
  level: SudokuLevel;
  number: number; // 1..PUZZLES_PER_LEVEL (0 for an unnumbered random puzzle)
  puzzle: number[]; // row by row, 0 = empty
  solution: number[];
};

type Shape = Pick<SudokuLevel, 'size' | 'boxRows' | 'boxCols'>;

/** Which box (0-based, row by row) a cell belongs to. */
export const boxIndex = (shape: Shape, row: number, col: number): number =>
  Math.floor(row / shape.boxRows) * (shape.size / shape.boxCols) + Math.floor(col / shape.boxCols);

const popcount = (mask: number): number => {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
};

const shuffled = <T,>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Fill or count solutions of a grid with backtracking. Always tries the
 * empty cell with the fewest options first, which keeps 9x9 searches fast.
 * Bit d of a mask means digit d+1.
 *
 * Returns the number of solutions found (stopping at `limit`). If `fill`
 * is set, the grid is left holding the first solution.
 */
const search = (
  grid: number[],
  shape: Shape,
  limit: number,
  random: (() => number) | null,
  fill: boolean
): number => {
  const { size } = shape;
  const full = (1 << size) - 1;
  const rows = new Array<number>(size).fill(0);
  const cols = new Array<number>(size).fill(0);
  const boxes = new Array<number>(size).fill(0);
  const empties: number[] = [];

  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const v = grid[i];
    if (v === 0) {
      empties.push(i);
      continue;
    }
    const bit = 1 << (v - 1);
    const b = boxIndex(shape, r, c);
    if (rows[r] & bit || cols[c] & bit || boxes[b] & bit) return 0; // clash in the givens
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[b] |= bit;
  }

  let count = 0;
  const step = (): boolean => {
    // Pick the empty cell with the fewest candidates.
    let best = -1;
    let bestMask = 0;
    let bestCount = size + 1;
    for (const i of empties) {
      if (grid[i] !== 0) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      const mask = full & ~(rows[r] | cols[c] | boxes[boxIndex(shape, r, c)]);
      const n = popcount(mask);
      if (n < bestCount) {
        best = i;
        bestMask = mask;
        bestCount = n;
        if (n === 0) return false; // dead end
        if (n === 1) break;
      }
    }
    if (best === -1) {
      count++;
      return count >= limit; // stop once we have enough solutions
    }

    const r = Math.floor(best / size);
    const c = best % size;
    const b = boxIndex(shape, r, c);
    let digits: number[] = [];
    for (let d = 0; d < size; d++) if (bestMask & (1 << d)) digits.push(d + 1);
    if (random) digits = shuffled(digits, random);

    for (const v of digits) {
      const bit = 1 << (v - 1);
      grid[best] = v;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      const stop = step();
      if (stop && fill) return true; // keep the filled grid
      grid[best] = 0;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      if (stop) return true;
    }
    return false;
  };

  step();
  return count;
};

/** How many solutions a grid has, counting no further than `limit`. */
export const countSolutions = (grid: number[], shape: Shape, limit = 2): number =>
  search([...grid], shape, limit, null, false);

/** Solve a grid; returns null if it has no solution. */
export const solve = (grid: number[], shape: Shape): number[] | null => {
  const work = [...grid];
  return search(work, shape, 1, null, true) === 1 ? work : null;
};

/**
 * A new puzzle for a level: fill a random complete grid, then empty cells
 * one by one in random order, keeping each removal only if the puzzle still
 * has exactly one solution. Stops at the level's number of givens (on the
 * hardest level it may stop a few above if no more cells can go).
 */
export const generateSudoku = (level: SudokuLevel, random: () => number = Math.random): SudokuPuzzle => {
  const cells = level.size * level.size;
  const solution = new Array<number>(cells).fill(0);
  search(solution, level, 1, random, true);

  const puzzle = [...solution];
  let filled = cells;
  for (const i of shuffled(
    Array.from({ length: cells }, (_, k) => k),
    random
  )) {
    if (filled <= level.givens) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, level) === 1) {
      filled--;
    } else {
      puzzle[i] = keep; // removing it would allow two answers
    }
  }
  return { level, number: 0, puzzle, solution };
};

const cache = new Map<string, SudokuPuzzle>();

/** Numbered puzzle `number` (1-based) of a level: the same every time. */
export const getSudoku = (levelNumber: number, number: number): SudokuPuzzle => {
  const key = `${levelNumber}:${number}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const level = SUDOKU_LEVELS[levelNumber - 1];
  const made = { ...generateSudoku(level, seededRandom(levelNumber * 100003 + number * 7919)), number };
  cache.set(key, made);
  return made;
};
