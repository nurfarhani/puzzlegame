import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  ActivityIndicator,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import Svg, { Defs, ClipPath, FeGaussianBlur, Filter, G, Path, Rect } from 'react-native-svg';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import PuzzleList from '../components/PuzzleList';
import WinCard from '../components/WinCard';
import { PICTURES, pictureVariant, type Picture } from '../components/jigsaw/Pictures';
import { colors, gameStyles, radius } from '../theme';
import { playSnap } from '../lib/sound';
import {
  JIGSAW_LEVELS,
  PUZZLES_PER_LEVEL,
  TAB_PAD,
  jigsawPuzzle,
  makeEdges,
  pieceSides,
  piecePath,
  type JigsawLevel,
} from '../lib/jigsaw';
import {
  type PuzzleProgress,
  loadPuzzleProgress,
  savePuzzleProgress,
  withPuzzleResult,
} from '../lib/puzzleProgress';
import { seededRandom } from '../lib/random';
import { formatSeconds } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';
import { HelpButton } from '../components/HowToPlay';
import { Popup } from '../components/Popup';
import { useBackHandler } from '../lib/useBackHandler';

const ACCENT = gameStyles.jigsaw.color;
const STORAGE_KEY = 'jigsaw.progress.v1';

// A piece snaps into place when dropped this close (share of piece size).
const SNAP_DISTANCE = 0.3;

type Point = { x: number; y: number };
type Playing = { level: number; puzzle: number; round: number };

/** The picture (maybe mirrored) used by a numbered puzzle. */
const pictureOf = (level: number, puzzle: number): { picture: Picture; seed: number } => {
  const p = jigsawPuzzle(level, puzzle, PICTURES.length);
  return { picture: pictureVariant(p.pictureIndex, p.mirrored), seed: p.seed };
};

// ---------------------------------------------------------------------------
// Jigsaw: opens on the puzzle list for a level; tapping a puzzle plays it.

