import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  useWindowDimensions,
} from 'react-native';
import Svg from 'react-native-svg';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import PuzzleList from '../components/PuzzleList';
import WinCard from '../components/WinCard';
import { PICTURES, pictureVariant, type Picture } from '../components/jigsaw/Pictures';
import { colors, gameStyles, radius, shade } from '../theme';
import { playTap } from '../lib/sound';
import {
  EMPTY,
  PUZZLES_PER_LEVEL,
  SLIDING_LEVELS,
  getSlidingPuzzle,
  isSolved as boardSolved,
  slidingLook,
  solvedBoard,
} from '../lib/sliding';
import { solvePuzzle, greedyHint } from '../lib/puzzleSolver';
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

const ACCENT = gameStyles.sliding.color;
const STORAGE_KEY = 'sliding.progress.v1';
const BOARD_PADDING = 10;

const starsFor = (hints: number) => (hints === 0 ? 3 : hints <= 2 ? 2 : 1);

// A rainbow of tile colours for any board size, each dark enough for
// white numbers.
const hslToHex = (h: number, s: number, l: number): string => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const tileColor = (value: number, tiles: number) => hslToHex(((value - 1) * 330) / tiles, 0.68, 0.47);

type Playing = { level: number; puzzle: number; round: number };

// ---------------------------------------------------------------------------
// Sliding Puzzle: opens on the puzzle list for a level; tapping one plays it.

