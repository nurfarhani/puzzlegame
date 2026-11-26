// Logic for the Monument Valley-style path puzzle. No UI here.
//
// The board is a grid of tiles. Each path tile has openings on some of its
// four sides. Two neighbouring tiles are connected when both open towards
// each other. Some tiles can be rotated; the player rotates them until a
// connected path runs from the player to the goal.

// Openings are bit flags so a tile's shape is a single number.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const ALL = N | E | S | W;
const DIRECTIONS = [N, E, S, W] as const;

// Level grids are drawn with these symbols.
const SYMBOLS: Record<string, number> = {
  '-': E | W,
  '|': N | S,
  L: N | E, // └
  r: E | S, // ┌
  '7': S | W, // ┐
  J: N | W, // ┘
  T: E | S | W, // ┬
  U: N | E | W, // ┴
  '>': N | E | S, // ├
  '<': N | S | W, // ┤
  '+': ALL,
  S: ALL, // start: connects to any neighbour that opens towards it
  G: ALL, // goal
};

export type LevelDef = {
  name: string;
  description: string;
  // The solved layout, one string per row. '.' is an empty cell.
  grid: string[];
  // Same size as grid; '@' marks a tile the player can rotate.
  spin: string[];
  // Fewest rotations a scrambled board must need (sets the difficulty).
  minTaps?: number;
};

export type Cell = { open: number; rotatable: boolean } | null;

export type Board = {
  rows: number;
  cols: number;
  cells: Cell[]; // row-major: index = row * cols + col
  start: number;
  goal: number;
};

export const parseLevel = (def: LevelDef): Board => {
  const rows = def.grid.length;
  const cols = def.grid[0].length;
  const cells: Cell[] = [];
  let start = -1;
  let goal = -1;

  def.grid.forEach((line, row) => {
    if (line.length !== cols) throw new Error(`${def.name}: row ${row} has the wrong length`);
    [...line].forEach((ch, col) => {
      const index = row * cols + col;
      if (ch === '.') {
        cells.push(null);
        return;
      }
      const open = SYMBOLS[ch];
      if (open === undefined) throw new Error(`${def.name}: unknown symbol "${ch}"`);
      if (ch === 'S') start = index;
      if (ch === 'G') goal = index;
      cells.push({ open, rotatable: def.spin[row]?.[col] === '@' });
    });
  });

  if (start < 0 || goal < 0) throw new Error(`${def.name}: needs an S and a G`);
  return { rows, cols, cells, start, goal };
};

// Turn a tile's openings 90 degrees clockwise: N->E, E->S, S->W, W->N.
export const rotateOpen = (open: number): number => ((open << 1) | (open >> 3)) & ALL;

const opposite = (dir: number): number => ((dir << 2) | (dir >> 2)) & ALL;

const neighbor = (board: Board, index: number, dir: number): number => {
  const row = Math.floor(index / board.cols);
  const col = index % board.cols;
  if (dir === N) return row > 0 ? index - board.cols : -1;
  if (dir === S) return row < board.rows - 1 ? index + board.cols : -1;
  if (dir === E) return col < board.cols - 1 ? index + 1 : -1;
  return col > 0 ? index - 1 : -1;
};

// Cells joined to `index` through matching openings.
const linkedNeighbors = (board: Board, opens: number[], index: number): number[] => {
  const result: number[] = [];
  for (const dir of DIRECTIONS) {
    if (!(opens[index] & dir)) continue;
    const next = neighbor(board, index, dir);
    if (next >= 0 && opens[next] & opposite(dir)) result.push(next);
  }
  return result;
};

const opensOf = (board: Board): number[] => board.cells.map((c) => (c ? c.open : 0));

/** Every cell the player can walk to from `from`, including `from`. */
export const reachableFrom = (board: Board, from: number): Set<number> => {
  const opens = opensOf(board);
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    for (const next of linkedNeighbors(board, opens, current)) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

/** Cells to step through to walk from `from` to `to` (excluding `from`), or null. */
export const findWalk = (board: Board, from: number, to: number): number[] | null => {
  const opens = opensOf(board);
  const cameFrom = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() as number;
    if (current === to) {
      const steps: number[] = [];
      for (let at = to; at !== from; at = cameFrom.get(at) as number) steps.push(at);
      return steps.reverse();
    }
    for (const next of linkedNeighbors(board, opens, current)) {
      if (!cameFrom.has(next)) {
        cameFrom.set(next, current);
        queue.push(next);
      }
    }
  }
  return null;
};

/** A copy of the board with one tile turned 90 degrees clockwise. */
export const rotateCell = (board: Board, index: number): Board => {
  const cell = board.cells[index];
  if (!cell || !cell.rotatable) return board;
  const cells = board.cells.slice();
  cells[index] = { ...cell, open: rotateOpen(cell.open) };
  return { ...board, cells };
};

/**
 * Give every rotatable tile a random turn, retrying until the start and
 * goal are no longer connected and the fix needs at least `minTaps`
 * rotations. The layout started solved, so the result is always solvable.
 * If no shuffle reaches `minTaps`, the hardest one found is used.
 */
