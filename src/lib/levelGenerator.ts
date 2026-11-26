// All 100 Monument Valley levels.
//
// Levels 1-5 are hand-drawn (monumentLevels.ts). Levels 6-100 are built
// by a generator seeded with the level number, so level 37 is always the
// same layout on every phone and every play. Boards get bigger, paths get
// longer, and more tiles turn as the level number rises.

import { MONUMENT_LEVELS } from './monumentLevels';
import { type Board, type Cell, N, E, S, W, parseLevel } from './pathPuzzle';
import { seededRandom } from './random';

export const TOTAL_LEVELS = 100;
export const LEVELS_PER_CHAPTER = 10;

export type Chapter = {
  number: number;
  name: string;
  color: string; // soft background for this chapter on the route map
  accent: string;
};

export const CHAPTERS: Chapter[] = [
  { number: 1, name: 'The Garden', color: '#dcefe9', accent: '#2f8f83' },
  { number: 2, name: 'The Forest Steps', color: '#e2efd6', accent: '#5b8a2e' },
  { number: 3, name: 'The Desert', color: '#f7e3cc', accent: '#c07a2c' },
  { number: 4, name: 'The Sunset Palace', color: '#fbe0d0', accent: '#c8553d' },
  { number: 5, name: 'The Ocean Tower', color: '#d7e8f6', accent: '#2f6fa8' },
  { number: 6, name: 'The Frozen Lake', color: '#dff1f5', accent: '#2b8aa0' },
  { number: 7, name: 'The Clockwork Spire', color: '#ece4d8', accent: '#8a6a3b' },
  { number: 8, name: 'The Night Temple', color: '#e3dbf2', accent: '#6c4fa3' },
  { number: 9, name: 'The Star Observatory', color: '#dcdcf3', accent: '#4a4fa3' },
  { number: 10, name: 'The Summit', color: '#f6d9df', accent: '#b04866' },
];

// Every level needs a chapter: TOTAL_LEVELS must equal
// CHAPTERS.length * LEVELS_PER_CHAPTER.

export const chapterOf = (levelNumber: number): Chapter =>
  CHAPTERS[Math.floor((levelNumber - 1) / LEVELS_PER_CHAPTER)];

export type LevelInfo = {
  number: number; // 1-based
  name: string;
  description: string;
  chapter: Chapter;
  solved: Board; // the solved layout; the game shuffles it before play
  minTaps: number;
};


const ADJECTIVES = [
  'Quiet', 'Hidden', 'Silver', 'Golden', 'Forgotten', 'Turning', 'Endless', 'Sleeping',
  'Crooked', 'Floating', 'Painted', 'Hollow', 'Gentle', 'Shifting', 'Lost', 'Distant',
  'Broken', 'Secret', 'Twisted', 'Ancient',
];
const NOUNS = [
  'Stair', 'Bridge', 'Tower', 'Garden', 'Gate', 'Court', 'Arch', 'Spire',
  'Path', 'Hall', 'Steps', 'Window', 'Well', 'Terrace', 'Lantern', 'Cloister',
  'Pillar', 'Passage', 'Crossing', 'Dome',
];
const TIPS = [
  'Turn the tiles until the gold path reaches the goal.',
  'Not every branch leads somewhere. Follow the one that does.',
  'Straight tiles only have two useful positions.',
  'Work backwards from the goal if you get stuck.',
  'Watch the gold glow spread as each tile clicks into place.',
  'Some junctions offer two ways forward. Pick the cheaper one.',
];

const DIRS = [N, E, S, W];
const oppositeOf = (dir: number) => ((dir << 2) | (dir >> 2)) & 15;

// Board size and difficulty settings for a generated level.
const settingsFor = (n: number) => {
  const t = (n - 6) / (TOTAL_LEVELS - 6); // 0 at level 6, 1 at level 100
  const [rows, cols] =
    n <= 15 ? [5, 5] : n <= 35 ? [6, 6] : n <= 60 ? [7, 6] : n <= 85 ? [7, 7] : [8, 7];
  return {
    rows,
    cols,
    pathShare: 0.42 + 0.12 * t, // share of cells the main path covers
    spinShare: 0.4 + 0.45 * t, // share of path tiles that turn
    branches: 1 + Math.round(4 * t), // dead-end side paths
    minTaps: Math.round(3 + 15 * t),
  };
};

