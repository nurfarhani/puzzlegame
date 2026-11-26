// Solver for the sliding puzzle (any square size), used for hints.
//
// It runs weighted A* (f = g + weight * h) with Manhattan distance plus
// linear conflict as the heuristic. Weighting makes it fast enough to run
// on a phone, at the cost of solutions that are valid but not always the
// shortest. That is fine for hints: every hint is a step on a real path
// to the solved board. Bigger boards use a bigger weight to stay fast.

const EMPTY = 0;

// Tile v belongs at index v - 1; the gap belongs in the last cell.
export type Board = number[];

type SearchNode = {
  board: Board;
  empty: number;
  g: number;
  f: number;
  key: string;
};

type Parent = { prevKey: string; move: number } | null;

const sizeOf = (board: Board) => Math.round(Math.sqrt(board.length));

const neighborCache = new Map<number, number[][]>();
const neighborsFor = (size: number): number[][] => {
  const hit = neighborCache.get(size);
  if (hit) return hit;
  const table = Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    const result: number[] = [];
    if (row > 0) result.push(index - size);
    if (row < size - 1) result.push(index + size);
    if (col > 0) result.push(index - 1);
    if (col < size - 1) result.push(index + 1);
    return result;
  });
  neighborCache.set(size, table);
  return table;
};

const heuristic = (board: Board, size: number): number => {
  let total = 0;
  const cells = size * size;

  // Manhattan distance.
  for (let i = 0; i < cells; i++) {
    const v = board[i];
    if (v === EMPTY) continue;
    const g = v - 1;
    total +=
      Math.abs(Math.floor(i / size) - Math.floor(g / size)) + Math.abs((i % size) - (g % size));
  }

  // Linear conflict: two tiles in their goal row (or column) but in the
  // wrong order need at least two extra moves to get past each other.
  for (let line = 0; line < size; line++) {
    for (let a = 0; a < size; a++) {
      for (let b = a + 1; b < size; b++) {
        const ra = board[line * size + a];
        const rb = board[line * size + b];
        if (
          ra !== EMPTY && rb !== EMPTY &&
          Math.floor((ra - 1) / size) === line &&
          Math.floor((rb - 1) / size) === line &&
          ra > rb
        ) {
          total += 2;
        }
        const ca = board[a * size + line];
        const cb = board[b * size + line];
        if (
          ca !== EMPTY && cb !== EMPTY &&
          (ca - 1) % size === line &&
          (cb - 1) % size === line &&
          ca > cb
        ) {
          total += 2;
        }
      }
    }
  }
  return total;
};

// One character per tile, so boards up to 7x7 make short unique keys.
const keyOf = (board: Board): string => String.fromCharCode(...board.map((v) => 48 + v));

// Minimal binary min-heap keyed on node.f.
class MinHeap {
  private items: SearchNode[] = [];

  get size() {
    return this.items.length;
  }
  push(item: SearchNode): void {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): SearchNode | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (last !== undefined && a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Find a path from `board` to the solved board.
 *
 * Returns an array of board indexes to tap, in order (each tap slides the
 * tile at that index into the empty space). Returns [] if already solved,
 * or null if no path was found within `maxNodes` expansions.
 */
export const solvePuzzle = (
  board: Board,
  { weight, maxNodes = 80000 }: { weight?: number; maxNodes?: number } = {}
): number[] | null => {
  const size = sizeOf(board);
  const w = weight ?? (size <= 3 ? 1 : size === 4 ? 3 : 5);
  const neighbors = neighborsFor(size);
  const startKey = keyOf(board);
  const h0 = heuristic(board, size);
  if (h0 === 0) return [];

  const parents = new Map<string, Parent>([[startKey, null]]);
  const bestG = new Map<string, number>([[startKey, 0]]);
  const heap = new MinHeap();
  heap.push({ board, empty: board.indexOf(EMPTY), g: 0, f: w * h0, key: startKey });

  let expanded = 0;
  while (heap.size > 0 && expanded < maxNodes) {
    const node = heap.pop();
    if (!node) break;
    if (node.g > (bestG.get(node.key) ?? Infinity)) continue; // stale entry
    expanded++;

    for (const next of neighbors[node.empty]) {
      const child = node.board.slice();
      child[node.empty] = child[next];
      child[next] = EMPTY;
      const key = keyOf(child);
      const g = node.g + 1;
      if ((bestG.get(key) ?? Infinity) <= g) continue;

      bestG.set(key, g);
      parents.set(key, { prevKey: node.key, move: next });
      const h = heuristic(child, size);

      if (h === 0) {
        // Walk back to the start to build the list of taps.
        const path: number[] = [];
        let k = key;
        let step = parents.get(k);
        while (step) {
          path.push(step.move);
          k = step.prevKey;
          step = parents.get(k);
        }
        return path.reverse();
      }
      heap.push({ board: child, empty: next, g, f: g + w * h, key });
    }
  }
  return null;
};

// Fallback when the solver gives up: the movable tile whose move lowers
// the heuristic the most.
export const greedyHint = (board: Board): number | null => {
  const size = sizeOf(board);
  const empty = board.indexOf(EMPTY);
  let best: number | null = null;
  let bestScore = Infinity;
  for (const index of neighborsFor(size)[empty]) {
    const child = board.slice();
    child[empty] = child[index];
    child[index] = EMPTY;
    const score = heuristic(child, size);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
};