export const scramble = (
  board: Board,
  minTaps = 1,
  random: () => number = Math.random
): Board => {
  let best: Board | null = null;
  let bestTaps = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells = board.cells.map((cell) => {
      if (!cell || !cell.rotatable) return cell;
      let open = cell.open;
      const turns = 1 + Math.floor(random() * 3);
      for (let t = 0; t < turns; t++) open = rotateOpen(open);
      return { ...cell, open };
    });
    const scrambled = { ...board, cells };
    if (reachableFrom(scrambled, board.start).has(board.goal)) continue;
    const taps = solveRotations(scrambled, board.start);
    if (!taps) continue;
    if (taps.length >= minTaps) return scrambled;
    if (taps.length > bestTaps) {
      best = scrambled;
      bestTaps = taps.length;
    }
  }
  if (best) return best;
  throw new Error('Could not scramble this level into an unsolved state');
};

// Clockwise turns (0-3) that make `open` include every side in `need`, or -1.
const turnsToFit = (open: number, need: number, canTurn: boolean): number => {
  let o = open;
  for (let k = 0; k < (canTurn ? 4 : 1); k++) {
    if ((o & need) === need) return k;
    o = rotateOpen(o);
  }
  return -1;
};

/**
 * Fewest single rotations that connect `from` to the goal. Returns the
 * list of cells to tap, in order: [] if already connected, or null if no
 * set of rotations works (for example, the player walked into a dead end).
 * The tile the player stands on is never rotated.
 *
 * It finds the cheapest route through the grid, where passing through a
 * tile costs the turns needed to line that tile up with the way in and
 * the way out (Dijkstra over cell + entry side). That is fast on any board
 * size. In the rare case the cheapest route passes through one turning
 * tile twice (needing it two ways at once), that tile is pinned in each of
 * its four positions in turn and the search runs again.
 */
export const solveRotations = (board: Board, from: number, depth = 0): number[] | null => {
  if (reachableFrom(board, from).has(board.goal)) return [];

  const ENTRY_NONE = 4; // the starting cell has no entry side
  const stateCount = board.cells.length * 5;
  const dist = new Array<number>(stateCount).fill(Infinity);
  const parent = new Array<{ prev: number; cell: number; turns: number } | null>(stateCount).fill(null);
  const done = new Array<boolean>(stateCount).fill(false);
  const startState = from * 5 + ENTRY_NONE;
  dist[startState] = 0;

  let goalState = -1;
  for (;;) {
    // Pick the cheapest unfinished state (boards are small, so a scan is fine).
    let state = -1;
    for (let s = 0; s < stateCount; s++) {
      if (!done[s] && dist[s] < Infinity && (state < 0 || dist[s] < dist[state])) state = s;
    }
    if (state < 0) break;
    done[state] = true;

    const cellIndex = Math.floor(state / 5);
    const entry = state % 5;
    if (cellIndex === board.goal) {
      goalState = state;
      break;
    }
    const cell = board.cells[cellIndex];
    if (!cell) continue;
    const entryBit = entry === ENTRY_NONE ? 0 : DIRECTIONS[entry];
    const canTurn = cell.rotatable && cellIndex !== from;

    DIRECTIONS.forEach((exitBit) => {
      if (exitBit === entryBit) return;
      const turns = turnsToFit(cell.open, entryBit | exitBit, canTurn);
      if (turns < 0) return;
      const next = neighbor(board, cellIndex, exitBit);
      if (next < 0 || !board.cells[next]) return;
      const nextEntry = DIRECTIONS.indexOf(opposite(exitBit) as (typeof DIRECTIONS)[number]);
      const nextState = next * 5 + nextEntry;
      const cost = dist[state] + turns;
      if (cost < dist[nextState]) {
        dist[nextState] = cost;
        parent[nextState] = { prev: state, cell: cellIndex, turns };
      }
    });
  }
  if (goalState < 0) return null;

  // Rebuild the taps from the route, start to goal.
  const route: { cell: number; turns: number }[] = [];
  for (let step = parent[goalState]; step; step = parent[step.prev]) {
    route.push({ cell: step.cell, turns: step.turns });
  }
  route.reverse();

  // A turning tile used twice on the route would need two positions.
  const visits = new Map<number, number>();
  for (const { cell } of route) visits.set(cell, (visits.get(cell) ?? 0) + 1);
  const clash = route.find(
    ({ cell }) => (visits.get(cell) ?? 0) > 1 && board.cells[cell]?.rotatable && cell !== from
  );
  if (!clash) {
    const taps: number[] = [];
    for (const { cell, turns } of route) {
      for (let t = 0; t < turns; t++) taps.push(cell);
    }
    return taps;
  }
  if (depth >= 4) return null;

  // Pin the clashing tile in each position and keep the cheapest result.
  let best: number[] | null = null;
  let pinned = board;
  for (let k = 0; k < 4; k++) {
    const cell = pinned.cells[clash.cell] as { open: number; rotatable: boolean };
    const cells = pinned.cells.slice();
    cells[clash.cell] = { open: cell.open, rotatable: false };
    const rest = solveRotations({ ...pinned, cells }, from, depth + 1);
    if (rest) {
      const taps = [...Array(k).fill(clash.cell), ...rest];
      if (!best || taps.length < best.length) best = taps;
    }
    pinned = rotateCell(pinned, clash.cell);
  }
  return best;
};