const generateBoard = (n: number): { board: Board; minTaps: number } => {
  const random = seededRandom(n * 7919 + 17);
  const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];
  const shuffled = <T,>(items: T[]): T[] => {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const cfg = settingsFor(n);
  const { rows, cols } = cfg;
  const size = rows * cols;
  const step = (index: number, dir: number): number => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    if (dir === N) return r > 0 ? index - cols : -1;
    if (dir === S) return r < rows - 1 ? index + cols : -1;
    if (dir === E) return c < cols - 1 ? index + 1 : -1;
    return c > 0 ? index - 1 : -1;
  };

  // 1. Main path: a random self-avoiding walk from an edge cell, found by
  //    depth-first search with backtracking.
  const target = Math.round(size * cfg.pathShare);
  const edgeCells = [...Array(size).keys()].filter((i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
  });
  const distance = (a: number, b: number) =>
    Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols));
  let path: number[] = [];
  for (
    let attempt = 0;
    attempt < 50 && (path.length < target || distance(path[0], path[path.length - 1]) < 3);
    attempt++
  ) {
    const start = pick(edgeCells);
    const onPath = new Set([start]);
    const trail = [start];
    let budget = 4000;
    const dfs = (): boolean => {
      const here = trail[trail.length - 1];
      // The start and goal open on every side, so they must not end up
      // next to each other (they would always be connected). Keep the goal
      // at least 3 steps away from the start as the crow flies.
      if (trail.length >= target && distance(start, here) >= 3) return true;
      if (--budget <= 0) return false;
      for (const dir of shuffled(DIRS)) {
        const next = step(here, dir);
        if (next < 0 || onPath.has(next)) continue;
        onPath.add(next);
        trail.push(next);
        if (dfs()) return true;
        trail.pop();
        onPath.delete(next);
      }
      return false;
    };
    if (dfs()) path = trail.slice();
  }
  if (path.length === 0) throw new Error(`Level ${n}: could not build a path`);

  // Openings per cell, built from links between neighbours.
  const open = new Array<number>(size).fill(0);
  const used = new Set(path);
  const link = (a: number, dir: number) => {
    const b = step(a, dir);
    open[a] |= dir;
    open[b] |= oppositeOf(dir);
  };
  const dirBetween = (a: number, b: number) => DIRS.find((d) => step(a, d) === b) as number;
  for (let i = 0; i + 1 < path.length; i++) link(path[i], dirBetween(path[i], path[i + 1]));

  const start = path[0];
  const goal = path[path.length - 1];

  // 2. Dead-end branches off the main path, to mislead.
  for (let b = 0; b < cfg.branches; b++) {
    const from = pick(path.slice(1, -1));
    let here = from;
    const length = 1 + Math.floor(random() * 3);
    for (let k = 0; k < length; k++) {
      const options = DIRS.filter((d) => {
        const next = step(here, d);
        return next >= 0 && !used.has(next);
      });
      if (options.length === 0) break;
      const dir = pick(options);
      const next = step(here, dir);
      link(here, dir);
      used.add(next);
      here = next;
    }
  }

  // 3. Choose which tiles turn: a share of the path tiles, plus a few
  //    branch tiles. Crosses look the same every way round, so skip them.
  const turnable = (i: number) => i !== start && i !== goal && open[i] !== 15 && open[i] !== 0;
  const pathTiles = shuffled(path.filter(turnable));
  const spinCount = Math.max(1, Math.round(pathTiles.length * cfg.spinShare));
  const spin = new Set(pathTiles.slice(0, spinCount));
  [...used].filter((i) => turnable(i) && !path.includes(i)).forEach((i) => {
    if (random() < 0.5) spin.add(i);
  });

  const cells: Cell[] = open.map((o, i) => {
    if (i === start || i === goal) return { open: 15, rotatable: false };
    if (!used.has(i)) return null;
    return { open: o, rotatable: spin.has(i) };
  });

  return { board: cropToUsed({ rows, cols, cells, start, goal }), minTaps: cfg.minTaps };
};

// Trim empty rows and columns from the edges, so the tiles can be drawn
// bigger and the board has no blank strips.
const cropToUsed = (board: Board): Board => {
  let top = board.rows;
  let bottom = -1;
  let left = board.cols;
  let right = -1;
  board.cells.forEach((cell, i) => {
    if (!cell) return;
    const r = Math.floor(i / board.cols);
    const c = i % board.cols;
    top = Math.min(top, r);
    bottom = Math.max(bottom, r);
    left = Math.min(left, c);
    right = Math.max(right, c);
  });
  const rows = bottom - top + 1;
  const cols = right - left + 1;
  const moved = (i: number) =>
    (Math.floor(i / board.cols) - top) * cols + ((i % board.cols) - left);

  const cells: Cell[] = new Array(rows * cols).fill(null);
  board.cells.forEach((cell, i) => {
    if (cell) cells[moved(i)] = cell;
  });
  return { rows, cols, cells, start: moved(board.start), goal: moved(board.goal) };
};

const cache = new Map<number, LevelInfo>();

export const getLevel = (levelNumber: number): LevelInfo => {
  const cached = cache.get(levelNumber);
  if (cached) return cached;

  let info: LevelInfo;
  const handmade = MONUMENT_LEVELS[levelNumber - 1];
  if (handmade) {
    info = {
      number: levelNumber,
      name: handmade.name,
      description: handmade.description,
      chapter: chapterOf(levelNumber),
      solved: parseLevel(handmade),
      minTaps: handmade.minTaps ?? 1,
    };
  } else {
    const random = seededRandom(levelNumber * 104729);
    const name = `The ${ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]} ${
      NOUNS[Math.floor(random() * NOUNS.length)]
    }`;
    const { board, minTaps } = generateBoard(levelNumber);
    info = {
      number: levelNumber,
      name,
      description: TIPS[levelNumber % TIPS.length],
      chapter: chapterOf(levelNumber),
      solved: board,
      minTaps,
    };
  }
  cache.set(levelNumber, info);
  return info;
};
