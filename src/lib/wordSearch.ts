// Word Search puzzles: 5 levels with 30 numbered, themed puzzles each.
// Puzzle #12 of a level is built from a seed, so it is always the same.

import { seededRandom } from './random';

export const PUZZLES_PER_LEVEL = 30;

// Row/column steps for each direction a word can run.
const RIGHT: Step = [0, 1];
const DOWN: Step = [1, 0];
const DOWN_RIGHT: Step = [1, 1];
const LEFT: Step = [0, -1];
const UP: Step = [-1, 0];
const UP_RIGHT: Step = [-1, 1];
const DOWN_LEFT: Step = [1, -1];
const UP_LEFT: Step = [-1, -1];
type Step = [number, number];

export type WordSearchLevel = {
  level: number; // 1-5
  name: string;
  emoji: string;
  size: number; // grid is size x size
  words: number; // words to find
  minLength: number;
  maxLength: number;
  directions: Step[];
  directionHint: string; // shown to the player
};

export const WORD_SEARCH_LEVELS: WordSearchLevel[] = [
  { level: 1, name: 'Tiny', emoji: '🐣', size: 8, words: 5, minLength: 3, maxLength: 5,
    directions: [RIGHT, DOWN], directionHint: 'Words go → across and ↓ down.' },
  { level: 2, name: 'Easy', emoji: '🐥', size: 10, words: 6, minLength: 3, maxLength: 6,
    directions: [RIGHT, DOWN], directionHint: 'Words go → across and ↓ down.' },
  { level: 3, name: 'Medium', emoji: '🦊', size: 12, words: 8, minLength: 4, maxLength: 8,
    directions: [RIGHT, DOWN, DOWN_RIGHT], directionHint: 'Words go →, ↓ and ↘ diagonal.' },
  { level: 4, name: 'Hard', emoji: '🦁', size: 13, words: 10, minLength: 4, maxLength: 9,
    directions: [RIGHT, DOWN, DOWN_RIGHT, LEFT, UP, UP_RIGHT],
    directionHint: 'Words can go backwards and up too!' },
  { level: 5, name: 'Expert', emoji: '🐲', size: 15, words: 12, minLength: 4, maxLength: 11,
    directions: [RIGHT, DOWN, DOWN_RIGHT, LEFT, UP, UP_RIGHT, DOWN_LEFT, UP_LEFT],
    directionHint: 'Words can go any of 8 ways!' },
];

export type Theme = { name: string; emoji: string; words: string[] };

