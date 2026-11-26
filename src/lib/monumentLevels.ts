import type { LevelDef } from './pathPuzzle';

// Each grid is drawn in its SOLVED form. At the start of a level the game
// turns every '@' tile randomly so the path is broken.
//
// Symbols:  S start   G goal   . empty
//           - │ straight ('-' and '|')
//           L └   r ┌   7 ┐   J ┘   corners
//           T ┬   U ┴   > ├   < ┤   tees      + cross
export const MONUMENT_LEVELS: LevelDef[] = [
  {
    name: 'The Bridge',
    description: 'One tile is out of place. Turn it to finish the bridge.',
    grid: [
      'S--7..',
      '...|..',
      '...|..',
      '...L-G',
    ],
    spin: [
      '......',
      '...@..',
      '......',
      '......',
    ],
    minTaps: 1,
  },
  {
    name: 'The Reflection',
    description: 'Two mirrored routes lead to the goal. You only need one.',
    grid: [
      'S-T-7.',
      '..|.|.',
      '..|.L7',
      'r-J..|',
      '|....|',
      'L--G-J',
    ],
    spin: [
      '..@...',
      '......',
      '....@.',
      '@.@...',
      '.....@',
      '......',
    ],
    minTaps: 3,
  },
  {
    name: 'The Maze',
    description: 'Crossroads split the way. Pick a route and turn its tiles.',
    grid: [
      'S--T-7',
      '...|.|',
      'r--+-J',
      '|..|..',
      'L-7L-7',
      '..L--G',
    ],
    spin: [
      '...@..',
      '......',
      '@....@',
      '......',
      '..@@.@',
      '..@...',
    ],
    minTaps: 4,
  },
  {
    name: 'The Impossible',
    description: 'Every junction turns. Look for the path the others hide.',
    grid: [
      'S-T--7',
      '..|..|',
      'r-+-T<',
      '|.|.||',
      '|.L-U<',
      'L----G',
    ],
    spin: [
      '..@..@',
      '......',
      '@...@@',
      '......',
      '....@@',
      '@.....',
    ],
    minTaps: 4,
  },
  {
    name: 'The Spiral',
    description: 'Follow the walls inward. Every corner must turn the right way.',
    grid: [
      'S----7',
      '.....|',
      'r--7.|',
      '|G-J.|',
      '|....|',
      'L----J',
    ],
    spin: [
      '.....@',
      '......',
      '@..@..',
      '...@.@',
      '......',
      '@....@',
    ],
    minTaps: 9,
  },
];
