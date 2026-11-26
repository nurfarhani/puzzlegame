// Sliding puzzle levels: 5 difficulties with 30 numbered puzzles each.
// Puzzle #12 of a level is shuffled from a seed, so it is always the same
// starting board. Two in every three puzzles use a picture instead of numbers.

import { seededRandom } from './random';

export const PUZZLES_PER_LEVEL = 30;
export const EMPTY = 0;

export type SlidingLevel = {
  level: number; // 1-5
  name: string;
  emoji: string;
  size: number; // board is size x size
  shuffleMoves: number; // random slides used to mix it up
};

export const SLIDING_LEVELS: SlidingLevel[] = [
  { level: 1, name: 'Tiny', emoji: '🐣', size: 3, shuffleMoves: 14 },
  { level: 2, name: 'Easy', emoji: '🐥', size: 3, shuffleMoves: 200 },
  { level: 3, name: 'Medium', emoji: '🦊', size: 4, shuffleMoves: 40 },
  { level: 4, name: 'Hard', emoji: '🦁', size: 4, shuffleMoves: 300 },
  { level: 5, name: 'Expert', emoji: '🐲', size: 5, shuffleMoves: 500 },
];

export type TileStyle = 'numbers' | 'picture';

export type SlidingPuzzle = {
  level: SlidingLevel;
  number: number;
  style: TileStyle;
  pictureIndex: number; // into the jigsaw PICTURES (used when style is 'picture')
  mirrored: boolean;
  board: number[]; // starting board, row by row; 0 is the gap
};

/** The solved board: 1, 2, 3, ... with the gap last. */
export const solvedBoard = (size: number): number[] =>
  Array.from({ length: size * size }, (_, i) => (i === size * size - 1 ? EMPTY : i + 1));

export const isSolved = (board: number[]): boolean =>
  board.every((v, i) => (i === board.length - 1 ? v === EMPTY : v === i + 1));

/**
 * Style and picture for a numbered puzzle (cheap: no shuffling), so the
 * puzzle list can show it. Puzzles 1, 4, 7, ... use numbers; the rest use
 * pictures, cycling through them (mirrored on the second time round).
 */
export const slidingLook = (level: number, number: number, pictureCount: number) => {
  const style: TileStyle = number % 3 === 1 ? 'numbers' : 'picture';
  const pictureTurn = number - Math.ceil(number / 3) - 1; // picture puzzles before this one
  const start = (level - 1) * 3; // each level starts on a different picture
  return {
    style,
    pictureIndex: (start + pictureTurn) % pictureCount,
    mirrored: Math.floor(pictureTurn / pictureCount) % 2 === 1,
  };
};

const cache = new Map<string, SlidingPuzzle>();

/** Numbered puzzle `number` (1-based) of a level: the same every time. */
export const getSlidingPuzzle = (
  levelNumber: number,
  number: number,
  pictureCount: number
): SlidingPuzzle => {
  const key = `${levelNumber}:${number}:${pictureCount}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const level = SLIDING_LEVELS[levelNumber - 1];
  const { size } = level;
  const random = seededRandom(levelNumber * 100003 + number * 7919 + 29);

  // Shuffle by sliding random tiles into the gap (never straight back),
  // so the board is always solvable.
  let board = solvedBoard(size);
  for (let tries = 0; tries < 10; tries++) {
    board = solvedBoard(size);
    let empty = board.length - 1;
    let previous = -1;
    for (let s = 0; s < level.shuffleMoves; s++) {
      const row = Math.floor(empty / size);
      const col = empty % size;
      const options = [
        row > 0 ? empty - size : -1,
        row < size - 1 ? empty + size : -1,
        col > 0 ? empty - 1 : -1,
        col < size - 1 ? empty + 1 : -1,
      ].filter((n) => n >= 0 && n !== previous);
      const pick = options[Math.floor(random() * options.length)];
      board[empty] = board[pick];
      board[pick] = EMPTY;
      previous = empty;
      empty = pick;
    }
    if (!isSolved(board)) break; // never start already solved
  }

  const made: SlidingPuzzle = {
    level,
    number,
    ...slidingLook(levelNumber, number, pictureCount),
    board,
  };
  cache.set(key, made);
  return made;
};
