import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../AppText';
import { colors } from '../../theme';
import WinCard from '../WinCard';
import ChunkyButton from '../ChunkyButton';
import { palette } from './palette';
import { playTap } from '../../lib/sound';
import { TOTAL_LEVELS, getLevel, type LevelInfo } from '../../lib/levelGenerator';
import { starsFor, type Stars } from '../../lib/progress';
import {
  type Board,
  type Cell,
  N,
  E,
  S,
  W,
  scramble,
  rotateCell,
  reachableFrom,
  findWalk,
  solveRotations,
} from '../../lib/pathPuzzle';
import { HelpButton } from '../HowToPlay';
import { Popup } from '../Popup';

// Time Amit takes to glide from one tile to the next, in milliseconds.
const STEP_MS = 200;
// Pause between completing the path and Amit setting off, in milliseconds.
const AUTO_WALK_DELAY_MS = 350;
// Space between the board frame's edge and the tiles.
const FRAME_PADDING = 6;

export type LevelOutcome = {
  turns: number;
  par: number;
  stars: Stars;
};

type LevelPlayProps = {
  levelNumber: number;
  onComplete: (outcome: LevelOutcome) => void;
  onOpenMap: () => void;
  onPlayLevel: (level: number) => void;
};

const shuffledBoard = (info: LevelInfo): Board => scramble(info.solved, info.minTaps);

// Fewest turns needed to open the path from the start.
const parFor = (board: Board): number => solveRotations(board, board.start)?.length ?? 0;