export const THEMES: Theme[] = [
  { name: 'Animals', emoji: '🐾', words: ['CAT', 'DOG', 'COW', 'PIG', 'FOX', 'OWL', 'BEAR', 'LION', 'FROG', 'DUCK', 'GOAT', 'TIGER', 'ZEBRA', 'HORSE', 'MOUSE', 'RABBIT', 'MONKEY', 'TURTLE', 'GIRAFFE', 'PENGUIN', 'ELEPHANT', 'KANGAROO'] },
  { name: 'Fruits', emoji: '🍎', words: ['FIG', 'KIWI', 'LIME', 'PEAR', 'PLUM', 'APPLE', 'GRAPE', 'LEMON', 'MANGO', 'MELON', 'PEACH', 'BANANA', 'CHERRY', 'ORANGE', 'PAPAYA', 'COCONUT', 'APRICOT', 'DURIAN', 'BLUEBERRY', 'PINEAPPLE', 'STRAWBERRY', 'WATERMELON'] },
  { name: 'Colours', emoji: '🎨', words: ['RED', 'TAN', 'BLUE', 'PINK', 'GOLD', 'GRAY', 'GREEN', 'BLACK', 'WHITE', 'BROWN', 'CORAL', 'YELLOW', 'ORANGE', 'PURPLE', 'SILVER', 'MAROON', 'VIOLET', 'INDIGO', 'MAGENTA', 'TURQUOISE'] },
  { name: 'Space', emoji: '🚀', words: ['SUN', 'SKY', 'MOON', 'STAR', 'MARS', 'COMET', 'ORBIT', 'EARTH', 'VENUS', 'ALIEN', 'PLANET', 'ROCKET', 'SATURN', 'GALAXY', 'METEOR', 'JUPITER', 'NEPTUNE', 'ASTEROID', 'TELESCOPE', 'ASTRONAUT'] },
  { name: 'Ocean', emoji: '🐠', words: ['SEA', 'FISH', 'CRAB', 'SEAL', 'WAVE', 'SHELL', 'WHALE', 'SHARK', 'CORAL', 'SQUID', 'TURTLE', 'OCTOPUS', 'DOLPHIN', 'LOBSTER', 'SEAWEED', 'SEAHORSE', 'STARFISH', 'JELLYFISH'] },
  { name: 'Food', emoji: '🍕', words: ['EGG', 'PIE', 'BUN', 'RICE', 'SOUP', 'CAKE', 'MILK', 'BREAD', 'PIZZA', 'PASTA', 'HONEY', 'CHEESE', 'BURGER', 'COOKIE', 'NOODLES', 'PANCAKE', 'POPCORN', 'SANDWICH', 'SPAGHETTI'] },
  { name: 'Weather', emoji: '⛅', words: ['FOG', 'ICE', 'SUN', 'RAIN', 'SNOW', 'WIND', 'HAIL', 'CLOUD', 'STORM', 'FROST', 'SUNNY', 'BREEZE', 'RAINBOW', 'THUNDER', 'TORNADO', 'DRIZZLE', 'SNOWFLAKE', 'LIGHTNING', 'HURRICANE'] },
  { name: 'Toys', emoji: '🧸', words: ['TOP', 'BALL', 'DOLL', 'KITE', 'YOYO', 'DRUM', 'TRAIN', 'ROBOT', 'TEDDY', 'BLOCKS', 'PUZZLE', 'MARBLE', 'RATTLE', 'SCOOTER', 'BALLOON', 'CRAYONS', 'DOMINOES', 'TRAMPOLINE'] },
  { name: 'Transport', emoji: '🚗', words: ['BUS', 'CAR', 'VAN', 'SHIP', 'BOAT', 'TAXI', 'BIKE', 'TRAIN', 'TRUCK', 'PLANE', 'SUBWAY', 'ROCKET', 'TRACTOR', 'SCOOTER', 'BICYCLE', 'AIRPLANE', 'SUBMARINE', 'HELICOPTER'] },
  { name: 'My Body', emoji: '👀', words: ['ARM', 'LEG', 'EAR', 'EYE', 'TOE', 'LIP', 'HAND', 'FOOT', 'KNEE', 'NOSE', 'HEAD', 'HAIR', 'TEETH', 'THUMB', 'ELBOW', 'ANKLE', 'FINGER', 'EYEBROW', 'STOMACH', 'SHOULDER'] },
  { name: 'Bugs', emoji: '🐞', words: ['ANT', 'BEE', 'BUG', 'FLY', 'MOTH', 'WASP', 'FLEA', 'GNAT', 'SNAIL', 'MIDGE', 'BEETLE', 'SPIDER', 'CICADA', 'TERMITE', 'LADYBUG', 'CRICKET', 'BUTTERFLY', 'DRAGONFLY', 'GRASSHOPPER', 'CATERPILLAR'] },
  { name: 'Farm', emoji: '🚜', words: ['HEN', 'PIG', 'COW', 'HAY', 'BARN', 'GOAT', 'LAMB', 'SEED', 'CORN', 'SHEEP', 'HORSE', 'FIELD', 'FENCE', 'FARMER', 'TRACTOR', 'ROOSTER', 'CHICKEN', 'PUMPKIN', 'SCARECROW'] },
  { name: 'School', emoji: '🎒', words: ['PEN', 'MAP', 'BOOK', 'DESK', 'BELL', 'CLASS', 'CHALK', 'PAPER', 'RULER', 'ERASER', 'PENCIL', 'CRAYON', 'TEACHER', 'LIBRARY', 'SCISSORS', 'BACKPACK', 'NOTEBOOK', 'HOMEWORK'] },
  { name: 'Music', emoji: '🎵', words: ['SONG', 'DRUM', 'BAND', 'HARP', 'BELL', 'TUBA', 'FLUTE', 'PIANO', 'VIOLIN', 'GUITAR', 'SINGER', 'RHYTHM', 'MELODY', 'TRUMPET', 'CONCERT', 'TROMBONE', 'XYLOPHONE', 'ORCHESTRA', 'TAMBOURINE'] },
  { name: 'Sports', emoji: '⚽', words: ['RUN', 'SKI', 'GOLF', 'SWIM', 'KICK', 'TEAM', 'GOAL', 'SKATE', 'TENNIS', 'SOCCER', 'HOCKEY', 'KARATE', 'BOWLING', 'CYCLING', 'BASEBALL', 'FOOTBALL', 'BADMINTON', 'VOLLEYBALL', 'BASKETBALL'] },
];

