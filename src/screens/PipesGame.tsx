import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import LevelMap from '../components/LevelMap';
import WinCard from '../components/WinCard';
import { colors, gameStyles, radius } from '../theme';
import { playTap } from '../lib/sound';
import {
  DOWN,
  LEFT,
  PIPE_LEVEL_COUNT,
  PIPE_LEVELS_PER_WORLD,
  PIPE_WORLDS,
  RIGHT,
  UP,
  flow,
  getPipeLevel,
  rotate,
  starsForTaps,
  tapsToFix,
  type PipeLevel,
} from '../lib/pipes';
import {
  type PuzzleProgress,
  loadPuzzleProgress,
  savePuzzleProgress,
  withPuzzleResult,
} from '../lib/puzzleProgress';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';
import { HelpButton } from '../components/HowToPlay';
import { Popup } from '../components/Popup';
import { useBackHandler } from '../lib/useBackHandler';

const ACCENT = gameStyles.pipes.color;
const STORAGE_KEY = 'pipes.progress.v1';
const MAP = 1; // LevelMap keeps its results under level 1

// ---------------------------------------------------------------------------
// Flower Pipes: opens on the level map; tapping a level shows it, then plays it.

const PipesGame = () => {
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadPuzzleProgress(STORAGE_KEY).then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Phone back button: from a level, go back to the map.
  useBackHandler(() => setPlaying(null), playing !== null);

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (playing !== null) {
    return (
      <PipePlay
        key={`${playing}-${attempt}`}
        levelNumber={playing}
        hasNext={playing < PIPE_LEVEL_COUNT}
        onSolved={(stars, time) => {
          const next = withPuzzleResult(progress, MAP, playing, { stars, bestTime: time });
          setProgress(next);
          savePuzzleProgress(STORAGE_KEY, next);
        }}
        onNext={() => setPlaying(Math.min(playing + 1, PIPE_LEVEL_COUNT))}
        onRetry={() => setAttempt((a) => a + 1)}
        onMap={() => setPlaying(null)}
      />
    );
  }

  return (
    <LevelMap
      count={PIPE_LEVEL_COUNT}
      perWorld={PIPE_LEVELS_PER_WORLD}
      worlds={PIPE_WORLDS}
      progress={progress}
      accent={ACCENT}
      renderInfo={(n) => <LevelInfo level={getPipeLevel(n)} />}
      onPlay={setPlaying}
    />
  );
};

const LevelInfo = ({ level }: { level: PipeLevel }) => (
  <>
    <Text style={styles.infoTitle}>💧 Water every flower!</Text>
    <Text style={styles.infoLine}>
      🌱 × {level.flowers} flowers · {level.cols}×{level.rows} garden
    </Text>
    <Text style={styles.infoTarget}>⭐⭐⭐ in {level.starTaps[0]} taps or fewer</Text>
    <Text style={styles.infoTip}>Tap a pipe to turn it. Join every pipe to the 💧 tap, with no pipe left open.</Text>
  </>
);

// ---------------------------------------------------------------------------
// Playing one level.

