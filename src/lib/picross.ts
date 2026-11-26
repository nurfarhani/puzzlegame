// Picture Cross: number clues beside each row and above each column say how
// many squares in a row are coloured, in order. Colour the right squares to
// reveal a hidden pixel picture.
//
// Pictures are drawn by hand below: '.' is empty, a letter is a coloured
// square (the letter picks the colour shown when the picture is revealed).

export const PICROSS_LEVELS_PER_WORLD = 10;

export const PICROSS_WORLDS = [
  { name: 'Tiny Pictures', emoji: '🐣', color: '#FFF3BF' },
  { name: 'Little Pictures', emoji: '🐥', color: '#FFE8CC' },
  { name: 'Big Pictures', emoji: '🦚', color: '#D3F9D8' },
];

/** Reveal colours for the letters in a picture. */
export const INKS: Record<string, string> = {
  r: '#FF6B6B', // red
  o: '#FF922B', // orange
  y: '#FCC419', // yellow
  g: '#51CF66', // green
  G: '#2B8A3E', // dark green
  b: '#4DABF7', // blue
  c: '#99E9F2', // light blue
  u: '#9775FA', // purple
  p: '#F783AC', // pink
  B: '#A0522D', // brown
  w: '#ADB5BD', // grey
  k: '#495057', // dark grey
};

type Picture = { name: string; emoji: string; art: string[] };

const PICTURES: Picture[] = [
  // --- 5 x 5 ---
  { name: 'Heart', emoji: '❤️', art: ['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..'] },
  { name: 'Star', emoji: '⭐', art: ['..y..', 'yyyyy', '.yyy.', '.y.y.', 'y...y'] },
  { name: 'House', emoji: '🏠', art: ['..r..', '.rrr.', 'rrrrr', '.BBB.', '.B.B.'] },
  { name: 'Tree', emoji: '🌲', art: ['..g..', '.ggg.', 'ggggg', '..B..', '.BBB.'] },
  { name: 'Mushroom', emoji: '🍄', art: ['.rrr.', 'rrwrr', 'rrrrr', '.www.', '.www.'] },
  { name: 'Sailboat', emoji: '⛵', art: ['..r..', '..rr.', '..rrr', 'bbbbb', '.bbb.'] },
  { name: 'Smile', emoji: '😊', art: ['.yyy.', 'y.y.y', 'yyyyy', 'y...y', '.yyy.'] },
  { name: 'Cat', emoji: '🐱', art: ['o...o', 'ooooo', 'o.o.o', 'ooooo', '.ooo.'] },
  { name: 'Ice cream', emoji: '🍦', art: ['.ppp.', 'ppppp', 'ooooo', '.ooo.', '..o..'] },
  { name: 'Bell', emoji: '🔔', art: ['..y..', '.yyy.', '.yyy.', 'yyyyy', '..y..'] },
  // --- 6 x 6 ---
  { name: 'Apple', emoji: '🍎', art: ['..gg..', '.rrrr.', 'rrrrrr', 'rrrrrr', 'rrrrrr', '.rrrr.'] },
  { name: 'Fish', emoji: '🐟', art: ['......', '.bbb.b', 'b.bbbb', 'bbbbbb', '.bbb.b', '......'] },
  { name: 'Flower', emoji: '🌼', art: ['..pp..', '.pyyp.', '.pyyp.', '..pp..', '..gg..', '.gggg.'] },
  { name: 'Umbrella', emoji: '☂️', art: ['..uu..', '.uuuu.', 'uuuuuu', '...B..', '...B..', '..BB..'] },
  { name: 'Duck', emoji: '🦆', art: ['.yy...', 'oyy...', '.yy...', '.yyyyy', '..yyyy', '..yyy.'] },
  { name: 'Crown', emoji: '👑', art: ['......', 'y.yy.y', 'yyyyyy', 'yryyry', 'yyyyyy', '......'] },
  { name: 'Ghost', emoji: '👻', art: ['.uuuu.', 'uuuuuu', 'u.uu.u', 'uuuuuu', 'uuuuuu', 'u.uu.u'] },
  { name: 'Car', emoji: '🚗', art: ['......', '..rr..', '.rrrr.', 'rrrrrr', 'rrrrrr', '.k..k.'] },
  { name: 'Snowman', emoji: '⛄', art: ['..cc..', '..cc..', '.cccc.', 'cccccc', 'cccccc', '.cccc.'] },
  { name: 'Butterfly', emoji: '🦋', art: ['u....u', 'uu..uu', 'uuBBuu', 'uuBBuu', 'uu..uu', 'u....u'] },
  // --- 8 x 8 ---
  {
    name: 'Rocket',
    emoji: '🚀',
    art: ['...rr...', '..wwww..', '..wbbw..', '..wwww..', '..wwww..', '.rwwwwr.', 'rr.oo.rr', '...oo...'],
  },
  {
    name: 'Rainbow',
    emoji: '🌈',
    art: ['..rrrr..', '.roooor.', 'royyyyor', 'roy..yor', 'roy..yor', 'roy..yor', 'www..www', '........'],
  },
  {
    name: 'Cake',
    emoji: '🎂',
    art: ['..o..o..', '..p..p..', 'pppppppp', 'BBBBBBBB', 'pppppppp', 'BBBBBBBB', 'pppppppp', '.wwwwww.'],
  },
  {
    name: 'Turtle',
    emoji: '🐢',
    art: ['........', '..GGG...', '.GGGGG..', 'GGGGGGgg', 'GGGGGGgg', '.gg..gg.', '........', '........'],
  },
  {
    name: 'Watermelon',
    emoji: '🍉',
    art: ['rrrrrrrr', 'rr.rr.rr', 'rrrrrrrr', 'grr.rrrg', '.grrrrg.', '..gggg..', '........', '........'],
  },
  {
    name: 'Robot',
    emoji: '🤖',
    art: ['...rr...', '...ww...', '.wwwwww.', '.wbwwbw.', '.wwwwww.', '.wrrrrw.', '.wwwwww.', '..w..w..'],
  },
  {
    name: 'Castle',
    emoji: '🏰',
    art: ['u.u..u.u', 'uuu..uuu', 'uuuuuuuu', 'uu.uu.uu', 'uuuuuuuu', 'uuu..uuu', 'uuu..uuu', 'uuu..uuu'],
  },
  {
    name: 'Bunny',
    emoji: '🐰',
    art: ['.w...w..', '.w...w..', '.wwwww..', 'ww.w.ww.', 'wwwpwww.', 'wwwwwww.', '.wwwww..', '........'],
  },
  {
    name: 'Ship',
    emoji: '🛳️',
    art: ['...r....', '...rr...', '...rrr..', '...rrrr.', '...r....', 'BBBBBBBB', '.BBBBBB.', 'cccccccc'],
  },
  {
    name: 'Penguin',
    emoji: '🐧',
    art: ['..kkkk..', '.kkkkkk.', '.k.kk.k.', '.kkookk.', 'kkwwwwkk', 'kkwwwwkk', '.kwwwwk.', '..o..o..'],
  },
];