export type Placement = { word: string; cells: [number, number][] };

export type WordSearchPuzzle = {
  level: WordSearchLevel;
  number: number;
  theme: Theme;
  grid: string[][];
  placements: Placement[]; // one per word to find, in list order
};

const shuffled = <T,>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** The theme used by a numbered puzzle (each level starts on a different theme). */
export const themeFor = (level: number, number: number): Theme =>
  THEMES[(number - 1 + (level - 1) * 4) % THEMES.length];

const cache = new Map<string, WordSearchPuzzle>();

/** Numbered puzzle `number` (1-based) of a level: the same every time. */
export const getWordSearch = (levelNumber: number, number: number): WordSearchPuzzle => {
  const key = `${levelNumber}:${number}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const level = WORD_SEARCH_LEVELS[levelNumber - 1];
  const theme = themeFor(levelNumber, number);
  const random = seededRandom(levelNumber * 100003 + number * 7919 + 17);
  const { size } = level;
  const grid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill(''));
  const placements: Placement[] = [];

  const candidates = shuffled(
    theme.words.filter((w) => w.length >= level.minLength && w.length <= level.maxLength && w.length <= size),
    random
  );

  // Try to place each candidate word until we have enough. Words may cross
  // where they share a letter. A word that doesn't fit is skipped, so every
  // word in the list is really in the grid.
  for (const word of candidates) {
    if (placements.length >= level.words) break;
    for (let attempt = 0; attempt < 200; attempt++) {
      const [dr, dc] = level.directions[Math.floor(random() * level.directions.length)];
      const row = Math.floor(random() * size);
      const col = Math.floor(random() * size);
      const endRow = row + dr * (word.length - 1);
      const endCol = col + dc * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      const cells: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
        cells.push([r, c]);
      }
      if (!fits) continue;
      cells.forEach(([r, c], i) => {
        grid[r][c] = word[i];
      });
      placements.push({ word, cells });
      break;
    }
  }

  // Fill the gaps with random letters.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = String.fromCharCode(65 + Math.floor(random() * 26));
    }
  }

  // Shortest words first in the list: easier to start with.
  placements.sort((a, b) => a.word.length - b.word.length || a.word.localeCompare(b.word));
  const made: WordSearchPuzzle = { level, number, theme, grid, placements };
  cache.set(key, made);
  return made;
};

// ---------------------------------------------------------------------------
// Picking letters: a word is a straight line of touching cells.

type Cell = [number, number];

const sameCell = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

export const sameCells = (a: Cell[], b: Cell[]): boolean =>
  a.length === b.length && a.every((cell, i) => sameCell(cell, b[i]));

/** True if `prefix` is the start of `cells` (and shorter). */
export const startsWithCells = (cells: Cell[], prefix: Cell[]): boolean =>
  prefix.length < cells.length && prefix.every((cell, i) => sameCell(cell, cells[i]));

/**
 * Can `cell` be the next letter? It must touch the last picked letter
 * (sideways, up/down or diagonally) and keep going the same way as the
 * letters before it, so a word is always a straight line.
 */
export const continuesLine = (selected: Cell[], cell: Cell): boolean => {
  if (selected.length === 0) return true;
  const last = selected[selected.length - 1];
  const dr = cell[0] - last[0];
  const dc = cell[1] - last[1];
  if (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) return false;
  if (selected.length === 1) return true;
  const before = selected[selected.length - 2];
  return dr === last[0] - before[0] && dc === last[1] - before[1];
};
