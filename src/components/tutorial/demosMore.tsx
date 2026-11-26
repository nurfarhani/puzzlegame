import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../AppText';
import { colors } from '../../theme';
import { PAINTS, pour } from '../../lib/flood';
import { Mover, type Demo } from './TutorialPlayer';

// Tutorials for Maze Run, Light Switch, Color Flood and Picture Cross, drawn
// in the same 300 x 190 stage as the others (see demos.tsx).

const REST: [number, number] | undefined = undefined; // hand hidden

// ---------------------------------------------------------------------------
// Maze Run: drag the mouse round two corners to the cheese.

const MZ = 50; // square size
const MZ_X = 75;
const MZ_Y = 18;
const mzCenter = (r: number, c: number): [number, number] => [MZ_X + c * MZ + MZ / 2, MZ_Y + r * MZ + MZ / 2];
const MZ_ROUTE: [number, number][] = [
  [0, 0],
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 2],
];
// Walls as [x, y, width, height] in stage units.
const MZ_WALLS: [number, number, number, number][] = [
  [MZ_X + MZ - 3, MZ_Y, 6, MZ], // between top-left and top-middle
  [MZ_X + MZ, MZ_Y + MZ - 3, MZ * 2, 6], // under the top-right two
  [MZ_X, MZ_Y + MZ * 2 - 3, MZ * 2, 6], // above the bottom-left two
];