type PipePlayProps = {
  levelNumber: number;
  hasNext: boolean;
  onSolved: (stars: number, time: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
};

const PipePlay = ({ levelNumber, hasNext, onSolved, onNext, onRetry, onMap }: PipePlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getPipeLevel(levelNumber);
  const { rows, cols, rocks, source } = level;

  // How many quarter turns each tile has been given (kept growing so the
  // turning animation always goes clockwise).
  const [turns, setTurns] = useState<number[]>(() => level.start.map(() => 0));
  const [taps, setTaps] = useState(0);
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [badge, record] = useRecordPlay();
  const solvedRef = useRef(false);

  const masks = useMemo(() => level.start.map((m, i) => rotate(m, turns[i])), [level, turns]);
  const water = useMemo(() => flow(level, masks), [level, masks]);
  const isFlower = (i: number) =>
    !rocks[i] && i !== source && [UP, RIGHT, DOWN, LEFT].filter((d) => level.solution[i] & d).length === 1;
  const flowersWatered = masks.filter((_, i) => isFlower(i) && water.watered[i]).length;
  const stars = starsForTaps(level, taps, hints);

  // Clock: ticks until the garden is watered.
  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  // Solved: let the flowers bloom for a moment, then celebrate.
  useEffect(() => {
    if (!water.solved || solvedRef.current) return;
    solvedRef.current = true;
    setSolved(true);
    onSolved(stars, seconds);
    record({ game: 'pipes', won: true, level: levelNumber, stars, moves: taps, hints, time: seconds });
    const timer = setTimeout(() => setShowWin(true), 900);
    return () => clearTimeout(timer);
  }, [water.solved]); // only when it becomes solved

  const turnTile = useCallback(
    (i: number) => {
      if (solvedRef.current || rocks[i]) return;
      playTap();
      setTurns((t) => t.map((n, k) => (k === i ? n + 1 : n)));
      setTaps((n) => n + 1);
    },
    [rocks]
  );

  // Hint: turn one wrong tile the right way (next to the water if possible).
  const giveHint = () => {
    if (solvedRef.current) return;
    const wrong = masks
      .map((m, i) => (rocks[i] ? -1 : tapsToFix(level, i, m) > 0 ? i : -1))
      .filter((i) => i >= 0);
    if (wrong.length === 0) return;
    const nearWater = wrong.find((i) =>
      [i - cols, i + cols, i % cols > 0 ? i - 1 : -1, i % cols < cols - 1 ? i + 1 : -1].some(
        (j) => j >= 0 && j < masks.length && water.watered[j]
      )
    );
    const i = nearWater ?? wrong[0];
    const fix = tapsToFix(level, i, masks[i]);
    setTurns((t) => t.map((n, k) => (k === i ? n + fix : n)));
    setHints((h) => h + 1);
  };

  const restart = () => {
    if (solvedRef.current) {
      onRetry();
      return;
    }
    setTurns(level.start.map(() => 0));
    setTaps(0);
    setHints(0);
    setSeconds(0);
  };

  const tile = Math.floor(Math.min((width - 32) / cols, (height - 330) / rows, 92));

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { width: Math.max(tile * cols, 300) }]}>
        <Pressable onPress={onMap} hitSlop={10} accessibilityLabel="Back to the map">
          <Text style={styles.backLink}>‹ Map</Text>
        </Pressable>
        <Text style={styles.levelTitle}>Level {levelNumber}</Text>
        <Text style={styles.flowerCount}>
          🌸 {flowersWatered}/{level.flowers}
        </Text>
        <HelpButton small />
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>👆 Taps</Text>
          <Text style={styles.statValue}>{taps}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>⏰</Text>
          <Text style={styles.statValue}>{formatSeconds(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statLabel, styles.starsNow]}>{'★'.repeat(stars)}</Text>
          <Text style={[styles.statLabel, styles.starsGone]}>{'★'.repeat(3 - stars)}</Text>
        </View>
      </View>
      <Text style={styles.target}>
        {stars === 3
          ? `⭐⭐⭐ if you finish in ${level.starTaps[0]} taps`
          : stars === 2
            ? `⭐⭐ if you finish in ${level.starTaps[1]} taps`
            : 'Keep going, you can do it!'}
      </Text>

      <View style={[styles.garden, { width: tile * cols + 12, height: tile * rows + 12 }]}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.gardenRow}>
            {Array.from({ length: cols }, (_, c) => {
              const i = r * cols + c;
              return rocks[i] ? (
                <Rock key={i} size={tile} />
              ) : (
                <Tile
                  key={i}
                  index={i}
                  base={level.start[i]}
                  turns={turns[i]}
                  watered={water.watered[i]}
                  kind={i === source ? 'source' : isFlower(i) ? 'flower' : 'pipe'}
                  size={tile}
                  onPress={turnTile}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" disabled={solved} />
        <ChunkyButton label="🔄 Restart" onPress={restart} color={ACCENT} size="sm" />
      </View>

      <Popup visible={showWin}>
          <WinCard
            title="🌸 All watered!"
            subtitle={`Level ${levelNumber} of ${PIPE_LEVEL_COUNT}`}
            stars={stars}
            stats={[
              { label: 'Taps', value: taps },
              { label: 'Time', value: formatSeconds(seconds) },
            ]}
            message={
              hints > 0
                ? `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. Lovely garden!`
                : stars === 3
                  ? 'Super smart turning! 🌟'
                  : `Try it in ${level.starTaps[0]} taps for 3 stars!`
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

// ---------------------------------------------------------------------------
// Tiles

const ARM_END: Record<number, [number, number]> = {
  [UP]: [50, 0],
  [RIGHT]: [100, 50],
  [DOWN]: [50, 100],
  [LEFT]: [0, 50],
};

/** The pipe drawing for a tile before it's turned (100 x 100 box). */
const PipeArt = memo(({ mask, watered }: { mask: number; watered: boolean }) => {
  const outer = watered ? '#1C7ED6' : '#A5A0B8';
  const inner = watered ? '#74C0FC' : '#DCD8E6';
  const arms = [UP, RIGHT, DOWN, LEFT].filter((d) => mask & d);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      {arms.map((d) => (
        <Line key={`o${d}`} x1={50} y1={50} x2={ARM_END[d][0]} y2={ARM_END[d][1]} stroke={outer} strokeWidth={26} />
      ))}
      <Circle cx={50} cy={50} r={17} fill={outer} />
      {arms.map((d) => (
        <Line key={`i${d}`} x1={50} y1={50} x2={ARM_END[d][0]} y2={ARM_END[d][1]} stroke={inner} strokeWidth={9} />
      ))}
      <Circle cx={50} cy={50} r={8} fill={inner} />
    </Svg>
  );
});

type TileProps = {
  index: number;
  base: number;
  turns: number;
  watered: boolean;
  kind: 'source' | 'flower' | 'pipe';
  size: number;
  onPress: (i: number) => void;
};

const Tile = memo(({ index, base, turns, watered, kind, size, onPress }: TileProps) => {
  const angle = useRef(new Animated.Value(turns * 90)).current;
  const bloom = useRef(new Animated.Value(watered ? 1 : 0)).current;

  useEffect(() => {
    if (turns === 0) angle.setValue(0); // restarted
    else
      Animated.timing(angle, {
        toValue: turns * 90,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
  }, [turns, angle]);

  useEffect(() => {
    Animated.spring(bloom, { toValue: watered ? 1 : 0, friction: 4, useNativeDriver: true }).start();
  }, [watered, bloom]);

  const rotateStyle = { transform: [{ rotate: angle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] };
  const icon = size * 0.42;

  return (
    <Pressable onPress={() => onPress(index)} style={{ width: size, height: size, padding: 2 }} accessibilityLabel="Turn pipe">
      {({ pressed }) => (
        <View
          style={[
            styles.tile,
            { backgroundColor: watered ? '#E7F5FF' : '#FFF9E6', opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Animated.View style={[styles.fill, rotateStyle]}>
            <PipeArt mask={base} watered={watered} />
          </Animated.View>
          {kind === 'source' ? (
            <View style={[styles.tap, { width: icon * 1.25, height: icon * 1.25, borderRadius: icon }]}>
              <Text style={{ fontSize: icon * 0.75 }}>💧</Text>
            </View>
          ) : kind === 'flower' ? (
            <Animated.View
              style={[
                styles.iconWrap,
                { transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }] },
              ]}
              pointerEvents="none"
            >
              <Text style={{ fontSize: icon }}>{watered ? '🌸' : '🌱'}</Text>
            </Animated.View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

const Rock = ({ size }: { size: number }) => (
  <View style={{ width: size, height: size, padding: 2 }}>
    <View style={[styles.tile, styles.rockTile]}>
      <View style={[styles.rock, { width: size * 0.62, height: size * 0.5, borderRadius: size * 0.22 }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#F4FCE3',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: {
    fontSize: 17,
    fontWeight: '700',
    color: ACCENT,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  flowerCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  starsNow: {
    fontSize: 18,
    color: '#FFC83D',
  },
  starsGone: {
    fontSize: 18,
    color: '#E0DBEA',
    marginLeft: -6,
  },
  target: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 14,
    color: colors.textMuted,
  },
  garden: {
    padding: 6,
    borderRadius: radius.md + 4,
    backgroundColor: '#8CC152',
    borderBottomWidth: 5,
    borderBottomColor: '#5C940D',
  },
  gardenRow: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  tap: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: '#1C7ED6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rockTile: {
    backgroundColor: '#B2D87F',
  },
  rock: {
    backgroundColor: '#9A94AF',
    borderBottomWidth: 5,
    borderBottomColor: '#6F6987',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  // --- start popup ---
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  infoLine: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoTarget: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
  },
  infoTip: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(45,42,74,0.55)',
  },
});

export default PipesGame;