const JigsawGame = () => {
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
    const { picture, seed } = pictureOf(playing.level, playing.puzzle);
    const hasNext = playing.puzzle < PUZZLES_PER_LEVEL;
    return (
      <Board
        key={`${playing.level}-${playing.puzzle}-${playing.round}`}
        level={JIGSAW_LEVELS[playing.level - 1]}
        puzzle={playing.puzzle}
        picture={picture}
        seed={seed}
        hasNext={hasNext}
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

  const info = JIGSAW_LEVELS[level - 1];
  return (
    <PuzzleList
      levels={JIGSAW_LEVELS.map((l) => ({ level: l.level, name: l.name, emoji: l.emoji }))}
      level={level}
      onLevel={setLevel}
      count={PUZZLES_PER_LEVEL}
      progress={progress}
      accent={ACCENT}
      title={`${info.emoji} ${info.name} · ${info.grid * info.grid} pieces`}
      onPlay={(puzzle) => setPlaying({ level, puzzle, round: 0 })}
      renderThumb={(puzzle, size) => {
        const { picture } = pictureOf(level, puzzle);
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
// Board: the frame on top, loose pieces scattered in the tray below.

type BoardProps = {
  level: JigsawLevel;
  puzzle: number;
  picture: Picture;
  seed: number; // fixes the cut
  hasNext: boolean;
  onSolved: (stars: number, time: number) => void;
  onRestart: () => void;
  onNext: () => void;
  onList: () => void;
};

type Geometry = {
  areaWidth: number;
  areaHeight: number;
  boardSize: number;
  boardLeft: number;
  boardTop: number;
  piece: number; // side of a piece's square
  pad: number; // room for tabs around the square
  canvas: number; // full drawn size of a piece
};

const starsFor = (moves: number, total: number) =>
  moves <= total * 1.25 ? 3 : moves <= total * 2 ? 2 : 1;

const shuffle = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const Board = ({
  level,
  puzzle,
  picture,
  seed,
  hasNext,
  onSolved,
  onRestart,
  onNext,
  onList,
}: BoardProps) => {
  const grid = level.grid;
  const total = grid * grid;
  const edges = useMemo(() => makeEdges(grid, seededRandom(seed)), [grid, seed]);
  const allSides = useMemo(
    () =>
      Array.from({ length: total }, (_, i) =>
        pieceSides(edges, grid, Math.floor(i / grid), i % grid)
      ),
    [edges, grid, total]
  );

  const [geo, setGeo] = useState<Geometry | null>(null);
  const [placed, setPlaced] = useState<boolean[]>(() => new Array(total).fill(false));
  const [zOrder, setZOrder] = useState<number[]>(() => Array.from({ length: total }, (_, i) => i + 1));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [peek, setPeek] = useState(false);
  const [won, setWon] = useState(false);
  const [badge, recordWin] = useRecordPlay();
  const topZ = useRef(total + 1);

  const placedCount = placed.filter(Boolean).length;

  // Measure the play area once, then fix the board and piece sizes.
  const onLayout = (e: LayoutChangeEvent) => {
    if (geo) return;
    const { width, height } = e.nativeEvent.layout;
    const boardSize = Math.floor(Math.min(width - 8, height * 0.56) / grid) * grid;
    const piece = boardSize / grid;
    const pad = piece * TAB_PAD;
    setGeo({
      areaWidth: width,
      areaHeight: height,
      boardSize,
      boardLeft: (width - boardSize) / 2,
      boardTop: 4,
      piece,
      pad,
      canvas: piece + pad * 2,
    });
  };

  // Where each piece belongs, and where it starts in the tray.
  const targets = useMemo<Point[]>(() => {
    if (!geo) return [];
    return Array.from({ length: total }, (_, i) => ({
      x: geo.boardLeft + (i % grid) * geo.piece - geo.pad,
      y: geo.boardTop + Math.floor(i / grid) * geo.piece - geo.pad,
    }));
  }, [geo, grid, total]);

  const starts = useMemo<Point[]>(() => {
    if (!geo) return [];
    // Spread pieces over a loose grid in the tray, in random order, with a
    // little jitter so it looks like a tipped-out box.
    const trayTop = geo.boardTop + geo.boardSize + 8 - geo.pad;
    const minX = -geo.pad * 0.5;
    const maxX = geo.areaWidth - geo.canvas + geo.pad * 0.5;
    const maxY = Math.max(trayTop, geo.areaHeight - geo.canvas + geo.pad * 0.5);
    const trayW = maxX - minX;
    const trayH = maxY - trayTop;
    const cols = Math.max(1, Math.ceil(Math.sqrt((total * (trayW + 1)) / (trayH + 1))));
    const rows = Math.ceil(total / cols);
    const order = shuffle(Array.from({ length: total }, (_, i) => i));
    const out: Point[] = new Array(total);
    order.forEach((pieceIndex, slot) => {
      const c = slot % cols;
      const r = Math.floor(slot / cols);
      const jitter = () => (Math.random() - 0.5) * geo.piece * 0.3;
      const x = minX + (cols === 1 ? trayW / 2 : (trayW * c) / (cols - 1)) + jitter();
      const y = trayTop + (rows === 1 ? trayH / 2 : (trayH * r) / (rows - 1)) + jitter();
      out[pieceIndex] = {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(trayTop, y)),
      };
    });
    return out;
  }, [geo, total]);

  // Clock runs from the first layout until the picture is complete.
  useEffect(() => {
    if (!geo || won) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [geo, won]);

  // Latest values for the drag callbacks, which are created once.
  const live = useRef({ geo, targets, seconds, moves });
  live.current = { geo, targets, seconds, moves };

  const handleGrab = useCallback((id: number) => {
    topZ.current += 1;
    const z = topZ.current;
    setZOrder((prev) => prev.map((value, i) => (i === id ? z : value)));
  }, []);

  // Decide where a dropped piece goes: snapped home, or kept on screen.
  const handleDrop = useCallback((id: number, x: number, y: number) => {
    const { geo: g, targets: t } = live.current;
    setMoves((m) => m + 1);
    if (!g) return { x, y, snap: false };
    const target = t[id];
    const close = g.piece * SNAP_DISTANCE;
    if (Math.abs(x - target.x) < close && Math.abs(y - target.y) < close) {
      return { ...target, snap: true };
    }
    return {
      x: Math.min(g.areaWidth - g.canvas + g.pad, Math.max(-g.pad, x)),
      y: Math.min(g.areaHeight - g.canvas + g.pad, Math.max(-g.pad, y)),
      snap: false,
    };
  }, []);

  const handlePlaced = useCallback((id: number) => {
    playSnap();
    setPlaced((prev) => prev.map((value, i) => (i === id ? true : value)));
    setZOrder((prev) => prev.map((value, i) => (i === id ? 0 : value))); // sink under loose pieces
  }, []);

  // Every piece home: stop the clock, save the score, show the popup.
  useEffect(() => {
    if (placedCount < total || won) return;
    const { seconds: time, moves: finalMoves } = live.current;
    const timer = setTimeout(() => {
      setWon(true);
      onSolved(starsFor(finalMoves, total), time);
      recordWin({
        game: 'jigsaw',
        won: true,
        level: level.level,
        puzzle,
        time,
        moves: finalMoves,
        picture: picture.name,
        pieces: total,
      });
    }, 450); // let the last piece finish snapping
    return () => clearTimeout(timer);
    // onSolved is left out on purpose: it is a new function on every parent
    // render, and the win must fire only once.
  }, [placedCount, total, won, level.level, puzzle, picture.name, recordWin]);

  const stars = starsFor(moves, total);

  return (
    <View style={styles.boardScreen}>
      <View style={styles.topRow}>
        <Pressable onPress={onList} hitSlop={8} accessibilityLabel="Back to puzzle list">
          <Text style={styles.backLink}>‹ Puzzles</Text>
        </Pressable>
        <Text style={styles.puzzleTitle} numberOfLines={1}>
          {level.emoji} {level.name} · #{puzzle}
        </Text>
        <HelpButton small />
      </View>
      <View style={styles.toolbar}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>⏰</Text>
          <Text style={styles.statValue}>{formatSeconds(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>🧩</Text>
          <Text style={styles.statValue}>
            {placedCount}/{total}
          </Text>
        </View>
        <View style={styles.toolbarSpacer} />
        <ChunkyButton
          label={peek ? '🙈' : '👀'}
          onPress={() => setPeek((p) => !p)}
          color={peek ? colors.secondary : colors.warning}
          size="sm"
        />
        <ChunkyButton label="🔄 Restart" onPress={onRestart} color={colors.primary} size="sm" />
      </View>
      <Text style={styles.subtitle} numberOfLines={1}>
        {picture.emoji} {picture.name} · {total} pieces
      </Text>

      <View style={styles.area} onLayout={onLayout}>
        {geo ? (
          <>
            <BoardBackdrop
              geo={geo}
              grid={grid}
              edges={edges}
              picture={picture}
              peek={peek}
            />
            {Array.from({ length: total }, (_, i) => (
              <Piece
                key={i}
                id={i}
                row={Math.floor(i / grid)}
                col={i % grid}
                sides={allSides[i]}
                geo={geo}
                start={starts[i]}
                z={zOrder[i]}
                placed={placed[i]}
                picture={picture}
                onGrab={handleGrab}
                onDrop={handleDrop}
                onPlaced={handlePlaced}
              />
            ))}
          </>
        ) : null}
      </View>

      <Popup visible={won}>
          <WinCard
            title="🎉 Picture complete!"
            subtitle={`${level.emoji} ${level.name} · Puzzle ${puzzle} of ${PUZZLES_PER_LEVEL} · ${picture.name}`}
            stars={stars}
            stats={[
              { label: 'Time', value: formatSeconds(seconds) },
              { label: 'Moves', value: moves },
            ]}
            message={stars === 3 ? 'Super neat puzzling! 🌟' : 'Great job! Try fewer moves for 3 stars.'}
            badge={badge}
            buttonLabel={hasNext ? `Next: Puzzle ${puzzle + 1} ▶` : '🏆 Back to puzzles'}
            onPlayAgain={hasNext ? onNext : onList}
            secondaryLabel={hasNext ? '📋 Puzzle list' : '🔄 Play again'}
            onSecondary={hasNext ? onList : onRestart}
          />
      </Popup>
    </View>
  );
};

// How soft the hint picture behind the board is (blur radius / board size).
const BLUR = 0.018;

// The empty frame: piece outlines to aim for over a soft, blurry copy of the
// picture, so players can see what they are building. 👀 makes it sharp.
const BoardBackdrop = React.memo(
  ({
    geo,
    grid,
    edges,
    picture,
    peek,
  }: {
    geo: Geometry;
    grid: number;
    edges: ReturnType<typeof makeEdges>;
    picture: Picture;
    peek: boolean;
  }) => {
    const outlines = useMemo(
      () =>
        Array.from({ length: grid * grid }, (_, i) => {
          const r = Math.floor(i / grid);
          const c = i % grid;
          return piecePath(geo.piece, pieceSides(edges, grid, r, c), c * geo.piece, r * geo.piece);
        }),
      [geo.piece, grid, edges]
    );
    const Draw = picture.Draw;
    return (
      <View
        pointerEvents="none"
        style={[
          styles.frame,
          {
            left: geo.boardLeft - 4,
            top: geo.boardTop - 4,
            width: geo.boardSize + 8,
            height: geo.boardSize + 8,
          },
        ]}
      >
        <Svg width={geo.boardSize} height={geo.boardSize} style={styles.frameSvg}>
          <Defs>
            <Filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
              <FeGaussianBlur stdDeviation={geo.boardSize * BLUR} />
            </Filter>
          </Defs>
          <Rect x={0} y={0} width={geo.boardSize} height={geo.boardSize} fill="#F1FBF7" />
          {peek ? (
            <G opacity={0.55} transform={`scale(${geo.boardSize / 100})`}>
              <Draw />
            </G>
          ) : (
            // Drawn a little larger than the board so the blur's soft edges
            // fall outside it and the hint fills the frame.
            <G filter="url(#soft)" opacity={0.5}>
              <G transform={`translate(${-geo.boardSize * 0.04} ${-geo.boardSize * 0.04}) scale(${(geo.boardSize * 1.08) / 100})`}>
                <Draw />
              </G>
            </G>
          )}
          {outlines.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke="#B2E5D3" strokeWidth={1.2} strokeDasharray="4 3" />
          ))}
        </Svg>
      </View>
    );
  }
);

// ---------------------------------------------------------------------------
// One draggable piece.

type PieceProps = {
  id: number;
  row: number;
  col: number;
  sides: number[];
  geo: Geometry;
  start: Point;
  z: number;
  placed: boolean;
  picture: Picture;
  onGrab: (id: number) => void;
  onDrop: (id: number, x: number, y: number) => Point & { snap: boolean };
  onPlaced: (id: number) => void;
};

const Piece = React.memo((props: PieceProps) => {
  const { id, row, col, sides, geo, start, z, placed, picture } = props;
  const pos = useRef(new Animated.ValueXY(start)).current;
  const at = useRef<Point>(start); // resting position after each drop
  const live = useRef(props);
  live.current = props;

  const responder = useRef(
    (() => {
      const finish = (g: PanResponderGestureState) => {
        pos.flattenOffset();
        const p = live.current;
        const result = p.onDrop(p.id, at.current.x + g.dx, at.current.y + g.dy);
        at.current = { x: result.x, y: result.y };
        Animated.spring(pos, {
          toValue: { x: result.x, y: result.y },
          friction: 7,
          tension: 90,
          useNativeDriver: false,
        }).start();
        if (result.snap) p.onPlaced(p.id);
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => !live.current.placed,
        onMoveShouldSetPanResponder: () => !live.current.placed,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          pos.stopAnimation();
          pos.setOffset(at.current);
          pos.setValue({ x: 0, y: 0 });
          live.current.onGrab(live.current.id);
        },
        onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_e, g) => finish(g),
        onPanResponderTerminate: (_e, g) => finish(g),
      });
    })()
  ).current;

  // Grab area: the piece's square plus part of the tabs, so overlapping
  // pieces' see-through corners don't steal touches.
  const grab = geo.pad * 0.6;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.piece,
        {
          width: geo.canvas,
          height: geo.canvas,
          zIndex: z,
          transform: pos.getTranslateTransform(),
        },
      ]}
    >
      <PieceArt
        id={id}
        row={row}
        col={col}
        sides={sides}
        geo={geo}
        picture={picture}
        placed={placed}
      />
      {placed ? null : (
        <View
          {...responder.panHandlers}
          style={{
            position: 'absolute',
            left: grab,
            top: grab,
            width: geo.canvas - grab * 2,
            height: geo.canvas - grab * 2,
          }}
        />
      )}
    </Animated.View>
  );
});

