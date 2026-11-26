import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import WinCard from '../components/WinCard';
import { Popup } from '../components/Popup';
import MapGame, { type MapPlayProps } from '../components/MapGame';
import { LevelInfoText, PlayTop, StatPills, TargetLine, playStyles } from '../components/PlayParts';
import { colors, gameStyles } from '../theme';
import { buzzLight, playPop, playTap } from '../lib/sound';
import {
  LIGHTS_LEVEL_COUNT,
  LIGHTS_LEVELS_PER_WORLD,
  LIGHTS_WORLDS,
  getLightsLevel,
  solve,
  starsForTaps,
  tap,
} from '../lib/lights';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';

const ACCENT = gameStyles.lights.color;
const NIGHT = '#272B55';

// ---------------------------------------------------------------------------
// Light Switch: a level map of 60 lamp puzzles.

const LightsGame = () => (
  <MapGame
    storageKey="lights.progress.v1"
    accent={ACCENT}
    count={LIGHTS_LEVEL_COUNT}
    perWorld={LIGHTS_LEVELS_PER_WORLD}
    worlds={LIGHTS_WORLDS}
    renderInfo={(n) => {
      const level = getLightsLevel(n);
      return (
        <LevelInfoText
          accent={ACCENT}
          title="💡 Light every lamp!"
          line={`${level.size}×${level.size} lamps · ${level.start.filter((on) => !on).length} are off`}
          target={`⭐⭐⭐ in ${level.par} ${level.par === 1 ? 'tap' : 'taps'}`}
          tip="Tapping a lamp switches it AND the lamps next to it (up, down, left, right)."
        />
      );
    }}
    renderPlay={(props) => <LightsPlay {...props} />}
  />
);

// ---------------------------------------------------------------------------
// Playing one level.

const LightsPlay = ({ levelNumber, hasNext, onSolved, onNext, onRetry, onMap }: MapPlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getLightsLevel(levelNumber);
  const { size } = level;

  const [lamps, setLamps] = useState<boolean[]>(level.start);
  const [taps, setTaps] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [badge, record] = useRecordPlay();

  const lit = lamps.filter(Boolean).length;
  const stars = starsForTaps(level, taps, hints);
  const tile = Math.floor(Math.min((width - 48) / size, (height - 340) / size, 84));

  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  useEffect(() => {
    if (!solved) return;
    onSolved(stars, seconds);
    record({ game: 'lights', won: true, level: levelNumber, stars, moves: taps, hints, time: seconds });
    const timer = setTimeout(() => setShowWin(true), 900);
    return () => clearTimeout(timer);
  }, [solved]); // only when it becomes solved

  const press = (i: number) => {
    if (solved) return;
    const next = tap(lamps, i, size);
    setLamps(next);
    setTaps((n) => n + 1);
    setHintCell(null);
    if (next.every(Boolean)) {
      setSolved(true);
      playPop();
      buzzLight();
    } else playTap();
  };

  // Hint: ring a lamp that is part of the quickest way from here.
  const giveHint = () => {
    if (solved) return;
    const answer = solve(lamps, size);
    if (!answer || answer.length === 0) return;
    setHintCell(answer[0]);
    setHints((h) => h + 1);
  };

  const restart = () => {
    if (solved) {
      onRetry();
      return;
    }
    setLamps(level.start);
    setTaps(0);
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
        right={`💡 ${lit}/${size * size}`}
        width={Math.max(tile * size, 300)}
      />
      <StatPills
        accent={ACCENT}
        stars={stars}
        items={[
          { label: '👆 Taps', value: taps },
          { label: '⏰', value: formatSeconds(seconds) },
        ]}
      />
      <TargetLine>
        {stars === 3
          ? `⭐⭐⭐ if you finish in ${level.par} ${level.par === 1 ? 'tap' : 'taps'}`
          : stars === 2
            ? `⭐⭐ if you finish in ${level.par * 2 + 2} taps`
            : 'Keep going, you can do it!'}
      </TargetLine>

      <View style={[styles.board, { width: tile * size + 16 }]}>
        {Array.from({ length: size }, (_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: size }, (_, c) => {
              const i = r * size + c;
              return (
                <Lamp key={i} index={i} on={lamps[i]} hint={hintCell === i} size={tile} party={solved} onPress={press} />
              );
            })}
          </View>
        ))}
      </View>

      <View style={playStyles.actions}>
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" disabled={solved} />
        <ChunkyButton label="🔄 Restart" onPress={restart} color="#5C6AC4" size="sm" />
      </View>

      <Popup visible={showWin}>
        <WinCard
          title="💡 All lit up!"
          subtitle={`Level ${levelNumber} of ${LIGHTS_LEVEL_COUNT}`}
          stars={stars}
          stats={[
            { label: 'Taps', value: taps },
            { label: 'Time', value: formatSeconds(seconds) },
          ]}
          message={
            hints > 0
              ? `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. So bright!`
              : stars === 3
                ? 'The fewest taps possible! 🌟'
                : `It can be done in ${level.par} ${level.par === 1 ? 'tap' : 'taps'}. Try for 3 stars!`
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
// A lamp: dark when off, glowing when on; it pops when switched.

type LampProps = {
  index: number;
  on: boolean;
  hint: boolean;
  size: number;
  party: boolean; // everything lit: a little wave of joy
  onPress: (i: number) => void;
};

const Lamp = memo(({ index, on, hint, size, party, onPress }: LampProps) => {
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
  }, [on, pop]);

  useEffect(() => {
    if (!party) return;
    Animated.sequence([
      Animated.delay(index * 35),
      Animated.spring(pop, { toValue: 1.18, friction: 3, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [party, index, pop]);

  return (
    <Pressable onPress={() => onPress(index)} style={{ width: size, height: size, padding: 4 }} accessibilityLabel={on ? 'Lamp on' : 'Lamp off'}>
      <Animated.View
        style={[
          styles.lamp,
          on ? styles.lampOn : styles.lampOff,
          hint && styles.lampHint,
          { transform: [{ scale: pop }] },
        ]}
      >
        <Text style={[{ fontSize: size * 0.46 }, !on && styles.bulbOff]}>💡</Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFF9DB',
  },
  board: {
    padding: 8,
    borderRadius: 22,
    backgroundColor: NIGHT,
    borderBottomWidth: 6,
    borderBottomColor: '#171A3A',
  },
  row: {
    flexDirection: 'row',
  },
  lamp: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lampOn: {
    backgroundColor: '#FFE066',
    borderBottomWidth: 4,
    borderBottomColor: '#F59F00',
    elevation: 6,
    shadowColor: '#FFD43B',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  lampOff: {
    backgroundColor: '#3B4076',
    borderBottomWidth: 4,
    borderBottomColor: '#1F2350',
  },
  lampHint: {
    borderWidth: 3,
    borderColor: '#FF6B9D',
  },
  bulbOff: {
    opacity: 0.25,
  },
});

export default LightsGame;