const SlidingPuzzle = () => {
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [level, setLevel] = useState(1);
  const [playing, setPlaying] = useState<Playing | null>(null);

  useEffect(() => {
    let active = true;
    loadPuzzleProgress(STORAGE_KEY).then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  // Phone back button: from a puzzle, go back to the puzzle list.
  useBackHandler(() => {
    if (playing) setLevel(playing.level);
    setPlaying(null);
  }, playing !== null);

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (playing) {
    return (
      <SlidingPlay
        key={`${playing.level}-${playing.puzzle}-${playing.round}`}
        level={playing.level}
        puzzle={playing.puzzle}
        onSolved={(stars, time) => {
          const next = withPuzzleResult(progress, playing.level, playing.puzzle, { stars, bestTime: time });
          setProgress(next);
          savePuzzleProgress(STORAGE_KEY, next);
        }}
        onRestart={() => setPlaying({ ...playing, round: playing.round + 1 })}
        onNext={() => setPlaying({ level: playing.level, puzzle: playing.puzzle + 1, round: 0 })}
        onList={() => {
          setLevel(playing.level);
          setPlaying(null);
        }}
      />
    );
  }

  const info = SLIDING_LEVELS[level - 1];
  return (
    <PuzzleList
      levels={SLIDING_LEVELS.map((l) => ({ level: l.level, name: l.name, emoji: l.emoji }))}
      level={level}
      onLevel={setLevel}
      count={PUZZLES_PER_LEVEL}
      progress={progress}
      accent={ACCENT}
      title={`${info.emoji} ${info.name} · ${info.size}×${info.size}`}
      onPlay={(puzzle) => setPlaying({ level, puzzle, round: 0 })}
      renderThumb={(puzzle, size) => {
        const look = slidingLook(level, puzzle, PICTURES.length);
        if (look.style === 'numbers') {
          return (
            <View style={[styles.numbersThumb, { width: size, height: size }]}>
              <Text style={[styles.numbersThumbText, { fontSize: size * 0.3 }]}>123</Text>
            </View>
          );
        }
        const picture = pictureVariant(look.pictureIndex, look.mirrored);
        return (
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <picture.Draw />
          </Svg>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// One tile's face: a coloured number, or a slice of the picture with a small
// number in the corner. Memoised, so sliding never redraws the picture.

const TileFace = React.memo(
  ({
    value,
    size,
    tileSize,
    picture,
  }: {
    value: number;
    size: number;
    tileSize: number;
    picture: Picture | null;
  }) => {
    if (!picture) {
      const color = tileColor(value, size * size - 1);
      return (
        <View
          style={[
            styles.numberTile,
            { width: tileSize, height: tileSize, backgroundColor: color, borderBottomColor: shade(color) },
          ]}
        >
          <Text style={[styles.tileText, { fontSize: tileSize * 0.42 }]}>{value}</Text>
        </View>
      );
    }
    // Show just this tile's part of the 100 x 100 picture.
    const part = 100 / size;
    const row = Math.floor((value - 1) / size);
    const col = (value - 1) % size;
    return (
      <View style={[styles.pictureTile, { width: tileSize, height: tileSize }]}>
        <Svg width={tileSize} height={tileSize} viewBox={`${col * part} ${row * part} ${part} ${part}`}>
          <picture.Draw />
        </Svg>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { fontSize: Math.max(10, tileSize * 0.16) }]}>{value}</Text>
        </View>
      </View>
    );
  }
);

// ---------------------------------------------------------------------------
// Playing one numbered puzzle.

type SlidingPlayProps = {
  level: number;
  puzzle: number;
  onSolved: (stars: number, time: number) => void;
  onRestart: () => void;
  onNext: () => void;
  onList: () => void;
};

const SlidingPlay = ({
  level: levelNumber,
  puzzle: puzzleNumber,
  onSolved,
  onRestart,
  onNext,
  onList,
}: SlidingPlayProps) => {
  const { width } = useWindowDimensions();
  const game = getSlidingPuzzle(levelNumber, puzzleNumber, PICTURES.length);
  const info = game.level;
  const size = info.size;
  const picture = game.style === 'picture' ? pictureVariant(game.pictureIndex, game.mirrored) : null;
  const lookLabel = picture ? `${picture.emoji} ${picture.name}` : '🔢 Numbers';

  const [board, setBoard] = useState<number[]>(() => [...game.board]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  // Remaining taps of the current hint plan; null when there is no plan.
  const [hintPlan, setHintPlan] = useState<number[] | null>(null);
  const [hintTile, setHintTile] = useState<number | null>(null); // board index
  const [hints, setHints] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [badge, recordWin] = useRecordPlay();

  // Clock: ticks once a second until solved.
  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  const showHint = () => {
    if (solved || thinking) return;
    // Reuse the saved plan while the player follows it; otherwise work out
    // a new one. Big boards can take a moment, so show "Thinking…" first.
    if (hintPlan && hintPlan.length > 0) {
      setHintTile(hintPlan[0]);
      setHints((h) => h + 1);
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const plan = solvePuzzle(board);
      setHintPlan(plan);
      setHintTile(plan && plan.length > 0 ? plan[0] : greedyHint(board));
      setHints((h) => h + 1);
      setThinking(false);
    }, 30);
  };

  const handleTilePress = (index: number) => {
    if (solved || thinking) return;
    const emptyIndex = board.indexOf(EMPTY);
    const row = Math.floor(index / size);
    const col = index % size;
    const eRow = Math.floor(emptyIndex / size);
    const eCol = emptyIndex % size;
    const adjacent =
      (Math.abs(row - eRow) === 1 && col === eCol) || (Math.abs(col - eCol) === 1 && row === eRow);
    if (!adjacent) return;

    playTap();
    const next = [...board];
    next[emptyIndex] = board[index];
    next[index] = EMPTY;
    LayoutAnimation.configureNext({ duration: 130, update: { type: 'easeInEaseOut' } });
    setBoard(next);
    const newMoves = moves + 1;
    setMoves(newMoves);

    // Keep the hint plan only if the player made the planned move.
    setHintPlan(hintPlan && hintPlan[0] === index ? hintPlan.slice(1) : null);
    setHintTile(null);

    if (boardSolved(next)) {
      setSolved(true);
      onSolved(starsFor(hints), seconds);
      recordWin({
        game: 'sliding',
        won: true,
        level: levelNumber,
        puzzle: puzzleNumber,
        moves: newMoves,
        hints,
        time: seconds,
        picture: lookLabel,
      });
    }
  };

  // --- sizes ---------------------------------------------------------------
  const boardSize = Math.min(width - 30, 460);
  const gap = size <= 3 ? 8 : size === 4 ? 6 : 5;
  const tileSize = Math.floor((boardSize - BOARD_PADDING * 2 - gap * (size - 1)) / size);
  const at = (index: number) => ({
    left: BOARD_PADDING + (index % size) * (tileSize + gap),
    top: BOARD_PADDING + Math.floor(index / size) * (tileSize + gap),
  });

  const stars = starsFor(hints);
  const hasNext = puzzleNumber < PUZZLES_PER_LEVEL;
  const goalTile = Math.floor(Math.min(150, boardSize * 0.45) / size);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.topRow, { width: boardSize }]}>
        <Pressable onPress={onList} hitSlop={8} accessibilityLabel="Back to puzzle list">
          <Text style={styles.backLink}>‹ Puzzles</Text>
        </Pressable>
        <Text style={styles.puzzleTitle}>
          {info.emoji} {info.name} · #{puzzleNumber}
        </Text>
        <HelpButton small />
      </View>

      <View style={styles.lookBanner}>
        <Text style={styles.lookText}>{lookLabel}</Text>
      </View>
      <Text style={[styles.guide, { width: boardSize }]}>
        {picture
          ? 'Slide the pieces to fix the picture. The small numbers show the order.'
          : `Slide the tiles to put 1 to ${size * size - 1} in order, gap at the end.`}
      </Text>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>⏰</Text>
          <Text style={styles.statValue}>{formatSeconds(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>💡</Text>
          <Text style={styles.statValue}>{hints}</Text>
        </View>
      </View>

      <View style={[styles.buttonRow, { width: boardSize }]}>
        <ChunkyButton
          label={thinking ? '🤔 Thinking…' : '💡 Hint'}
          onPress={showHint}
          color={colors.warning}
          size="sm"
        />
        <ChunkyButton
          label={showGoal ? '🙈 Hide' : '🎯 Goal'}
          onPress={() => setShowGoal(!showGoal)}
          color={colors.success}
          size="sm"
        />
        <ChunkyButton label="🔄 Restart" onPress={onRestart} color={ACCENT} size="sm" />
      </View>

      {showGoal ? (
        <View style={styles.goalCard}>
          <Text style={styles.goalTitle}>The finished puzzle looks like this</Text>
          {picture ? (
            <View style={styles.goalPicture}>
              <Svg width={goalTile * size} height={goalTile * size} viewBox="0 0 100 100">
                <picture.Draw />
              </Svg>
            </View>
          ) : (
            <View style={[styles.goalGrid, { width: goalTile * size }]}>
              {solvedBoard(size).map((value, index) => (
                <View
                  key={index}
                  style={[
                    styles.goalTile,
                    { width: goalTile - 3, height: goalTile - 3 },
                    value === EMPTY
                      ? styles.goalEmpty
                      : { backgroundColor: tileColor(value, size * size - 1) },
                  ]}
                >
                  <Text style={[styles.goalTileText, { fontSize: goalTile * 0.4 }]}>
                    {value === EMPTY ? '' : value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View style={[styles.tray, { width: boardSize, height: boardSize }]}>
        {/* Faint slots underneath, so the gap always shows. */}
        {board.map((_, index) => (
          <View
            key={`slot-${index}`}
            style={[styles.slot, at(index), { width: tileSize, height: tileSize }]}
          />
        ))}
        {/* Tiles are keyed by their value, so a slide animates the tile. */}
        {board.map((value, index) =>
          value === EMPTY ? null : (
            <Pressable
              key={value}
              onPress={() => handleTilePress(index)}
              style={[styles.tile, at(index), { width: tileSize, height: tileSize }]}
              accessibilityLabel={`Tile ${value}`}
            >
              <TileFace value={value} size={size} tileSize={tileSize} picture={picture} />
              {index === hintTile ? <View pointerEvents="none" style={styles.hintRing} /> : null}
            </Pressable>
          )
        )}
      </View>

      {hintTile !== null ? (
        <Text style={[styles.hintText, { width: boardSize }]}>
          Tap the glowing tile {board[hintTile]} to slide it into the gap ✨
        </Text>
      ) : null}

      <Popup visible={solved}>
          <WinCard
            title="🎉 You did it!"
            subtitle={`${info.emoji} ${info.name} · Puzzle ${puzzleNumber} · ${lookLabel}`}
            stars={stars}
            stats={[
              { label: 'Moves', value: moves },
              { label: 'Time', value: formatSeconds(seconds) },
            ]}
            message={
              hints === 0
                ? 'Solved all by yourself. Amazing! 🌟'
                : `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. Try with fewer for 3 stars.`
            }
            badge={badge}
            buttonLabel={hasNext ? `Next: Puzzle ${puzzleNumber + 1} ▶` : '🏆 Back to puzzles'}
            onPlayAgain={hasNext ? onNext : onList}
            secondaryLabel={hasNext ? '📋 Puzzle list' : '🔄 Play again'}
            onSecondary={hasNext ? onList : onRestart}
          />
      </Popup>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  numbersThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D6',
  },
  numbersThumbText: {
    fontWeight: '700',
    color: ACCENT,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  puzzleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  lookBanner: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: ACCENT,
  },
  lookText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  guide: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  goalCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 14,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  goalPicture: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  goalTile: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#D8D3EE',
    borderStyle: 'dashed',
  },
  goalTileText: {
    fontWeight: '700',
    color: colors.white,
  },
  tray: {
    backgroundColor: '#FFE8D6',
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: '#F5CDB0',
  },
  slot: {
    position: 'absolute',
    borderRadius: radius.md,
    backgroundColor: '#F8D9C2',
  },
  tile: {
    position: 'absolute',
  },
  numberTile: {
    borderRadius: radius.md,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontWeight: '700',
    color: colors.white,
  },
  // Picture tiles: the clipping view never changes (Android drops the
  // children of a clipped view whose border changes).
  pictureTile: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    left: 3,
    top: 3,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: '700',
    color: colors.text,
  },
  // Hint highlight drawn over the tile, so the tile itself never changes.
  hintRing: {
    position: 'absolute',
    left: -4,
    top: -4,
    right: -4,
    bottom: -4,
    borderWidth: 4,
    borderRadius: radius.md + 4,
    borderColor: '#FFE14D',
  },
  hintText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#E08A00',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(45, 42, 74, 0.55)',
  },
});

export default SlidingPuzzle;