// The picture clipped to the piece's jigsaw shape. Memoised so dragging
// one piece never redraws the others.
const PieceArt = React.memo(
  ({
    id,
    row,
    col,
    sides,
    geo,
    picture,
    placed,
  }: {
    id: number;
    row: number;
    col: number;
    sides: number[];
    geo: Geometry;
    picture: Picture;
    placed: boolean;
  }) => {
    const d = useMemo(() => piecePath(geo.piece, sides, geo.pad), [geo.piece, geo.pad, sides]);
    const clipId = `piece-${id}`;
    const Draw = picture.Draw;
    return (
      <Svg width={geo.canvas} height={geo.canvas} pointerEvents="none">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={d} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <G
            transform={`translate(${geo.pad - col * geo.piece} ${geo.pad - row * geo.piece}) scale(${
              geo.boardSize / 100
            })`}
          >
            <Draw />
          </G>
        </G>
        <Path
          d={d}
          fill="none"
          stroke={placed ? 'rgba(255,255,255,0.35)' : '#FFFFFF'}
          strokeWidth={placed ? 1 : 2}
        />
      </Svg>
    );
  },
  (a, b) => a.placed === b.placed && a.geo === b.geo && a.picture === b.picture && a.id === b.id
);

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  // --- board ---
  boardScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  puzzleTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  toolbarSpacer: {
    flex: 1,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: ACCENT,
  },
  subtitle: {
    marginTop: 6,
    paddingHorizontal: 16,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  area: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  frame: {
    position: 'absolute',
    padding: 4,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  frameSvg: {
    borderRadius: 8,
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
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

export default JigsawGame;
