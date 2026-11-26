import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import WinCard from '../components/WinCard';
import { Popup } from '../components/Popup';
import MapGame, { type MapPlayProps } from '../components/MapGame';
import { LevelInfoText, PlayTop, StatPills, TargetLine, playStyles } from '../components/PlayParts';
import { colors, gameStyles } from '../theme';
import { buzzLight, playPop, playTap } from '../lib/sound';
import {
  DIRS,
  DOWN,
  LEFT,
  MAZE_LEVEL_COUNT,
  MAZE_LEVELS_PER_WORLD,
  MAZE_WORLDS,
  RIGHT,
  UP,
  canWalk,
  distancesTo,
  getMazeLevel,
  starsForSteps,
  step,
  type MazeLevel,
} from '../lib/maze';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';

const ACCENT = gameStyles.maze.color;
const WALL = '#6B4F3A';

// ---------------------------------------------------------------------------
// Maze Run: a level map of 60 mazes; each one is played by dragging the
// animal along the paths to its treat.

const MazeGame = () => (
  <MapGame
    storageKey="maze.progress.v1"
    accent={ACCENT}
    count={MAZE_LEVEL_COUNT}
    perWorld={MAZE_LEVELS_PER_WORLD}
    worlds={MAZE_WORLDS}
    renderInfo={(n) => {
      const level = getMazeLevel(n);
      return (
        <LevelInfoText
          accent={ACCENT}
          title={`${level.hero} Find the ${level.treat}!`}
          line={`${level.cols}×${level.rows} maze`}
          target={`⭐⭐⭐ in ${level.starSteps[0]} steps or fewer`}
          tip="Drag your animal along the paths to its treat. Walls block the way!"
        />
      );
    }}
    renderPlay={(props) => <MazePlay {...props} />}
  />
);

// ---------------------------------------------------------------------------
// Playing one maze.

