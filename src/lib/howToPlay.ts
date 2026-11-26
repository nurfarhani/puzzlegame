// "How to play" guides for every game, shown from the ❓ button in a game's
// header and automatically the first time each game is opened.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameId } from '../theme';
import { scopedKey } from './accounts';

export type HowToPlay = {
  goal: string; // one line: what you're trying to do
  steps: { icon: string; text: string }[];
  stars: string; // how stars (or the score) are earned
};

const PICK_PUZZLE = {
  icon: '📋',
  text: 'Pick a level at the top, then a puzzle. Finishing a puzzle opens the next one.',
};
const PICK_MAP = {
  icon: '🗺️',
  text: 'Tap a level on the map to see its goal. Finishing a level opens the next one.',
};

export const HOW_TO_PLAY: Record<GameId, HowToPlay> = {
  monumentvalley: {
    goal: 'Help Amit (the little white cone) walk to the glowing goal.',
    steps: [
      { icon: '🔄', text: 'Tap a green tile with ↻ to turn it a quarter turn.' },
      { icon: '✨', text: 'Paths Amit can reach glow gold.' },
      { icon: '🚶', text: 'When the gold path reaches the goal, Amit walks there without any help.' },
      { icon: '💡', text: 'Stuck? Hint shows the next tile to turn.' },
      { icon: '🗺️', text: 'Pick any level you have reached on the route map. Swipe to change chapter.' },
    ],
    stars: '⭐⭐⭐ Solve it in "par" turns (the fewest possible) without a hint.',
  },
  sliding: {
    goal: 'Slide the tiles back in order: 1, 2, 3… or make the whole picture again.',
    steps: [
      { icon: '👆', text: 'Tap a tile next to the empty space to slide it in.' },
      { icon: '🎯', text: 'Goal shows what the finished board looks like.' },
      { icon: '🔢', text: 'Picture tiles have a small number in the corner to help you.' },
      { icon: '💡', text: 'Hint lights up the next tile to move.' },
      PICK_PUZZLE,
    ],
    stars: '⭐⭐⭐ No hints · ⭐⭐ up to 2 hints. Fewer moves gets you higher on the leaderboard.',
  },
  numbermatch: {
    goal: 'Find all 8 pairs of matching numbers.',
    steps: [
      { icon: '🃏', text: 'Tap a card to flip it over, then tap another one.' },
      { icon: '✅', text: 'Same number? The pair stays face up.' },
      { icon: '🔁', text: "Not the same? They flip back. Try to remember where they were!" },
    ],
    stars: '🏆 The fewer moves you take, the better your score.',
  },
  wordsearch: {
    goal: 'Find every hidden word in the grid of letters.',
    steps: [
      { icon: '👆', text: 'Put your finger on the first letter of a word and slide to the last letter, then let go.' },
      { icon: '➡️', text: 'Words go across and down. Harder levels add diagonal, backwards and upwards.' },
      { icon: '✔️', text: 'You can also tap the letters one by one, touching in a straight line. Tap ✓ Check if the word is the start of a longer one.' },
      { icon: '✖️', text: 'Tap ✖ to clear the letters you picked.' },
      { icon: '💡', text: 'Hint makes the first letter of a word glow.' },
      PICK_PUZZLE,
    ],
    stars: '⭐⭐⭐ No hints · ⭐⭐ up to 2 hints. The clock shows how fast you were.',
  },
  sudoku: {
    goal: 'Fill the grid so every row, column and box has each number once.',
    steps: [
      { icon: '👆', text: 'Tap an empty square, then tap a number.' },
      { icon: '❌', text: 'A wrong number turns red and counts as an "oops".' },
      { icon: '🧽', text: 'Erase clears a square. Hint fills one in for you.' },
      { icon: '🐣', text: 'New to Sudoku? Start with Tiny (4×4), then work up to 9×9.' },
      PICK_PUZZLE,
    ],
    stars: '⭐⭐⭐ No oops and no hints · ⭐⭐ up to 3 of them.',
  },
  jigsaw: {
    goal: 'Build the picture from jigsaw pieces.',
    steps: [
      { icon: '✋', text: 'Drag a piece from the tray onto the board.' },
      { icon: '🧲', text: 'Drop it close to its spot and it snaps into place.' },
      { icon: '🌫️', text: 'A blurry copy of the picture sits behind the board, so you can see what to build.' },
      { icon: '👀', text: 'Peek makes the picture sharp if you need more help.' },
      { icon: '⏰', text: 'The clock shows how long you take.' },
      PICK_PUZZLE,
    ],
    stars: '⭐⭐⭐ Put pieces in the right place without many wrong drops.',
  },
  fruitpop: {
    goal: "Reach the level's goal before you run out of moves.",
    steps: [
      { icon: '👉', text: 'Swipe a fruit to swap it with the one next to it (or tap two fruits).' },
      { icon: '🍎', text: 'Line up 3 or more of the same fruit to pop them.' },
      { icon: '↔️', text: 'Match 4 in a line for a striped fruit that clears a whole row or column.' },
      { icon: '💥', text: 'Match in an L or T shape for a bomb that clears the squares around it.' },
      { icon: '🌈', text: 'Match 5 in a line for a rainbow. Swap it with a fruit to clear all of that kind!' },
      { icon: '🎯', text: 'Goals: score points, collect fruits, clear the pink jelly or break the crates.' },
      { icon: '📦', text: 'Crates break when you make a match next to them. Dark crates need 2 hits.' },
      { icon: '❄️', text: "Frozen fruits can't move. Match them to melt the ice." },
      PICK_MAP,
    ],
    stars: '⭐ Reach the goal · ⭐⭐⭐ score lots of points. Spare moves give bonus points!',
  },
  pipes: {
    goal: 'Join all the pipes to the 💧 tap so every flower gets water.',
    steps: [
      { icon: '👆', text: 'Tap a tile to turn its pipe a quarter turn.' },
      { icon: '💧', text: 'Pipes joined to the tap fill up with blue water.' },
      { icon: '🌸', text: 'Flowers bloom when the water reaches them.' },
      { icon: '🚫', text: 'You win when every pipe is joined, with none pointing at nothing.' },
      { icon: '💡', text: 'Hint turns one wrong tile the right way.' },
      PICK_MAP,
    ],
    stars: '⭐⭐⭐ Finish in the number of taps shown. Using a hint gives at most ⭐⭐.',
  },
  maze: {
    goal: 'Help the little animal find its way through the maze to its treat.',
    steps: [
      { icon: '👆', text: 'Put your finger on the animal and drag it along the paths.' },
      { icon: '🧱', text: 'Walls block the way. If you hit a dead end, go back the way you came.' },
      { icon: '👣', text: 'Footprints show where you have been. Walking back over them rubs them out.' },
      { icon: '💡', text: 'Hint makes the next square on the best way glow.' },
      PICK_MAP,
    ],
    stars: '⭐⭐⭐ Reach the treat in the number of steps shown. Using a hint gives at most ⭐⭐.',
  },
  lights: {
    goal: 'Switch on every lamp on the board.',
    steps: [
      { icon: '👆', text: 'Tap a lamp to switch it on or off.' },
      { icon: '➕', text: 'The lamps above, below, left and right of it switch too!' },
      { icon: '🤔', text: 'Think before you tap: sometimes you need to turn a lamp off to get them all on.' },
      { icon: '💡', text: 'Hint puts a pink ring on a lamp to tap.' },
      PICK_MAP,
    ],
    stars: '⭐⭐⭐ Light them all in the fewest taps possible. Using a hint gives at most ⭐⭐.',
  },
  flood: {
    goal: 'Make the whole board one colour before your moves run out.',
    steps: [
      { icon: '🖌️', text: 'Your paint starts in the top-left corner.' },
      { icon: '🎨', text: 'Tap a colour button (or any square of that colour) to paint your area that colour.' },
      { icon: '🌊', text: 'Every touching square of that colour joins your paint, so it grows!' },
      { icon: '🔢', text: 'Watch "Moves left". Pick colours that touch lots of your paint.' },
      { icon: '💡', text: 'Hint circles a good colour to pick next.' },
      PICK_MAP,
    ],
    stars: '⭐⭐⭐ Finish in the number of moves shown. Using a hint gives at most ⭐⭐.',
  },
  picross: {
    goal: 'Use the number clues to colour the right squares and find the secret picture.',
    steps: [
      {
        icon: '🔢',
        text: 'The numbers by each row and column say how many squares in a row are coloured. "2 1" means 2 together, a gap, then 1.',
      },
      { icon: '🖍️', text: 'Tap a square to colour it, or drag along a row or column to colour several.' },
      { icon: '✖', text: 'Switch to "Cross out" to mark squares you know are empty.' },
      { icon: '❌', text: 'A wrong square shows a red ✖ and counts as an oops.' },
      { icon: '✅', text: 'A finished row or column turns grey and crosses out the rest by itself.' },
      { icon: '💡', text: 'Hint colours one square for you.' },
      PICK_MAP,
    ],
    stars: '⭐⭐⭐ No mistakes · ⭐⭐ up to 2. Using a hint gives at most ⭐⭐.',
  },
};

// Which guides each player has seen already, so each opens by itself only
// once per player.
const STORAGE_KEY = 'puzzleGames.howToSeen.v1';
let seen: Partial<Record<GameId, true>> | null = null;
let seenKey = ''; // the player's storage key that `seen` was loaded from

const loadSeen = async (key: string) => {
  if (seen && seenKey === key) return seen;
  try {
    const raw = await AsyncStorage.getItem(key);
    seen = raw ? (JSON.parse(raw) as Partial<Record<GameId, true>>) : {};
  } catch {
    seen = {};
  }
  seenKey = key;
  return seen;
};

/** True the first time a game is opened (and marks it as seen). */
export const firstVisit = async (id: GameId): Promise<boolean> => {
  const key = scopedKey(STORAGE_KEY);
  const current = await loadSeen(key);
  if (current[id]) return false;
  seen = { ...current, [id]: true };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(seen));
  } catch {
    // Storage unavailable: the guide may show again next time, which is fine.
  }
  return true;
};