const maze: Demo = {
  tint: '#E3FAFC',
  steps: [
    { caption: 'Help the 🐭 find the 🧀', ms: 1500, hand: REST },
    { caption: 'Put your finger on the mouse…', ms: 1000, hand: mzCenter(0, 0), tap: true },
    { caption: '…and drag it along the path', ms: 700, hand: mzCenter(1, 0) },
    { caption: '…and drag it along the path', ms: 600, hand: mzCenter(1, 1) },
    { caption: 'Walls block the way, so go round', ms: 800, hand: mzCenter(1, 2) },
    { caption: '🎉 Yum! The mouse found the cheese', ms: 2200, hand: mzCenter(2, 2) },
  ],
  Stage: ({ step }) => {
    const [r, c] = MZ_ROUTE[step];
    const walked = MZ_ROUTE.slice(1, step);
    return (
      <>
        <View style={[s.abs, s.mazeBoard]} />
        {walked.map(([wr, wc], k) => (
          <View key={k} style={[s.abs, s.footprint, { left: mzCenter(wr, wc)[0] - 6, top: mzCenter(wr, wc)[1] - 6 }]} />
        ))}
        {MZ_WALLS.map(([x, y, w, h], k) => (
          <View key={k} style={[s.abs, s.wall, { left: x, top: y, width: w, height: h }]} />
        ))}
        <View style={[s.abs, s.center, { left: MZ_X + MZ * 2, top: MZ_Y + MZ * 2, width: MZ, height: MZ }]}>
          <Text style={s.mazeEmoji}>{step === 5 ? '✨' : '🧀'}</Text>
        </View>
        <Mover x={MZ_X + c * MZ} y={MZ_Y + r * MZ} w={MZ} h={MZ} scale={step === 5 ? 1.3 : 1} ms={260}>
          <View style={[s.fill, s.center]}>
            <Text style={s.mazeEmoji}>🐭</Text>
          </View>
        </Mover>
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Light Switch: one tap in the middle lights the dark plus shape.

const LT = 50;
const LT_X = 75;
const LT_Y = 18;
const PLUS = [1, 3, 4, 5, 7];

const lights: Demo = {
  tint: '#FFF9DB',
  steps: [
    { caption: 'Switch on every lamp 💡', ms: 1500, hand: REST },
    { caption: 'Tap a lamp…', ms: 1000, hand: [LT_X + LT * 1.5, LT_Y + LT * 1.5] },
    { caption: '…it switches, and so do its 4 neighbours!', ms: 1600, hand: [LT_X + LT * 1.5, LT_Y + LT * 1.5], tap: true },
    { caption: '🎉 All lit up!', ms: 2200, hand: REST },
  ],
  Stage: ({ step }) => (
    <>
      <View style={[s.abs, s.lightsBoard]} />
      {Array.from({ length: 9 }, (_, i) => {
        const on = step >= 2 || !PLUS.includes(i);
        return (
          <Mover key={i} x={LT_X + (i % 3) * LT + 3} y={LT_Y + Math.floor(i / 3) * LT + 3} w={LT - 6} h={LT - 6} scale={on && step >= 2 && PLUS.includes(i) ? 1.08 : 1}>
            <View style={[s.lamp, on ? s.lampOn : s.lampOff]}>
              <Text style={[s.lampText, !on && s.lampDim]}>💡</Text>
            </View>
          </Mover>
        );
      })}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Color Flood: three picks paint a 4 x 4 board one colour.

const FL = 34;
const FL_X = 48;
const FL_Y = 22;
const FL_START = [0, 1, 1, 2, 0, 1, 2, 2, 1, 1, 2, 0, 2, 2, 2, 0];
const FL_B1 = pour(FL_START, 4, 1);
const FL_B2 = pour(FL_B1, 4, 2);
const FL_B3 = pour(FL_B2, 4, 0);
const FL_BOARDS = [FL_START, FL_START, FL_B1, FL_B1, FL_B2, FL_B3];
const flButton = (k: number): [number, number] => [232, 42 + k * 50];

const flood: Demo = {
  tint: '#F8F0FC',
  steps: [
    { caption: 'Your paint starts in the corner 🖌️', ms: 1600, hand: REST },
    { caption: 'Tap a colour…', ms: 900, hand: flButton(1) },
    { caption: '…your paint turns yellow and grows!', ms: 1500, hand: flButton(1), tap: true },
    { caption: 'Now green…', ms: 800, hand: flButton(2) },
    { caption: 'Now green…', ms: 900, hand: flButton(2), tap: true },
    { caption: '🎉 Red to finish: all one colour!', ms: 2200, hand: flButton(0), tap: true },
  ],
  Stage: ({ step }) => (
    <>
      {FL_BOARDS[step].map((v, i) => (
        <View
          key={i}
          style={[s.abs, { left: FL_X + (i % 4) * FL, top: FL_Y + Math.floor(i / 4) * FL, width: FL, height: FL, backgroundColor: PAINTS[v].color }]}
        />
      ))}
      <View style={[s.abs, s.center, { left: FL_X, top: FL_Y, width: FL, height: FL }]}>
        <Text style={s.brush}>🖌️</Text>
      </View>
      {[0, 1, 2].map((k) => (
        <View
          key={k}
          style={[
            s.abs,
            s.paint,
            { left: flButton(k)[0] - 20, top: flButton(k)[1] - 20, backgroundColor: PAINTS[k].color },
            FL_BOARDS[step][0] === k && s.paintUsed,
          ]}
        >
          <Text style={s.paintShape}>{PAINTS[k].shape}</Text>
        </View>
      ))}
    </>
  ),
};

// ---------------------------------------------------------------------------
// Picture Cross: read the clues and colour an "I".

const PC = 36;
const PC_X = 128;
const PC_Y = 50;
const PC_ROWS = [[3], [1], [3]];
const PC_COLS = [[1, 1], [3], [1, 1]];
const pcCenter = (r: number, c: number): [number, number] => [PC_X + c * PC + PC / 2, PC_Y + r * PC + PC / 2];
const PC_FILLED: number[][] = [[], [0], [0, 1, 2], [0, 1, 2, 4], [0, 1, 2, 4, 6, 7, 8], [0, 1, 2, 4, 6, 7, 8]];

const picross: Demo = {
  tint: '#FFF5F5',
  steps: [
    { caption: 'Numbers say how many squares in a row to colour', ms: 2000, hand: REST },
    { caption: 'The top row says 3…', ms: 1100, hand: pcCenter(0, 0), tap: true },
    { caption: '…so drag along and colour all 3', ms: 1100, hand: pcCenter(0, 2) },
    { caption: 'The middle row says 1: the middle one', ms: 1300, hand: pcCenter(1, 1), tap: true },
    { caption: 'The last row says 3 again', ms: 1200, hand: pcCenter(2, 2) },
    { caption: '🎉 The secret picture appears!', ms: 2200, hand: REST },
  ],
  Stage: ({ step }) => {
    const filled = PC_FILLED[step];
    const reveal = step === 5;
    return (
      <>
        {PC_COLS.map((clue, c) => (
          <View key={`c${c}`} style={[s.abs, s.colClue, { left: PC_X + c * PC, top: PC_Y - 44, width: PC, height: 42 }]}>
            {clue.map((n, k) => (
              <Text key={k} style={s.clue}>
                {n}
              </Text>
            ))}
          </View>
        ))}
        {PC_ROWS.map((clue, r) => (
          <View key={`r${r}`} style={[s.abs, s.rowClue, { left: PC_X - 40, top: PC_Y + r * PC, width: 36, height: PC }]}>
            <Text style={[s.clue, step >= [2, 3, 4][r] && s.clueDone]}>{clue[0]}</Text>
          </View>
        ))}
        {Array.from({ length: 9 }, (_, i) => {
          const on = filled.includes(i);
          return (
            <View
              key={i}
              style={[
                s.abs,
                s.pcSquare,
                { left: PC_X + (i % 3) * PC, top: PC_Y + Math.floor(i / 3) * PC, width: PC, height: PC },
                on && { backgroundColor: reveal ? '#4DABF7' : '#4C4673' },
              ]}
            />
          );
        })}
      </>
    );
  },
};

export const MORE_DEMOS = { maze, lights, flood, picross };

const s = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  fill: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // maze
  mazeBoard: {
    left: MZ_X - 4,
    top: MZ_Y - 4,
    width: MZ * 3 + 8,
    height: MZ * 3 + 8,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#6B4F3A',
    backgroundColor: '#FFF3BF',
  },
  wall: {
    borderRadius: 3,
    backgroundColor: '#6B4F3A',
  },
  footprint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0C8599',
    opacity: 0.55,
  },
  mazeEmoji: {
    fontSize: 30,
  },
  // lights
  lightsBoard: {
    left: LT_X - 6,
    top: LT_Y - 6,
    width: LT * 3 + 12,
    height: LT * 3 + 12,
    borderRadius: 14,
    backgroundColor: '#272B55',
  },
  lamp: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lampOn: {
    backgroundColor: '#FFE066',
  },
  lampOff: {
    backgroundColor: '#3B4076',
  },
  lampText: {
    fontSize: 22,
  },
  lampDim: {
    opacity: 0.25,
  },
  // flood
  brush: {
    fontSize: 16,
  },
  paint: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paintUsed: {
    opacity: 0.35,
  },
  paintShape: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  // picture cross
  colClue: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rowClue: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  clue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  clueDone: {
    color: '#C9C3DC',
  },
  pcSquare: {
    borderWidth: 1,
    borderColor: '#DCD6EE',
    backgroundColor: colors.white,
  },
});