const MazePlay = ({ levelNumber, hasNext, onSolved, onNext, onRetry, onMap }: MapPlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getMazeLevel(levelNumber);
  const { rows, cols, start, goal } = level;
  const toGoal = useMemo(() => distancesTo(level, goal), [level, goal]);

  // The route walked so far, start first; stepping back onto it rubs it out.
  const [trail, setTrail] = useState<number[]>([start]);
  const [steps, setSteps] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [badge, record] = useRecordPlay();

  const at = trail[trail.length - 1];
  const stars = starsForSteps(level, steps, hints);
  const tile = Math.floor(Math.min((width - 36) / cols, (height - 320) / rows, 80));

  // Clock: ticks until the treat is reached.
  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  // The latest values, for the touch handler (which is made only once).
  const state = useRef({ trail, steps, solved, tile, lastSound: 0 });
  state.current.tile = tile;

  /** Walk one square to `next` (it must be open). */
  const walk = (next: number) => {
    const s = state.current;
    const t = s.trail;
    s.trail = t.length >= 2 && t[t.length - 2] === next ? t.slice(0, -1) : [...t, next];
    s.steps += 1;
    setTrail(s.trail);
    setSteps(s.steps);
    setHintCell(null);
    const now = Date.now();
    if (now - s.lastSound > 110) {
      s.lastSound = now;
      playTap();
    }
    if (next === goal) {
      s.solved = true;
      setSolved(true);
      playPop();
      buzzLight();
    }
  };

  /** Walk toward the square under the finger, as far as the walls allow. */
  const walkToward = (target: number) => {
    const s = state.current;
    for (let guard = 0; guard < rows + cols && !s.solved; guard++) {
      const here = s.trail[s.trail.length - 1];
      if (here === target) return;
      const dr = Math.floor(target / cols) - Math.floor(here / cols);
      const dc = (target % cols) - (here % cols);
      const vertical = dr > 0 ? DOWN : UP;
      const sideways = dc > 0 ? RIGHT : LEFT;
      // Try the longer way first, then the other (so corners feel natural).
      const tries = Math.abs(dr) >= Math.abs(dc) ? [vertical, sideways] : [sideways, vertical];
      const ways = tries.filter((d) => (d === vertical ? dr !== 0 : dc !== 0));
      const next = ways
        .map((d) => step(here, d, rows, cols))
        .find((j) => j >= 0 && canWalk(level, here, j));
      if (next === undefined) return; // a wall in the way
      walk(next);
    }
  };

  const origin = useRef({ x: 0, y: 0 });
  const cellAt = (x: number, y: number) => {
    const size = state.current.tile;
    const r = Math.min(rows - 1, Math.max(0, Math.floor(y / size)));
    const c = Math.min(cols - 1, Math.max(0, Math.floor(x / size)));
    return r * cols + c;
  };
  const latest = useRef({ walkToward, cellAt });
  latest.current = { walkToward, cellAt };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !state.current.solved,
      onMoveShouldSetPanResponder: () => !state.current.solved,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        origin.current = { x: pageX - locationX, y: pageY - locationY };
        latest.current.walkToward(latest.current.cellAt(locationX, locationY));
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.pageX - origin.current.x;
        const y = e.nativeEvent.pageY - origin.current.y;
        latest.current.walkToward(latest.current.cellAt(x, y));
      },
    })
  ).current;

  // Solved: save, then show the win card after a happy moment.
  useEffect(() => {
    if (!solved) return;
    onSolved(stars, seconds);
    record({ game: 'maze', won: true, level: levelNumber, stars, moves: steps, hints, time: seconds });
    const timer = setTimeout(() => setShowWin(true), 800);
    return () => clearTimeout(timer);
  }, [solved]); // only when it becomes solved

  // Hint: glow on the next square of the best route from here.
  const giveHint = () => {
    if (solved) return;
    const next = DIRS.map((d) => (level.open[at] & d ? step(at, d, rows, cols) : -1)).find(
      (j) => j >= 0 && toGoal[j] === toGoal[at] - 1
    );
    if (next === undefined) return;
    setHintCell(next);
    setHints((h) => h + 1);
  };

  const restart = () => {
    if (solved) {
      onRetry();
      return;
    }
    state.current.trail = [start];
    state.current.steps = 0;
    setTrail([start]);
    setSteps(0);
    setHints(0);
    setHintCell(null);
    setSeconds(0);
  };

  return (
    <View style={[playStyles.container, styles.page]}>
      <PlayTop
        levelNumber={levelNumber}
        accent={ACCENT}
        onMap={onMap}
        right={`${level.hero}→${level.treat}`}
        width={Math.max(tile * cols, 300)}
      />
      <StatPills
        accent={ACCENT}
        stars={stars}
        items={[
          { label: '👣 Steps', value: steps },
          { label: '⏰', value: formatSeconds(seconds) },
        ]}
      />
      <TargetLine>
        {stars === 3
          ? `⭐⭐⭐ if you get there in ${level.starSteps[0]} steps`
          : stars === 2
            ? `⭐⭐ if you get there in ${level.starSteps[1]} steps`
            : 'Keep going, you can do it!'}
      </TargetLine>

      <View style={styles.frame}>
        <View
          style={{ width: tile * cols, height: tile * rows, backgroundColor: MAZE_WORLDS[worldOf(levelNumber)].color }}
          pointerEvents="box-only"
          {...pan.panHandlers}
        >
          <Walls level={level} tile={tile} />
          <Trail trail={trail} rows={rows} cols={cols} tile={tile} />
          {hintCell !== null ? (
            <View
              style={[
                styles.hint,
                { left: (hintCell % cols) * tile + 3, top: Math.floor(hintCell / cols) * tile + 3, width: tile - 6, height: tile - 6 },
              ]}
            />
          ) : null}
          <Emoji cell={goal} cols={cols} tile={tile} text={level.treat} />
          <Hero cell={at} cols={cols} tile={tile} text={level.hero} happy={solved} />
        </View>
      </View>

      <View style={playStyles.actions}>
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" disabled={solved} />
        <ChunkyButton label="🔄 Restart" onPress={restart} color={ACCENT} size="sm" />
      </View>

      <Popup visible={showWin}>
        <WinCard
          title={`${level.treat} Yum, yum!`}
          subtitle={`Level ${levelNumber} of ${MAZE_LEVEL_COUNT}`}
          stars={stars}
          stats={[
            { label: 'Steps', value: steps },
            { label: 'Time', value: formatSeconds(seconds) },
          ]}
          message={
            hints > 0
              ? `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. Great finding!`
              : stars === 3
                ? 'Straight there, no wrong turns! 🌟'
                : `Try it in ${level.starSteps[0]} steps for 3 stars!`
          }
          badge={badge}
          buttonLabel={hasNext ? `Next: Level ${levelNumber + 1} ▶` : '🏆 Back to the map'}
          onPlayAgain={hasNext ? onNext : onMap}
          secondaryLabel={hasNext ? '🗺️ Map' : '🔄 Play again'}
          onSecondary={hasNext ? onMap : onRetry}
        />
      </Popup>
    </View>
  );
};

