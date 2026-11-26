import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import WinCard from '../components/WinCard';
import { Popup } from '../components/Popup';
import MapGame, { type MapPlayProps } from '../components/MapGame';
import { LevelInfoText, PlayTop, StatPills, TargetLine, playStyles } from '../components/PlayParts';
import { colors, gameStyles, shade } from '../theme';
import { buzzLight, playPop } from '../lib/sound';
import {
  FLOOD_LEVEL_COUNT,
  FLOOD_LEVELS_PER_WORLD,
  FLOOD_WORLDS,
  PAINTS,
  bestColor,
  getFloodLevel,
  isDone,
  pour,
  region,
  starsForMoves,
} from '../lib/flood';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';

const ACCENT = gameStyles.flood.color;

// ---------------------------------------------------------------------------
// Color Flood: a level map of 60 boards.

const FloodGame = () => (
  <MapGame
    storageKey="flood.progress.v1"
    accent={ACCENT}
    count={FLOOD_LEVEL_COUNT}
    perWorld={FLOOD_LEVELS_PER_WORLD}
    worlds={FLOOD_WORLDS}
    renderInfo={(n) => {
      const level = getFloodLevel(n);
      return (
        <LevelInfoText
          accent={ACCENT}
          title="🎨 Make it all one colour!"
          line={`${level.size}×${level.size} board · ${level.colors} colours · ${level.limit} moves`}
          target={`⭐⭐⭐ in ${level.par} moves or fewer`}
          tip="The paint starts in the top-left corner. Pick a colour to spread it into every touching square of that colour."
        />
      );
    }}
    renderPlay={(props) => <FloodPlay {...props} />}
  />
);

// ---------------------------------------------------------------------------
// Playing one board.

type Result = 'won' | 'lost' | null;