export const PICROSS_LEVEL_COUNT = PICTURES.length;

export type PicrossLevel = {
  number: number;
  name: string;
  emoji: string;
  rows: number;
  cols: number;
  filled: boolean[]; // the answer
  ink: string[]; // reveal colour of each square ('' when empty)
  rowClues: number[][];
  colClues: number[][];
};

/** Lengths of the runs of filled squares in a line, e.g. [2, 1]; [0] if none. */
export const clueFor = (line: boolean[]): number[] => {
  const runs: number[] = [];
  let run = 0;
  for (const on of line) {
    if (on) run++;
    else if (run) {
      runs.push(run);
      run = 0;
    }
  }
  if (run) runs.push(run);
  return runs.length ? runs : [0];
};

const cache = new Map<number, PicrossLevel>();

/** Level `n` (1-based). */
export const getPicrossLevel = (n: number): PicrossLevel => {
  const hit = cache.get(n);
  if (hit) return hit;
  const pic = PICTURES[Math.min(Math.max(n, 1), PICTURES.length) - 1];
  const rows = pic.art.length;
  const cols = pic.art[0].length;
  const cells = pic.art.join('').split('');
  const filled = cells.map((ch) => ch !== '.');
  const level: PicrossLevel = {
    number: n,
    name: pic.name,
    emoji: pic.emoji,
    rows,
    cols,
    filled,
    ink: cells.map((ch) => (ch === '.' ? '' : INKS[ch] ?? '#495057')),
    rowClues: Array.from({ length: rows }, (_, r) => clueFor(filled.slice(r * cols, (r + 1) * cols))),
    colClues: Array.from({ length: cols }, (_, c) =>
      clueFor(Array.from({ length: rows }, (_, r) => filled[r * cols + c]))
    ),
  };
  cache.set(n, level);
  return level;
};

/** Stars: 3 with no mistakes, 2 with up to 2, else 1. A hint caps it at 2. */
export const starsForMistakes = (mistakes: number, hints: number): number => {
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  return hints > 0 ? Math.min(stars, 2) : stars;
};

/** The raw pictures, for tests. */
export const PICROSS_PICTURES = PICTURES;
