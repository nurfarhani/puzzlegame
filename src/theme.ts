// Shared look for the whole app: bright, friendly colours and a rounded
// font. Change a value here and every screen that uses it updates.

export const colors = {
  primary: '#6C63FF', // friendly purple-blue: main buttons, headers
  secondary: '#FF6B9D', // bubblegum pink
  background: '#FFF8EC', // warm cream page background
  card: '#FFFFFF',
  success: '#2ECC71', // green: matched cards, wins
  warning: '#FFB020', // sunny yellow: hints, selected cards
  danger: '#FF5A5F',
  sky: '#4FC3F7',
  text: '#2D2A4A', // deep indigo, softer than black
  textMuted: '#7A7799',
  white: '#FFFFFF',
  shadow: '#2D2A4A',
} as const;

// Each game's name, signature colour and icon, used on the home menu and in its
// header bar.
export const gameStyles = {
  sliding: { name: 'Sliding Puzzle', color: '#FF8A3D', emoji: '🧩' },
  wordsearch: { name: 'Word Search', color: '#4FC3F7', emoji: '🔤' },
  numbermatch: { name: 'Number Match', color: '#FF6B9D', emoji: '🃏' },
  monumentvalley: { name: 'Monument Valley', color: '#6C63FF', emoji: '🏰' },
  sudoku: { name: 'Sudoku', color: '#3D7BF7', emoji: '🔢' },
  jigsaw: { name: 'Jigsaw', color: '#12B886', emoji: '🖼️' },
  fruitpop: { name: 'Fruit Pop', color: '#E64980', emoji: '🍓' },
  pipes: { name: 'Flower Pipes', color: '#66A80F', emoji: '🌻' },
  maze: { name: 'Maze Run', color: '#0C8599', emoji: '🐭' },
  lights: { name: 'Light Switch', color: '#F59F00', emoji: '💡' },
  flood: { name: 'Color Flood', color: '#AE3EC9', emoji: '🎨' },
  picross: { name: 'Picture Cross', color: '#E03131', emoji: '🖍️' },
} as const;

export type GameId = keyof typeof gameStyles;

// Display order everywhere (home menu, leaderboard tabs, profile).
export const GAME_ORDER: GameId[] = [
  'monumentvalley',
  'sliding',
  'numbermatch',
  'wordsearch',
  'sudoku',
  'jigsaw',
  'fruitpop',
  'pipes',
  'maze',
  'lights',
  'flood',
  'picross',
];

// Fredoka: a rounded, kid-friendly typeface. Loaded in App.tsx.
export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

// Corner radii: generous everywhere for a soft, toy-like feel.
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** A darker version of a hex colour, for the 3D bottom edge of buttons and tiles. */
export const shade = (hex: string, amount = 0.22): string => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex; // only handles #rrggbb
  const channel = (i: number) =>
    Math.max(0, Math.round(parseInt(value.slice(i, i + 2), 16) * (1 - amount)));
  return `#${[0, 2, 4].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
};