// One Monument Valley level. Render with key={levelNumber} so a new level
// starts with fresh state.
const LevelPlay = ({ levelNumber, onComplete, onOpenMap, onPlayLevel }: LevelPlayProps) => {
  const { width, height } = useWindowDimensions();
  const info = getLevel(levelNumber);
  const [board, setBoard] = useState<Board>(() => shuffledBoard(info));
  const [player, setPlayer] = useState<number>(() => board.start);
  const [par, setPar] = useState<number>(() => parFor(board));
  const [moves, setMoves] = useState(0);
  const [walking, setWalking] = useState(false);
  const [solved, setSolved] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const walkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Amit's position on the board in pixels; animated to glide.
  const idaPos = useRef(new Animated.ValueXY()).current;

  const isLastLevel = levelNumber === TOTAL_LEVELS;
  const stars = starsFor(moves, par, usedHint);

  // Stop any walk in progress if the screen closes.
  useEffect(() => () => {
    if (walkTimer.current) clearTimeout(walkTimer.current);
    idaPos.stopAnimation();
  }, [idaPos]);

  // Report the result once, when Amit reaches the goal.
  useEffect(() => {
    if (solved) onComplete({ turns: moves, par, stars });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  // Every cell Amit can walk to right now; drawn in gold.
  const reachable = useMemo(() => reachableFrom(board, player), [board, player]);

  const restart = () => {
    if (walkTimer.current) clearTimeout(walkTimer.current);
    idaPos.stopAnimation();
    const next = shuffledBoard(info);
    setBoard(next);
    setPlayer(next.start);
    setPar(parFor(next));
    setMoves(0);
    setWalking(false);
    setSolved(false);
    setUsedHint(false);
    setHintCell(null);
    setMessage(null);
  };

  // Walk Amit along `steps`: one continuous glide through each tile's
  // centre. The tile only updates on arrival.
  const walk = (steps: number[]) => {
    setWalking(true);
    Animated.sequence(
      steps.map((cell) =>
        Animated.timing(idaPos, {
          toValue: cellOrigin(cell),
          duration: STEP_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    ).start(({ finished }) => {
      if (!finished) return; // interrupted by Reset or leaving the level
      const last = steps[steps.length - 1];
      setPlayer(last);
      setWalking(false);
      if (last === board.goal) setSolved(true);
    });
  };

  const handleCellPress = (index: number) => {
    if (walking || solved) return;
    const cell = board.cells[index];
    if (!cell) return;

    // Tiles you can turn: tap to rotate 90 degrees clockwise.
    if (cell.rotatable) {
      if (index === player) {
        setMessage("Amit is standing on this tile, so it can't turn.");
        return;
      }
      const turned = rotateCell(board, index);
      playTap();
      setBoard(turned);
      setMoves(moves + 1);
      setHintCell(null);
      setMessage(null);

      // If that turn completed the path, Amit sets off for the goal by
      // herself after a short pause, so you can see the tile click in.
      const route = findWalk(turned, player, turned.goal);
      if (route) {
        setWalking(true); // lock taps during the pause
        setMessage('The path is complete! Amit is on the way.');
        walkTimer.current = setTimeout(() => walk(route), AUTO_WALK_DELAY_MS);
      }
      return;
    }

    // Fixed tiles: walk there if a path is connected.
    if (index === player) return;
    const steps = findWalk(board, player, index);
    if (!steps) {
      setMessage(
        index === board.goal
          ? "The path to the goal isn't connected yet. Turn the green tiles."
          : "Amit can't reach that tile yet."
      );
      return;
    }
    setHintCell(null);
    setMessage(null);
    walk(steps);
  };

  const showHint = () => {
    if (walking || solved) return;
    const taps = solveRotations(board, player);
    if (taps === null) {
      setHintCell(null);
      setMessage("Amit can't reach the goal from here. Tap Reset to try the level again.");
    } else if (taps.length === 0) {
      // Already connected (Amit had walked elsewhere): head for the goal.
      const route = findWalk(board, player, board.goal);
      if (route) {
        setMessage('The path is open! Amit is on the way.');
        walk(route);
      }
    } else {
      setUsedHint(true);
      setHintCell(taps[0]);
      setMessage(
        `Turn the highlighted tile. At least ${taps.length} turn${taps.length === 1 ? '' : 's'} to go.`
      );
    }
  };

  // Board sizing: the frame is the same square on every level, as wide as
  // the screen allows with an 8px margin each side (shorter on squat
  // screens, leaving room for the title, stats and buttons). Each level's
  // grid is centred inside it; tiles get as big as the grid allows.
  const frameSize = Math.floor(Math.max(260, Math.min(width - 36, height - 300)));
  const gridSpace = frameSize - 2 * FRAME_PADDING;
  const cellSize = Math.floor(gridSpace / Math.max(board.rows, board.cols));
  const inner = cellSize - 4; // tile size inside its 2px padding
  const cellOrigin = (cell: number) => ({
    x: (cell % board.cols) * cellSize,
    y: Math.floor(cell / board.cols) * cellSize,
  });

  // Keep Amit on the right tile when not walking (new level, Reset,
  // screen resize).
  useEffect(() => {
    if (!walking) idaPos.setValue(cellOrigin(player));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, cellSize, walking, board.cols]);

  const renderAmit = () => {
    const hatWidth = inner * 0.36;
    const hatHeight = inner * 0.44;
    const bodyWidth = hatWidth * 0.55;
    const bodyHeight = inner * 0.14;
    return (
      <View
        pointerEvents="none"
        style={[
          styles.ida,
          { left: 2, top: 2 + (inner - hatHeight - bodyHeight) / 2, width: inner },
        ]}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: hatWidth / 2,
            borderRightWidth: hatWidth / 2,
            borderBottomWidth: hatHeight,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: palette.ida,
          }}
        />
        <View
          style={{
            width: bodyWidth,
            height: bodyHeight,
            borderBottomLeftRadius: bodyWidth / 2,
            borderBottomRightRadius: bodyWidth / 2,
            backgroundColor: palette.idaBody,
          }}
        />
      </View>
    );
  };

  const renderTile = (cell: Cell, index: number) => {
    if (!cell) {
      return <View key={index} style={{ width: cellSize, height: cellSize }} />;
    }

    const lit = reachable.has(index);
    const armColor = lit ? palette.litPath : cell.rotatable ? palette.spinPath : palette.path;
    const thick = Math.round(inner * 0.3);
    const offset = (inner - thick) / 2;
    const half = inner / 2;
    const arms = [
      { dir: N, style: { left: offset, top: 0, width: thick, height: half } },
      { dir: S, style: { left: offset, top: half, width: thick, height: half } },
      { dir: W, style: { left: 0, top: offset, width: half, height: thick } },
      { dir: E, style: { left: half, top: offset, width: half, height: thick } },
    ];
    const isGoal = index === board.goal;
    const goalSize = inner * 0.56;

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        onPress={() => handleCellPress(index)}
        style={{ width: cellSize, height: cellSize, padding: 2 }}
      >
        <View
          style={[
            styles.tile,
            { backgroundColor: cell.rotatable ? palette.spinTile : palette.fixedTile },
          ]}
        >
          {arms
            .filter((arm) => cell.open & arm.dir)
            .map((arm) => (
              <View
                key={arm.dir}
                style={[styles.arm, arm.style, { backgroundColor: armColor }]}
              />
            ))}
          <View
            style={[
              styles.arm,
              {
                left: offset,
                top: offset,
                width: thick,
                height: thick,
                borderRadius: thick * 0.25,
                backgroundColor: armColor,
              },
            ]}
          />

          {cell.rotatable && (
            <Text style={[styles.spinMark, { fontSize: inner * 0.24 }]}>↻</Text>
          )}

          {isGoal && (
            <View
              style={[
                styles.goal,
                {
                  left: (inner - goalSize) / 2,
                  top: (inner - goalSize) / 2,
                  width: goalSize,
                  height: goalSize,
                  borderRadius: goalSize / 2,
                },
                lit && styles.goalLit,
              ]}
            />
          )}

        </View>
        {hintCell === index && <View pointerEvents="none" style={styles.hintRing} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onOpenMap} style={styles.mapButton}>
          <Text style={[styles.mapButtonText, { color: info.chapter.accent }]}>← Route Map</Text>
        </TouchableOpacity>
        <HelpButton small />
        <Text style={styles.levelBadge}>
          Level {levelNumber} / {TOTAL_LEVELS}
        </Text>
      </View>

      <View style={styles.header}>
        <Text style={[styles.chapterName, { color: info.chapter.accent }]}>
          {info.chapter.name.toUpperCase()}
        </Text>
        <Text style={styles.levelName}>{info.name}</Text>
        <Text style={styles.description}>{info.description}</Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.statText}>Turns: {moves}</Text>
        <Text style={styles.statText}>Par: {par}</Text>
      </View>

      <View
        style={[
          styles.boardFrame,
          { width: frameSize, height: frameSize, backgroundColor: info.chapter.color },
        ]}
      >
        <View style={[styles.board, { width: cellSize * board.cols }]}>
          {board.cells.map(renderTile)}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.idaLayer,
              { width: cellSize, height: cellSize, transform: idaPos.getTranslateTransform() },
            ]}
          >
            {renderAmit()}
          </Animated.View>
        </View>
      </View>

      <Text style={styles.message}>
        {message ??
          'Tap a green ↻ tile to turn it. When the gold path reaches the goal, Amit walks there without any help.'}
      </Text>

      <View style={styles.buttonRow}>
        <ChunkyButton
          label="💡 Hint"
          onPress={showHint}
          color={colors.warning}
          disabled={walking || solved}
        />
        <ChunkyButton label="🔄 Reset" onPress={restart} color={colors.primary} />
      </View>

      {/* Level complete: popup over a dimmed screen */}
      <Popup visible={solved}>
          <WinCard
            title={isLastLevel ? '🏆 All 100 levels complete!' : '✨ Level complete!'}
            subtitle={`Level ${levelNumber} · ${info.name}`}
            stars={stars}
            stats={[
              { label: 'Turns', value: moves },
              { label: 'Par', value: par },
            ]}
            message={
              stars === 3
                ? 'Perfect! You used the fewest turns possible.'
                : usedHint
                ? 'Finish without a hint, in par turns, for 3 stars.'
                : `You used ${moves - par} more turn${moves - par === 1 ? '' : 's'} than needed. Match par for 3 stars.`
            }
            buttonLabel={isLastLevel ? 'Route Map' : `Next: Level ${levelNumber + 1}`}
            onPlayAgain={isLastLevel ? onOpenMap : () => onPlayLevel(levelNumber + 1)}
            secondaryLabel={isLastLevel ? 'Play Again' : 'Route Map'}
            onSecondary={isLastLevel ? restart : onOpenMap}
          />
      </Popup>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 16,
    backgroundColor: palette.sky,
  },
  topBar: {
    width: '100%',
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mapButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  levelBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    color: palette.lockedText,
  },
  header: {
    alignItems: 'center',
    marginBottom: 6,
  },
  chapterName: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  levelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.title,
    marginTop: 2,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 340,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.title,
    marginHorizontal: 14,
  },
  boardFrame: {
    padding: FRAME_PADDING,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    flex: 1,
    borderRadius: 10,
  },
  // Hint highlight drawn over the tile, so the tile itself never changes.
  hintRing: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderRadius: 12,
    borderColor: palette.hint,
  },
  idaLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  arm: {
    position: 'absolute',
  },
  spinMark: {
    position: 'absolute',
    top: 1,
    right: 3,
    color: palette.spinPath,
    fontWeight: 'bold',
  },
  goal: {
    position: 'absolute',
    backgroundColor: palette.goal,
    borderWidth: 3,
    borderColor: colors.white,
  },
  goalLit: {
    elevation: 8,
    shadowColor: palette.goal,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  ida: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  message: {
    width: '100%',
    maxWidth: 360,
    marginTop: 10,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24, // WinCard has its own top margin; balance it
    backgroundColor: 'rgba(40, 25, 35, 0.55)',
  },
});

export default LevelPlay;
