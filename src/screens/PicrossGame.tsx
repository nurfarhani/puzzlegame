import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, PanResponder, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import WinCard from '../components/WinCard';
import { Popup } from '../components/Popup';
import MapGame, { type MapPlayProps } from '../components/MapGame';
import { LevelInfoText, PlayTop, StatPills, TargetLine, playStyles } from '../components/PlayParts';
import { colors, gameStyles } from '../theme';
import { buzzLight, playPop, playTap } from '../lib/sound';
import {
  PICROSS_LEVEL_COUNT,
  PICROSS_LEVELS_PER_WORLD,
  PICROSS_WORLDS,
  getPicrossLevel,
  starsForMistakes,
  type PicrossLevel,
} from '../lib/picross';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';

const ACCENT = gameStyles.picross.color;
const INK = '#4C4673'; // a coloured-in square before the picture is revealed

// Square states.
const EMPTY = 0;
const FILLED = 1;
const CROSSED = 2; // the player's ✖: "not this one"
const WRONG = 3; // coloured by mistake: shown as a red ✖

type Mode = 'fill' | 'cross';
type Action = 'fill' | 'cross' | 'uncross' | null;

// ---------------------------------------------------------------------------
// Picture Cross: a level map of 30 hidden pictures.

const PicrossGame = () => (
  <MapGame
    storageKey="picross.progress.v1"
    accent={ACCENT}
    count={PICROSS_LEVEL_COUNT}
    perWorld={PICROSS_LEVELS_PER_WORLD}
    worlds={PICROSS_WORLDS}
    renderInfo={(n) => {
      const level = getPicrossLevel(n);
      return (
        <LevelInfoText
          accent={ACCENT}
          title="🖼️ What's the secret picture?"
          line={`${level.cols}×${level.rows} picture`}
          target="⭐⭐⭐ with no mistakes"
          tip="The numbers say how many squares in a row are coloured, in order. A gap goes between groups."
        />
      );
    }}
    renderPlay={(props) => <PicrossPlay {...props} />}
  />
);

// ---------------------------------------------------------------------------
// Playing one picture.

/** True when every answer square in the line is coloured in. */
const lineDone = (level: PicrossLevel, marks: number[], cells: number[]) =>
  cells.every((i) => !level.filled[i] || marks[i] === FILLED);

const rowCells = (level: PicrossLevel, r: number) => Array.from({ length: level.cols }, (_, c) => r * level.cols + c);
const colCells = (level: PicrossLevel, c: number) => Array.from({ length: level.rows }, (_, r) => r * level.cols + c);