const FloodPlay = ({ levelNumber, hasNext, onSolved, onNext, onRetry, onMap }: MapPlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getFloodLevel(levelNumber);
  const { size } = level;

  const [board, setBoard] = useState<number[]>(level.start);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintColor, setHintColor] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [showCard, setShowCard] = useState(false);
  const [badge, record] = useRecordPlay();

  const painted = useMemo(() => region(board, size), [board, size]);
  const percent = Math.round((painted.size / (size * size)) * 100);
  const stars = starsForMoves(level, moves, hints);
  const left = level.limit - moves;
  const tile = Math.floor(Math.min((width - 40) / size, (height - 350) / size, 60));
  const over = result !== null;

  useEffect(() => {
    if (over) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [over]);

  // The game ended: save, then show the card after the last splash.
  useEffect(() => {
    if (!result) return;
    if (result === 'won') {
      onSolved(stars, seconds);
      record({ game: 'flood', won: true, level: levelNumber, stars, moves, hints, time: seconds });
    } else {
      record({ game: 'flood', won: false, level: levelNumber, moves, hints, time: seconds });
    }
    const timer = setTimeout(() => setShowCard(true), result === 'won' ? 800 : 500);
    return () => clearTimeout(timer);
  }, [result]); // only when the game ends

  const choose = (color: number) => {
    if (over || color === board[0]) return;
    const next = pour(board, size, color);
    const used = moves + 1;
    setBoard(next);
    setMoves(used);
    setHintColor(null);
    playPop();
    if (isDone(next)) {
      buzzLight();
      setResult('won');
    } else if (used >= level.limit) {
      setResult('lost');
    }
  };

  const giveHint = () => {
    if (over) return;
    setHintColor(bestColor(board, size, level.colors));
    setHints((h) => h + 1);
  };

  const restart = () => {
    if (over) {
      onRetry();
      return;
    }
    setBoard(level.start);
    setMoves(0);
    setHints(0);
    setHintColor(null);
    setSeconds(0);
  };

  return (
    <View style={[playStyles.container, styles.page]}>
      <PlayTop
        levelNumber={levelNumber}
        accent={ACCENT}
        onMap={onMap}
        right={`🎨 ${percent}%`}
        width={Math.max(tile * size, 300)}
      />
      <StatPills
        accent={ACCENT}
        stars={stars}
        items={[
          { label: 'Moves left', value: left },
          { label: '⏰', value: formatSeconds(seconds) },
        ]}
      />
      <TargetLine>
        {stars === 3
          ? `⭐⭐⭐ if you finish in ${level.par} moves`
          : stars === 2
            ? `⭐⭐ if you finish in ${level.par + 1} moves`
            : left <= 2
              ? `Only ${left} ${left === 1 ? 'move' : 'moves'} left!`
              : 'Keep going, you can do it!'}
      </TargetLine>

      <View style={[styles.board, { width: tile * size + 12 }]}>
        {Array.from({ length: size }, (_, r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: size }, (_, c) => {
              const i = r * size + c;
              return (
                <Square
                  key={i}
                  index={i}
                  color={board[i]}
                  size={tile}
                  corner={i === 0}
                  wave={painted.has(i) ? r + c : -1}
                  onPress={choose}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.paints}>
        {PAINTS.slice(0, level.colors).map((paint, k) => {
          const current = k === board[0];
          return (
            <Pressable
              key={paint.name}
              onPress={() => choose(k)}
              disabled={over || current}
              accessibilityLabel={`Pour ${paint.name}`}
              style={({ pressed }) => [
                styles.paint,
                { backgroundColor: paint.color, borderBottomColor: shade(paint.color) },
                current && styles.paintCurrent,
                hintColor === k && styles.paintHint,
                pressed && styles.paintPressed,
              ]}
            >
              <Text style={styles.paintShape}>{paint.shape}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={playStyles.actions}>
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" disabled={over} />
        <ChunkyButton label="🔄 Restart" onPress={restart} color={ACCENT} size="sm" />
      </View>

      <Popup visible={showCard}>
        {result === 'won' ? (
          <WinCard
            title="🎨 All one colour!"
            subtitle={`Level ${levelNumber} of ${FLOOD_LEVEL_COUNT}`}
            stars={stars}
            stats={[
              { label: 'Moves', value: moves },
              { label: 'Time', value: formatSeconds(seconds) },
            ]}
            message={
              hints > 0
                ? `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. What a splash!`
                : stars === 3
                  ? 'Super smart painting! 🌟'
                  : `Try it in ${level.par} moves for 3 stars!`
            }
            badge={badge}
            buttonLabel={hasNext ? `Next: Level ${levelNumber + 1} ▶` : '🏆 Back to the map'}
            onPlayAgain={hasNext ? onNext : onMap}
            secondaryLabel={hasNext ? '🗺️ Map' : '🔄 Play again'}
            onSecondary={hasNext ? onMap : onRetry}
          />
        ) : (
          <WinCard
            celebrate={false}
            title="😮 Out of moves!"
            subtitle={`Level ${levelNumber}`}
            stats={[{ label: 'Painted', value: `${percent}%` }]}
            message="So close! Tip: pick the colour that touches the most of your paint."
            buttonLabel="🔄 Try again"
            onPlayAgain={onRetry}
            secondaryLabel="🗺️ Map"
            onSecondary={onMap}
          />
        )}
      </Popup>
    </View>
  );
};

// ---------------------------------------------------------------------------
// A square of the board. When the paint reaches it, it does a little hop,
// rippling out from the corner.

type SquareProps = {
  index: number;
  color: number;
  size: number;
  corner: boolean;
  wave: number; // distance from the corner when painted, else -1
  onPress: (color: number) => void;
};

const Square = memo(({ index, color, size, corner, wave, onPress }: SquareProps) => {
  const hop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (wave < 0) return;
    hop.setValue(0.7);
    Animated.sequence([
      Animated.delay(Math.min(wave * 18, 300)),
      Animated.spring(hop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [color, wave, hop]);

  return (
    <Pressable onPress={() => onPress(color)} accessibilityLabel={`${PAINTS[color].name} square ${index + 1}`}>
      <Animated.View
        style={[
          styles.square,
          { width: size, height: size, backgroundColor: PAINTS[color].color, transform: [{ scale: hop }] },
        ]}
      >
        {corner ? <Text style={[styles.cornerMark, { fontSize: size * 0.5 }]}>🖌️</Text> : null}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#F8F0FC',
  },
  board: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 5,
    borderBottomColor: '#E5DBFF',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerMark: {
    textAlign: 'center',
  },
  paints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  paint: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paintCurrent: {
    opacity: 0.35,
  },
  paintHint: {
    borderWidth: 4,
    borderColor: colors.text,
  },
  paintPressed: {
    transform: [{ scale: 0.92 }],
  },
  paintShape: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
  },
});

export default FloodGame;
