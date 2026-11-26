// Jigsaw pieces: levels, random tab layout and the outline of each piece.

export type JigsawLevel = {
  level: number; // 1-5
  name: string;
  emoji: string;
  grid: number; // pieces per side
};

export const JIGSAW_LEVELS: JigsawLevel[] = [
  { level: 1, name: 'Easy', emoji: '🐣', grid: 3 },
  { level: 2, name: 'Fun', emoji: '🐥', grid: 4 },
  { level: 3, name: 'Tricky', emoji: '🦊', grid: 5 },
  { level: 4, name: 'Hard', emoji: '🦁', grid: 6 },
  { level: 5, name: 'Expert', emoji: '🐲', grid: 7 },
];

// 24 per level: the puzzle list fits on one screen without scrolling.
export const PUZZLES_PER_LEVEL = 24;

export type JigsawPuzzle = {
  number: number; // 1..PUZZLES_PER_LEVEL
  pictureIndex: number; // into PICTURES
  mirrored: boolean;
  seed: number; // fixes the piece cut for this puzzle
};

/**
 * Numbered puzzle `number` of a level. With 10 pictures:
 * 1-10 each picture, 11-20 the same pictures mirrored, 21-24 four of them
 * again. Every puzzle has its own seed, so its cut is always the same and
 * differs from the other times that picture appears.
 */
export const jigsawPuzzle = (level: number, number: number, pictureCount: number): JigsawPuzzle => {
  const round = Math.floor((number - 1) / pictureCount);
  return {
    number,
    // Shift each level's order so level 2 doesn't start on the same picture.
    pictureIndex: (number - 1 + (level - 1) * 3) % pictureCount,
    mirrored: round % 2 === 1,
    seed: level * 100003 + number * 7919,
  };
};

/**
 * How far a tab can stick out past the piece's square, as a share of the
 * piece size. Each piece is drawn on a canvas this much bigger on every side.
 */
export const TAB_PAD = 0.28;

/**
 * Which way each inner edge's tab points.
 * h[r][c]: edge under piece (r, c); +1 = tab pokes down, -1 = pokes up.
 * v[r][c]: edge right of piece (r, c); +1 = tab pokes right, -1 = pokes left.
 */
export type Edges = { h: number[][]; v: number[][] };

export const makeEdges = (grid: number, random: () => number = Math.random): Edges => {
  const flip = () => (random() < 0.5 ? 1 : -1);
  return {
    h: Array.from({ length: grid - 1 }, () => Array.from({ length: grid }, flip)),
    v: Array.from({ length: grid }, () => Array.from({ length: grid - 1 }, flip)),
  };
};

/** [top, right, bottom, left]: +1 tab out, -1 tab in, 0 flat border. */
export const pieceSides = (edges: Edges, grid: number, row: number, col: number): number[] => [
  row === 0 ? 0 : -edges.h[row - 1][col],
  col === grid - 1 ? 0 : edges.v[row][col],
  row === grid - 1 ? 0 : edges.h[row][col],
  col === 0 ? 0 : -edges.v[row][col - 1],
];

// One knob along an edge from (0,0) to (1,0); y is how far it bulges out.
// Four curves: into the neck, round the head, back down, out of the neck.
const KNOB: [number, number][][] = [
  [[0.42, 0], [0.43, 0.04], [0.4, 0.08]],
  [[0.35, 0.16], [0.42, 0.26], [0.5, 0.26]],
  [[0.58, 0.26], [0.65, 0.16], [0.6, 0.08]],
  [[0.57, 0.04], [0.58, 0], [0.64, 0]],
];

const n = (value: number) => Math.round(value * 100) / 100;

/**
 * SVG path of a piece of side `size`, with its square's top-left corner at
 * (offsetX, offsetY). Traced clockwise: top, right, bottom, left.
 */
export const piecePath = (
  size: number,
  sides: number[],
  offsetX: number,
  offsetY: number = offsetX
): string => {
  const corners: [number, number][] = [
    [0, 0],
    [size, 0],
    [size, size],
    [0, size],
  ];
  const normals: [number, number][] = [
    [0, -1], // top edge bulges up
    [1, 0], // right edge bulges right
    [0, 1], // bottom edge bulges down
    [-1, 0], // left edge bulges left
  ];
  let d = `M${n(offsetX)},${n(offsetY)}`;
  for (let e = 0; e < 4; e++) {
    const [ax, ay] = corners[e];
    const [bx, by] = corners[(e + 1) % 4];
    const sign = sides[e];
    const point = (u: number, v: number) => {
      const x = ax + (bx - ax) * u + normals[e][0] * v * size * sign + offsetX;
      const y = ay + (by - ay) * u + normals[e][1] * v * size * sign + offsetY;
      return `${n(x)},${n(y)}`;
    };
    if (sign === 0) {
      d += ` L${point(1, 0)}`;
      continue;
    }
    d += ` L${point(0.36, 0)}`;
    for (const [c1, c2, end] of KNOB) {
      d += ` C${point(c1[0], c1[1])} ${point(c2[0], c2[1])} ${point(end[0], end[1])}`;
    }
    d += ` L${point(1, 0)}`;
  }
  return `${d} Z`;
};