const PicrossPlay = ({ levelNumber, hasNext, onSolved, onNext, onRetry, onMap }: MapPlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getPicrossLevel(levelNumber);
  const { rows, cols, rowClues, colClues } = level;

  const [marks, setMarks] = useState<number[]>(() => level.filled.map(() => EMPTY));
  const [mode, setMode] = useState<Mode>('fill');
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [badge, record] = useRecordPlay();

  const stars = starsForMistakes(mistakes, hints);
  const toFind = level.filled.filter(Boolean).length;
  const found = marks.filter((m) => m === FILLED).length;

  // Sizes: clue strips on the left and top, squares fill the rest.
  const rowClueW = Math.max(...rowClues.map((c) => c.length)) * 15 + 12;
  const colClueH = Math.max(...colClues.map((c) => c.length)) * 17 + 8;
  const tile = Math.floor(Math.min((width - 40 - rowClueW) / cols, (height - 345 - colClueH) / rows, 64));

  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  useEffect(() => {
    if (!solved) return;
    onSolved(stars, seconds);
    record({
      game: 'picross',
      won: true,
      level: levelNumber,
      stars,
      mistakes,
      hints,
      time: seconds,
      picture: `${level.emoji} ${level.name}`,
    });
    const timer = setTimeout(() => setShowWin(true), 1500); // after the colour reveal
    return () => clearTimeout(timer);
  }, [solved]); // only when it becomes solved

  // --- changing squares (shared by touches and hints) ---
  const live = useRef({ marks, mode, solved, tile, lastSound: 0 });
  live.current.mode = mode;
  live.current.tile = tile;

  /** Cross out what's left in any finished row or column, then save and check for a win. */
  const commit = (next: number[]) => {
    for (let r = 0; r < rows; r++) {
      const cells = rowCells(level, r);
      if (lineDone(level, next, cells)) cells.forEach((i) => next[i] === EMPTY && (next[i] = CROSSED));
    }
    for (let c = 0; c < cols; c++) {
      const cells = colCells(level, c);
      if (lineDone(level, next, cells)) cells.forEach((i) => next[i] === EMPTY && (next[i] = CROSSED));
    }
    live.current.marks = next;
    setMarks(next);
    if (level.filled.every((on, i) => !on || next[i] === FILLED)) {
      live.current.solved = true;
      setSolved(true);
      playPop();
      buzzLight();
    }
  };

  // --- touch: tap or drag along a row or column ---
  const stroke = useRef({
    action: null as Action,
    last: -1,
    axis: null as 'row' | 'col' | null,
    origin: { x: 0, y: 0 },
  });

  /** Do the stroke's action to one square. Returns false to stop the stroke. */
  const apply = (next: number[], i: number): boolean => {
    const action = stroke.current.action;
    const m = next[i];
    if (action === 'fill' && m === EMPTY) {
      if (level.filled[i]) {
        next[i] = FILLED;
        const now = Date.now();
        if (now - live.current.lastSound > 90) {
          live.current.lastSound = now;
          playTap();
        }
      } else {
        next[i] = WRONG; // not part of the picture: show it, count it, stop painting
        setMistakes((n) => n + 1);
        buzzLight();
        stroke.current.action = null;
        return false;
      }
    } else if (action === 'cross' && m === EMPTY) next[i] = CROSSED;
    else if (action === 'uncross' && m === CROSSED) next[i] = EMPTY;
    return true;
  };

  const cellAt = (x: number, y: number) => {
    const t = live.current.tile;
    const r = Math.min(rows - 1, Math.max(0, Math.floor(y / t)));
    const c = Math.min(cols - 1, Math.max(0, Math.floor(x / t)));
    return r * cols + c;
  };

  const start = (i: number) => {
    const m = live.current.marks[i];
    const fill = live.current.mode === 'fill';
    stroke.current.action = m === CROSSED ? 'uncross' : m === EMPTY ? (fill ? 'fill' : 'cross') : null;
    stroke.current.last = i;
    stroke.current.axis = null;
    if (!stroke.current.action) return;
    const next = [...live.current.marks];
    apply(next, i);
    commit(next);
  };

  /** Paint from the last square to the one under the finger, along the locked row or column. */
  const moveTo = (target: number) => {
    const s = stroke.current;
    if (!s.action || target === s.last) return;
    const lr = Math.floor(s.last / cols);
    const lc = s.last % cols;
    let tr = Math.floor(target / cols);
    let tc = target % cols;
    if (!s.axis) s.axis = tr !== lr ? 'col' : 'row'; // the first move picks the direction
    if (s.axis === 'row') tr = lr;
    else tc = lc;
    const next = [...live.current.marks];
    let r = lr;
    let c = lc;
    while ((r !== tr || c !== tc) && s.action) {
      r += Math.sign(tr - r);
      c += Math.sign(tc - c);
      s.last = r * cols + c;
      if (!apply(next, s.last)) break;
    }
    commit(next);
  };

  const latest = useRef({ start, moveTo, cellAt });
  latest.current = { start, moveTo, cellAt };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.solved,
      onMoveShouldSetPanResponder: () => !live.current.solved,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        stroke.current.origin = { x: pageX - locationX, y: pageY - locationY };
        latest.current.start(latest.current.cellAt(locationX, locationY));
      },
      onPanResponderMove: (e) => {
        const o = stroke.current.origin;
        latest.current.moveTo(latest.current.cellAt(e.nativeEvent.pageX - o.x, e.nativeEvent.pageY - o.y));
      },
      onPanResponderRelease: () => {
        stroke.current.action = null;
      },
      onPanResponderTerminate: () => {
        stroke.current.action = null;
      },
    })
  ).current;

  // Hint: colour in one right square, in the row closest to being finished.
  const giveHint = () => {
    if (solved) return;
    const current = live.current.marks;
    let pick = -1;
    let fewest = Infinity;
    for (let r = 0; r < rows; r++) {
      const missing = rowCells(level, r).filter((i) => level.filled[i] && current[i] !== FILLED);
      if (missing.length > 0 && missing.length < fewest) {
        fewest = missing.length;
        pick = missing[0];
      }
    }
    if (pick < 0) return;
    const next = [...current];
    next[pick] = FILLED;
    setHints((h) => h + 1);
    commit(next);
  };

  const restart = () => {
    if (solved) {
      onRetry();
      return;
    }
    const empty = level.filled.map(() => EMPTY);
    live.current.marks = empty;
    setMarks(empty);
    setMistakes(0);
    setHints(0);
    setSeconds(0);
  };

  const rowsDone = Array.from({ length: rows }, (_, r) => lineDone(level, marks, rowCells(level, r)));
  const colsDone = Array.from({ length: cols }, (_, c) => lineDone(level, marks, colCells(level, c)));

  return (
    <View style={[playStyles.container, styles.page]}>
      <PlayTop
        levelNumber={levelNumber}
        accent={ACCENT}
        onMap={onMap}
        right={solved ? level.emoji : `🖍️ ${found}/${toFind}`}
        width={Math.max(rowClueW + tile * cols, 300)}
      />
      <StatPills
        accent={ACCENT}
        stars={stars}
        items={[
          { label: '❌ Oops', value: mistakes },
          { label: '⏰', value: formatSeconds(seconds) },
        ]}
      />
      <TargetLine>
        {solved
          ? `It's a ${level.name}! ${level.emoji}`
          : stars === 3
            ? '⭐⭐⭐ if you make no mistakes'
            : stars === 2
              ? '⭐⭐ if you make no more than 2 mistakes'
              : 'Keep going, you can do it!'}
      </TargetLine>

      <View style={styles.puzzle}>
        {/* Column clues across the top */}
        <View style={styles.row}>
          <View style={[styles.corner, { width: rowClueW, height: colClueH }]}>
            <Text style={{ fontSize: Math.min(rowClueW, colClueH) * 0.55 }}>{solved ? level.emoji : '❓'}</Text>
          </View>
          {colClues.map((clue, c) => (
            <View key={c} style={[styles.colClue, { width: tile, height: colClueH }, c % 2 === 1 && styles.clueStripe]}>
              {clue.map((n, k) => (
                <Text key={k} style={[styles.clueText, colsDone[c] && styles.clueDone]}>
                  {n}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.row}>
          {/* Row clues down the left */}
          <View>
            {rowClues.map((clue, r) => (
              <View key={r} style={[styles.rowClue, { width: rowClueW, height: tile }, r % 2 === 1 && styles.clueStripe]}>
                {clue.map((n, k) => (
                  <Text key={k} style={[styles.clueText, rowsDone[r] && styles.clueDone]}>
                    {n}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* The squares */}
          <View style={{ width: tile * cols, height: tile * rows }} pointerEvents="box-only" {...pan.panHandlers}>
            {Array.from({ length: rows }, (_, r) => (
              <View key={r} style={styles.row}>
                {Array.from({ length: cols }, (_, c) => {
                  const i = r * cols + c;
                  return (
                    <Square
                      key={i}
                      mark={marks[i]}
                      size={tile}
                      ink={level.ink[i]}
                      revealed={solved}
                      delay={(r + c) * 45}
                      edgeRight={c === cols - 1}
                      edgeBottom={r === rows - 1}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* One row: colour / cross-out switch, then hint and restart */}
      <View style={styles.bottomRow}>
        <View style={styles.modes}>
          <ModeButton label="🖍️ Fill" active={mode === 'fill'} onPress={() => setMode('fill')} />
          <ModeButton label="✖ Cross" active={mode === 'cross'} onPress={() => setMode('cross')} />
        </View>
        <ChunkyButton label="💡" onPress={giveHint} color={colors.warning} size="sm" disabled={solved} />
        <ChunkyButton label="🔄" onPress={restart} color={ACCENT} size="sm" />
      </View>

      <Popup visible={showWin}>
        <WinCard
          title={`${level.emoji} It's a ${level.name}!`}
          subtitle={`Picture ${levelNumber} of ${PICROSS_LEVEL_COUNT}`}
          stars={stars}
          stats={[
            { label: 'Oops', value: mistakes },
            { label: 'Time', value: formatSeconds(seconds) },
          ]}
          message={
            hints > 0
              ? `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. Beautiful picture!`
              : stars === 3
                ? 'Not a single mistake! 🌟'
                : 'Try it with no mistakes for 3 stars!'
          }
          badge={badge}
          buttonLabel={hasNext ? `Next: Picture ${levelNumber + 1} ▶` : '🏆 Back to the map'}
          onPlayAgain={hasNext ? onNext : onMap}
          secondaryLabel={hasNext ? '🗺️ Map' : '🔄 Play again'}
          onSecondary={hasNext ? onMap : onRetry}
        />
      </Popup>
    </View>
  );
};

const ModeButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
    style={[styles.mode, active && styles.modeActive]}
  >
    <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
  </Pressable>
);

// ---------------------------------------------------------------------------
// One square. When the picture is solved, its real colour fades in, in a
// wave from the top-left corner.

type SquareProps = {
  mark: number;
  size: number;
  ink: string;
  revealed: boolean;
  delay: number;
  edgeRight: boolean;
  edgeBottom: boolean;
};

const Square = memo(({ mark, size, ink, revealed, delay, edgeRight, edgeBottom }: SquareProps) => {
  const reveal = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (mark === FILLED || mark === WRONG) {
      pop.setValue(0.6);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
  }, [mark, pop]);

  useEffect(() => {
    if (!revealed) return;
    Animated.timing(reveal, { toValue: 1, duration: 350, delay, useNativeDriver: true }).start();
  }, [revealed, delay, reveal]);

  const filled = mark === FILLED;
  return (
    <View
      style={[
        styles.square,
        { width: size, height: size },
        edgeRight && styles.squareEdgeRight,
        edgeBottom && styles.squareEdgeBottom,
        mark === WRONG && !revealed && styles.squareWrong,
      ]}
    >
      {filled ? (
        <Animated.View style={[styles.fill, { backgroundColor: INK, transform: [{ scale: pop }] }]} />
      ) : null}
      {filled && ink ? <Animated.View style={[styles.fill, { backgroundColor: ink, opacity: reveal }]} /> : null}
      {!revealed && (mark === CROSSED || mark === WRONG) ? (
        <Animated.Text
          style={[
            styles.cross,
            { fontSize: size * 0.5, color: mark === WRONG ? colors.danger : '#B8B2CF' },
            mark === WRONG && { transform: [{ scale: pop }] },
          ]}
        >
          ✖
        </Animated.Text>
      ) : null}
    </View>
  );
});

const LINE = '#DCD6EE';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFF5F5',
  },
  puzzle: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 5,
    borderBottomColor: '#FFC9C9',
  },
  row: {
    flexDirection: 'row',
  },
  corner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colClue: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  rowClue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    paddingRight: 6,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  clueStripe: {
    backgroundColor: '#FFF0F0',
  },
  clueText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 17,
  },
  clueDone: {
    color: '#C9C3DC',
  },
  square: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  squareEdgeRight: {
    borderRightWidth: 1,
  },
  squareEdgeBottom: {
    borderBottomWidth: 1,
  },
  squareWrong: {
    backgroundColor: '#FFE3E3',
  },
  fill: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 3,
  },
  cross: {
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  modes: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
    gap: 4,
  },
  mode: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  modeActive: {
    backgroundColor: ACCENT,
  },
  modeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.white,
  },
});

export default PicrossGame;