const worldOf = (n: number) => Math.min(Math.floor((n - 1) / MAZE_LEVELS_PER_WORLD), MAZE_WORLDS.length - 1);

// ---------------------------------------------------------------------------
// Drawing

/** Every wall as one SVG, drawn once per maze. */
const Walls = memo(({ level, tile }: { level: MazeLevel; tile: number }) => {
  const { rows, cols, open } = level;
  const lines: [number, number, number, number][] = [];
  for (let i = 0; i < rows * cols; i++) {
    const x = (i % cols) * tile;
    const y = Math.floor(i / cols) * tile;
    if (!(open[i] & UP) && y === 0) lines.push([x, y, x + tile, y]);
    if (!(open[i] & LEFT) && x === 0) lines.push([x, y, x, y + tile]);
    if (!(open[i] & RIGHT)) lines.push([x + tile, y, x + tile, y + tile]);
    if (!(open[i] & DOWN)) lines.push([x, y + tile, x + tile, y + tile]);
  }
  const w = Math.max(3, tile * 0.14);
  return (
    <Svg width={cols * tile} height={rows * tile} style={StyleSheet.absoluteFill}>
      {lines.map(([x1, y1, x2, y2], k) => (
        <Line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={WALL} strokeWidth={w} strokeLinecap="round" />
      ))}
    </Svg>
  );
});

/** Little footprints on every square walked. */
const Trail = ({ trail, rows, cols, tile }: { trail: number[]; rows: number; cols: number; tile: number }) => (
  <Svg width={cols * tile} height={rows * tile} style={StyleSheet.absoluteFill}>
    {trail.slice(0, -1).map((i, k) => (
      <Circle
        key={`${k}-${i}`}
        cx={(i % cols) * tile + tile / 2}
        cy={Math.floor(i / cols) * tile + tile / 2}
        r={tile * 0.13}
        fill={ACCENT}
        opacity={0.55}
      />
    ))}
  </Svg>
);

const Emoji = ({ cell, cols, tile, text }: { cell: number; cols: number; tile: number; text: string }) => (
  <View style={[styles.emoji, { left: (cell % cols) * tile, top: Math.floor(cell / cols) * tile, width: tile, height: tile }]}>
    <Text style={{ fontSize: tile * 0.62 }}>{text}</Text>
  </View>
);

/** The animal: glides from square to square, and bounces when it wins. */
const Hero = ({ cell, cols, tile, text, happy }: { cell: number; cols: number; tile: number; text: string; happy: boolean }) => {
  const x = (cell % cols) * tile;
  const y = Math.floor(cell / cols) * tile;
  const pos = useRef(new Animated.ValueXY({ x, y })).current;
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(pos, { toValue: { x, y }, duration: 90, useNativeDriver: true }).start();
  }, [x, y, pos]);

  useEffect(() => {
    if (!happy) return;
    Animated.sequence([
      Animated.spring(bounce, { toValue: 1.5, friction: 3, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1.15, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [happy, bounce]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.emoji,
        { width: tile, height: tile, transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: bounce }] },
      ]}
    >
      <Text style={{ fontSize: tile * 0.7 }}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#E3FAFC',
  },
  frame: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: WALL,
    borderBottomWidth: 5,
    borderBottomColor: '#4A3628',
  },
  emoji: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255,176,32,0.25)',
  },
});

export default MazeGame;
