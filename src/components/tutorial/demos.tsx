import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { colors } from '../../theme';
import type { GameId } from '../../theme';
import { Mover, type Demo } from './TutorialPlayer';
import { MORE_DEMOS } from './demosMore';

// One short scripted tutorial per game, drawn in a 300 x 190 space.
// Each `Stage` draws the scene for the current step; things that move are
// Movers, so they glide from one step to the next.

const REST: [number, number] | undefined = undefined; // hand hidden

// ---------------------------------------------------------------------------
// Sliding Puzzle: two taps finish a 3x3 board.

const slidePos = (i: number) => ({ x: 68 + (i % 3) * 56, y: 13 + Math.floor(i / 3) * 56 });
const slideCenter = (i: number): [number, number] => [slidePos(i).x + 26, slidePos(i).y + 26];
const SLIDE_BOARDS = [
  [1, 2, 3, 4, 0, 6, 7, 5, 8],
  [1, 2, 3, 4, 5, 6, 7, 0, 8],
  [1, 2, 3, 4, 5, 6, 7, 0, 8],
  [1, 2, 3, 4, 5, 6, 7, 8, 0],
];

const sliding: Demo = {
  tint: '#FFF0E0',
  steps: [
    { caption: 'Tap a tile next to the empty gap', ms: 1600, hand: slideCenter(7) },
    { caption: 'It slides into the gap!', ms: 1300, hand: slideCenter(7), tap: true },
    { caption: 'Now tap the 8', ms: 1100, hand: slideCenter(8) },
    { caption: '🎉 1 to 8 in order. Solved!', ms: 2200, hand: slideCenter(8), tap: true },
  ],
  Stage: ({ step }) => (
    <>
      <View style={[s.abs, s.slideBoard]} />
      {SLIDE_BOARDS[step].map((v, i) =>
        v ? (
          <Mover key={v} {...slidePos(i)} w={52} h={52}>
            <View style={[s.tile, { backgroundColor: `hsl(${(v - 1) * 40}, 80%, 62%)` }]}>
              <Text style={s.tileText}>{v}</Text>
            </View>
          </Mover>
        ) : null
      )}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Word Search: drag from C to T to find CAT.

const WS_GRID = ['DOGQP', 'LCATM', 'SBREK', 'UWINF', 'NHZOY'];
const wsCenter = (r: number, c: number): [number, number] => [18 + c * 28 + 14, 25 + r * 28 + 14];
const WS_SELECTED = [0, 0, 1, 2, 3, 3];

const wordsearch: Demo = {
  tint: '#E3F6FD',
  steps: [
    { caption: 'Find each word from the list', ms: 1500, hand: REST },
    { caption: 'Put your finger on the first letter…', ms: 900, hand: wsCenter(1, 1) },
    { caption: 'Put your finger on the first letter…', ms: 700, hand: wsCenter(1, 1), tap: true },
    { caption: '…and slide to the last letter', ms: 600, hand: wsCenter(1, 2) },
    { caption: '…and slide to the last letter', ms: 900, hand: wsCenter(1, 3) },
    { caption: '🎉 Let go: found CAT! It turns pink.', ms: 2200, hand: wsCenter(1, 3) },
  ],
  Stage: ({ step }) => {
    const selected = WS_SELECTED[step];
    const foundCat = step === 5;
    return (
      <>
        {WS_GRID.map((row, r) =>
          row.split('').map((letter, c) => {
            const inDog = r === 0 && c <= 2;
            const inCat = r === 1 && c >= 1 && c <= 3;
            const picked = inCat && c - 1 < selected;
            const bg = inDog ? '#B2F2BB' : inCat && foundCat ? '#FFC9DE' : picked ? '#FFE066' : colors.white;
            return (
              <View key={`${r}${c}`} style={[s.abs, s.letter, { left: 18 + c * 28, top: 25 + r * 28, backgroundColor: bg }]}>
                <Text style={s.letterText}>{letter}</Text>
              </View>
            );
          })
        )}
        <View style={[s.abs, s.wordList]}>
          <Text style={s.listTitle}>Find:</Text>
          <Text style={[s.listWord, s.struck]}>DOG ✓</Text>
          <Text style={[s.listWord, foundCat && s.struck]}>CAT{foundCat ? ' ✓' : ''}</Text>
          <Text style={s.listWord}>SUN</Text>
        </View>
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Number Match: a miss, then a pair.

const NM_VALUES = [3, 5, 1, 5, 3, 1];
const nmPos = (i: number) => ({ x: 56 + (i % 3) * 66, y: 24 + Math.floor(i / 3) * 76 });
const nmCenter = (i: number): [number, number] => [nmPos(i).x + 28, nmPos(i).y + 33];
const NM_UP = [[], [], [0], [0], [0, 1], [], [], [4], [4], []];

const numbermatch: Demo = {
  tint: '#FFE8F0',
  steps: [
    { caption: 'Tap a card to flip it over', ms: 1300, hand: REST },
    { caption: 'Tap a card to flip it over', ms: 700, hand: nmCenter(0) },
    { caption: "It's a 3!", ms: 1000, hand: nmCenter(0), tap: true },
    { caption: 'Now tap another card', ms: 700, hand: nmCenter(1) },
    { caption: "A 5. That's not the same…", ms: 1200, hand: nmCenter(1), tap: true },
    { caption: '…so they flip back. Remember where they were!', ms: 1600, hand: nmCenter(1) },
    { caption: 'Here is another 3…', ms: 700, hand: nmCenter(4) },
    { caption: 'Here is another 3…', ms: 900, hand: nmCenter(4), tap: true },
    { caption: 'Where was the first 3?', ms: 800, hand: nmCenter(0) },
    { caption: '🎉 A pair! They stay face up.', ms: 2200, hand: nmCenter(0), tap: true },
  ],
  Stage: ({ step }) => {
    const matched = step === 9 ? [0, 4] : [];
    return (
      <>
        {NM_VALUES.map((v, i) => {
          const isMatched = matched.includes(i);
          const up = isMatched || NM_UP[step].includes(i);
          return (
            <View
              key={i}
              style={[
                s.abs,
                s.card,
                { left: nmPos(i).x, top: nmPos(i).y },
                isMatched ? s.cardMatched : up ? s.cardUp : s.cardDown,
              ]}
            >
              <Text style={[s.cardText, up && !isMatched && { color: '#FF6B9D' }]}>{up ? v : '?'}</Text>
            </View>
          );
        })}
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Monument Valley: turn the middle tile and Amit walks to the goal.

const rowTile = (i: number) => 46 + i * 72; // three tiles in a row, 64 wide, at y 63
const ROW_Y = 63;
const rowCenter = (i: number): [number, number] => [rowTile(i) + 32, ROW_Y + 32];

const monumentvalley: Demo = {
  tint: '#EEE9FB',
  steps: [
    { caption: 'Amit wants to reach the glowing goal', ms: 1700, hand: REST },
    { caption: 'The path is broken. Tap the green ↻ tile', ms: 1000, hand: rowCenter(1) },
    { caption: 'It turns a quarter turn', ms: 1000, hand: rowCenter(1), tap: true },
    { caption: 'The path glows gold…', ms: 900, hand: REST },
    { caption: '…and Amit walks there!', ms: 800, hand: REST },
    { caption: '🎉 Goal reached!', ms: 2000, hand: REST },
  ],
  Stage: ({ step }) => {
    const path = step >= 3 ? '#E9A93B' : '#B8B0CC';
    const amitAt = step >= 5 ? 2 : step >= 4 ? 1 : 0;
    return (
      <>
        <View style={[s.abs, s.stoneTile, { left: rowTile(0), top: ROW_Y }]} />
        <View style={[s.abs, s.greenTile, { left: rowTile(1), top: ROW_Y }]}>
          <Text style={s.turnMark}>↻</Text>
        </View>
        <View style={[s.abs, s.stoneTile, { left: rowTile(2), top: ROW_Y }]} />
        <View style={[s.abs, s.bar, { left: rowTile(0) + 25, top: ROW_Y + 25, width: 39, backgroundColor: path }]} />
        <View style={[s.abs, s.bar, { left: rowTile(2), top: ROW_Y + 25, width: 39, backgroundColor: path }]} />
        <Mover x={rowTile(1)} y={ROW_Y + 25} w={64} h={14} rotate={step >= 2 ? 180 : 90}>
          <View style={[s.fill, { backgroundColor: path, borderRadius: 3 }]} />
        </Mover>
        <View style={[s.abs, s.goal, { left: rowCenter(2)[0] - 13, top: ROW_Y + 19 }]} />
        <Mover x={rowCenter(amitAt)[0] - 11} y={ROW_Y + 10} w={22} h={30} ms={700}>
          <View style={s.amitHead} />
          <View style={s.amitBody} />
        </Mover>
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Sudoku: tap a square, try 3 (oops), then 4.

const SUDOKU = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];
const BLANKS = ['0,2', '1,1', '2,3', '3,0'];
const sdX = (c: number) => 24 + c * 33 + (c >= 2 ? 5 : 0);
const sdY = (r: number) => 22 + r * 33 + (r >= 2 ? 5 : 0);
const padPos = (k: number) => ({ x: 196 + (k % 2) * 48, y: 44 + Math.floor(k / 2) * 48 });
const padCenter = (k: number): [number, number] => [padPos(k).x + 20, padPos(k).y + 20];

const sudoku: Demo = {
  tint: '#E7EEFE',
  steps: [
    { caption: 'Each row, column and box needs 1, 2, 3 and 4', ms: 2000, hand: REST },
    { caption: 'Tap an empty square', ms: 800, hand: [sdX(1) + 16, sdY(1) + 16] },
    { caption: 'Tap an empty square', ms: 700, hand: [sdX(1) + 16, sdY(1) + 16], tap: true },
    { caption: 'Then tap a number', ms: 800, hand: padCenter(2) },
    { caption: '3 is already in that row: oops!', ms: 1500, hand: padCenter(2), tap: true },
    { caption: "Let's try 4", ms: 700, hand: padCenter(3) },
    { caption: '🎉 4 fits! Every row now has 1 to 4.', ms: 2200, hand: padCenter(3), tap: true },
  ],
  Stage: ({ step }) => {
    const selected = step >= 2;
    const entry = step >= 6 ? 4 : step >= 4 ? 3 : 0;
    return (
      <>
        <View style={[s.abs, s.sudokuFrame]} />
        {SUDOKU.map((row, r) =>
          row.map((v, c) => {
            const key = `${r},${c}`;
            const target = key === '1,1';
            const blank = BLANKS.includes(key);
            const shown = target ? entry : blank ? 0 : v;
            return (
              <View
                key={key}
                style={[
                  s.abs,
                  s.sdCell,
                  { left: sdX(c), top: sdY(r) },
                  target && selected && { backgroundColor: '#FFE066' },
                ]}
              >
                <Text
                  style={[
                    s.sdText,
                    target && entry === 3 && { color: colors.danger },
                    target && entry === 4 && { color: '#2F9E44' },
                  ]}
                >
                  {shown || ''}
                </Text>
              </View>
            );
          })
        )}
        {[1, 2, 3, 4].map((n, k) => (
          <View key={n} style={[s.abs, s.padKey, { left: padPos(k).x, top: padPos(k).y }]}>
            <Text style={s.padText}>{n}</Text>
          </View>
        ))}
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Jigsaw: drag the last piece from the tray into place.

const JIG_X = 40;
const JIG_Y = 39;
const PIECES = [
  { color: '#74C0FC', emoji: '☀️' },
  { color: '#74C0FC', emoji: '☁️' },
  { color: '#8CE99A', emoji: '🌷' },
  { color: '#8CE99A', emoji: '🐞' },
];
const JIG_SPOTS = [
  { x: 204, y: 67 }, // in the tray
  { x: 204, y: 67 },
  { x: JIG_X + 64, y: JIG_Y + 50 }, // dragged close
  { x: JIG_X + 56, y: JIG_Y + 56 }, // snapped
  { x: JIG_X + 56, y: JIG_Y + 56 },
];

const jigsaw: Demo = {
  tint: '#E0F7EF',
  steps: [
    { caption: 'Drag the pieces onto the board', ms: 1500, hand: REST },
    { caption: 'Press a piece in the tray…', ms: 900, hand: [JIG_SPOTS[1].x + 28, JIG_SPOTS[1].y + 28], tap: true },
    { caption: '…and drag it to its spot', ms: 1100, hand: [JIG_SPOTS[2].x + 28, JIG_SPOTS[2].y + 28] },
    { caption: 'Close enough? It snaps in! 🧲', ms: 1300, hand: [JIG_SPOTS[3].x + 28, JIG_SPOTS[3].y + 28] },
    { caption: '🎉 Picture complete!', ms: 2000, hand: REST },
  ],
  Stage: ({ step }) => (
    <>
      <View style={[s.abs, s.jigBoard]} />
      <View style={[s.abs, s.tray]}>
        <Text style={s.trayText}>Tray</Text>
      </View>
      {PIECES.slice(0, 3).map((p, i) => (
        <View
          key={i}
          style={[s.abs, s.piece, { left: JIG_X + (i % 2) * 56, top: JIG_Y + Math.floor(i / 2) * 56, backgroundColor: p.color }]}
        >
          <Text style={s.pieceEmoji}>{p.emoji}</Text>
        </View>
      ))}
      <View style={[s.abs, s.missing, { left: JIG_X + 56, top: JIG_Y + 56 }]} />
      <Mover {...JIG_SPOTS[step]} w={56} h={56} ms={step === 2 ? 800 : 260} scale={step === 1 || step === 2 ? 1.08 : 1}>
        <View style={[s.piece, s.pieceLoose, { backgroundColor: PIECES[3].color }]}>
          <Text style={s.pieceEmoji}>{PIECES[3].emoji}</Text>
        </View>
      </Mover>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Fruit Pop: swipe an apple down to make three in a row.

const FP_CELL = 38;
const FP_X = 74;
const FP_Y = 19;
const FRUIT_BG: Record<string, string> = { '🍎': '#FFE3E3', '🍋': '#FFF3BF', '🍇': '#F3D9FA', '🍊': '#FFE8CC', '🍐': '#E9FAC8' };
// id, fruit, [row, col] for each step (row -1 = waiting above the board)
const still = (r: number, c: number): [number, number][] => Array(5).fill([r, c]);
const FRUIT_PLAN: [string, string, [number, number][]][] = [
    ['a', '🍋', [[0, 0], [0, 0], [0, 0], [0, 0], [1, 0]]],
    ['b', '🍇', [[0, 1], [0, 1], [0, 1], [0, 1], [1, 1]]],
    ['c', '🍐', [[0, 2], [0, 2], [0, 2], [0, 2], [1, 2]]],
    ['d', '🍊', still(0, 3)],
    ['e', '🍇', [[1, 0], [1, 0], [1, 0], [1, 0], [2, 0]]],
    ['f', '🍊', [[1, 1], [1, 1], [1, 1], [1, 1], [2, 1]]],
    ['g', '🍎', [[1, 2], [1, 2], [2, 2], [2, 2], [2, 2]]],
    ['h', '🍐', still(1, 3)],
    ['i', '🍎', still(2, 0)],
    ['j', '🍎', still(2, 1)],
    ['k', '🍋', [[2, 2], [2, 2], [1, 2], [1, 2], [2, 2]]],
    ['l', '🍇', still(2, 3)],
    ['m', '🍊', still(3, 0)],
    ['n', '🍐', still(3, 1)],
    ['o', '🍇', still(3, 2)],
    ['p', '🍋', still(3, 3)],
    ['q', '🍐', [[-1, 0], [-1, 0], [-1, 0], [-1, 0], [0, 0]]],
    ['r', '🍋', [[-1, 1], [-1, 1], [-1, 1], [-1, 1], [0, 1]]],
    ['s', '🍇', [[-1, 2], [-1, 2], [-1, 2], [-1, 2], [0, 2]]],
];
const POPPED = ['g', 'i', 'j'];
const fpCenter = (r: number, c: number): [number, number] => [FP_X + c * FP_CELL + 19, FP_Y + r * FP_CELL + 19];

const fruitpop: Demo = {
  tint: '#FFF0F6',
  steps: [
    { caption: 'Line up 3 of the same fruit', ms: 1500, hand: REST },
    { caption: 'Swipe a fruit…', ms: 800, hand: fpCenter(1, 2) },
    { caption: '…to swap it with the one next to it', ms: 800, hand: fpCenter(2, 2) },
    { caption: '3 apples in a row: POP! 💥', ms: 1000, hand: REST },
    { caption: 'New fruits drop in from the top', ms: 2000, hand: REST },
  ],
  Stage: ({ step }) => (
    <View style={[s.abs, s.fruitBoard]}>
      {Array.from({ length: 16 }, (_, k) => (
        <View
          key={k}
          style={[
            s.abs,
            { left: (k % 4) * FP_CELL, top: Math.floor(k / 4) * FP_CELL, width: FP_CELL, height: FP_CELL },
            { backgroundColor: (Math.floor(k / 4) + k) % 2 ? '#FFFFFF' : '#F4EEFF' },
          ]}
        />
      ))}
      {FRUIT_PLAN.map(([id, fruit, spots]) => {
        const [r, c] = spots[step];
        const gone = POPPED.includes(id) && step >= 3;
        return (
          <Mover
            key={id}
            x={c * FP_CELL + 2}
            y={r * FP_CELL + 2}
            w={34}
            h={34}
            opacity={gone ? 0 : 1}
            scale={gone ? 1.5 : 1}
            ms={step === 4 ? 450 : 260}
          >
            <View style={[s.fruit, { backgroundColor: FRUIT_BG[fruit] }]}>
              <Text style={s.fruitText}>{fruit}</Text>
            </View>
          </Mover>
        );
      })}
    </View>
  ),
};

// ---------------------------------------------------------------------------
// Flower Pipes: turn the middle pipe so water reaches the flower.

const pipes: Demo = {
  tint: '#F4FCE3',
  steps: [
    { caption: 'Join the pipes to the 💧 tap', ms: 1500, hand: REST },
    { caption: 'Tap a pipe to turn it', ms: 900, hand: rowCenter(1) },
    { caption: 'It turns a quarter turn…', ms: 1000, hand: rowCenter(1), tap: true },
    { caption: '🎉 The water reaches the flower 🌸', ms: 2200, hand: REST },
  ],
  Stage: ({ step }) => {
    const flowing = step >= 3;
    const water = '#1C7ED6';
    const dry = '#A5A0B8';
    return (
      <>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.abs, s.pipeTile, { left: rowTile(i), top: ROW_Y }]} />
        ))}
        <View style={[s.abs, s.pipe, { left: rowTile(0) + 32, top: ROW_Y + 24, width: 34, backgroundColor: water }]} />
        <View
          style={[s.abs, s.pipe, { left: rowTile(2) - 2, top: ROW_Y + 24, width: 34, backgroundColor: flowing ? water : dry }]}
        />
        <Mover x={rowTile(1)} y={ROW_Y + 24} w={64} h={16} rotate={step >= 2 ? 180 : 90}>
          <View style={[s.fill, { backgroundColor: flowing ? water : dry }]} />
        </Mover>
        <View style={[s.abs, s.tapIcon, { left: rowCenter(0)[0] - 16, top: ROW_Y + 16 }]}>
          <Text style={s.iconText}>💧</Text>
        </View>
        <View style={[s.abs, { left: rowCenter(2)[0] - 16, top: ROW_Y + 14 }]}>
          <Text style={s.flowerText}>{flowing ? '🌸' : '🌱'}</Text>
        </View>
      </>
    );
  },
};

export const DEMOS: Record<GameId, Demo> = {
  monumentvalley,
  sliding,
  numbermatch,
  wordsearch,
  sudoku,
  jigsaw,
  fruitpop,
  pipes,
  ...MORE_DEMOS,
};

const s = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  fill: {
    flex: 1,
  },
  // sliding
  slideBoard: {
    left: 64,
    top: 9,
    width: 172,
    height: 172,
    borderRadius: 14,
    backgroundColor: '#FFD8A8',
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  tileText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  // word search
  letter: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  wordList: {
    left: 175,
    top: 30,
    width: 110,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  listWord: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  struck: {
    color: '#2F9E44',
    textDecorationLine: 'line-through',
  },
  // number match
  card: {
    width: 56,
    height: 66,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  cardDown: {
    backgroundColor: '#FF6B9D',
    borderBottomColor: '#C7537A',
  },
  cardUp: {
    backgroundColor: colors.white,
    borderBottomColor: '#E6E1F5',
  },
  cardMatched: {
    backgroundColor: colors.success,
    borderBottomColor: '#24A35A',
  },
  cardText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  // monument valley
  stoneTile: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#DDD5F0',
    borderBottomWidth: 5,
    borderBottomColor: '#B9AEDA',
  },
  greenTile: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#8BD18F',
    borderBottomWidth: 5,
    borderBottomColor: '#5FAE64',
  },
  turnMark: {
    position: 'absolute',
    top: 0,
    right: 5,
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  bar: {
    height: 14,
    borderRadius: 3,
  },
  goal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFE066',
    borderWidth: 3,
    borderColor: '#FFF3BF',
  },
  amitHead: {
    alignSelf: 'center',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CFC7E0',
  },
  amitBody: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
  },
  // sudoku
  sudokuFrame: {
    left: 20,
    top: 18,
    width: 144,
    height: 144,
    borderRadius: 10,
    backgroundColor: '#3D7BF7',
  },
  sdCell: {
    width: 32,
    height: 32,
    borderRadius: 5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sdText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  padKey: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#3D7BF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D7BF7',
  },
  // jigsaw
  jigBoard: {
    left: JIG_X - 6,
    top: JIG_Y - 6,
    width: 124,
    height: 124,
    borderRadius: 12,
    backgroundColor: '#C3E6D7',
  },
  tray: {
    left: 190,
    top: 40,
    width: 84,
    height: 110,
    borderRadius: 12,
    backgroundColor: 'rgba(18,184,134,0.15)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  trayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0B7A58',
  },
  piece: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceLoose: {
    elevation: 4,
  },
  pieceEmoji: {
    fontSize: 24,
  },
  missing: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#0B7A58',
  },
  // fruit pop
  fruitBoard: {
    left: FP_X,
    top: FP_Y,
    width: FP_CELL * 4,
    height: FP_CELL * 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#C9A7EB',
  },
  fruit: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fruitText: {
    fontSize: 20,
  },
  // pipes
  pipeTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
    borderBottomWidth: 4,
    borderBottomColor: '#D8E8B8',
  },
  pipe: {
    height: 16,
  },
  tapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: '#1C7ED6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 15,
  },
  flowerText: {
    fontSize: 28,
  },
});
