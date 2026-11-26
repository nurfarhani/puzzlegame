import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import LevelMap from '../components/LevelMap';
import WinCard from '../components/WinCard';
import { colors, gameStyles, radius, shade } from '../theme';
import { playPop } from '../lib/sound';
import {
  BONUS_PER_MOVE,
  FRUITS,
  FruitGame,
  LEVEL_COUNT,
  LEVELS_PER_WORLD,
  WORLDS,
  getFruitLevel,
  starsForScore,
  type Blast,
  type Cell,
  type FruitLevel,
  type Piece,
  type Step,
} from '../lib/fruitPop';
import {
  type PuzzleProgress,
  loadPuzzleProgress,
  savePuzzleProgress,
  withPuzzleResult,
} from '../lib/puzzleProgress';
import { withCommas } from '../lib/scores';
import { useRecordPlay } from '../lib/useRecordPlay';
import { HelpButton } from '../components/HowToPlay';
import { Popup } from '../components/Popup';
import { useBackHandler } from '../lib/useBackHandler';

const ACCENT = gameStyles.fruitpop.color;
const STORAGE_KEY = 'fruitpop.progress.v1';
const MAP = 1; // LevelMap keeps its results under level 1
const EXTRA_MOVES = 5;

const SWAP_MS = 150;
const POP_MS = 230;
const moveMs = (rows: number) => Math.min(90 + 45 * rows, 420);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const COMBO_WORDS = ['', '', 'Yummy!', 'Juicy!', 'Sweet!', 'Fruit-tastic!'];
const JELLY = ['transparent', 'rgba(255,105,180,0.35)', 'rgba(214,51,132,0.6)'];

// ---------------------------------------------------------------------------
// Fruit Pop: opens on the level map; tapping a level shows its goal, then plays it.

const FruitPopGame = () => {
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0); // bumps to restart the same level

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
      <FruitPlay
        key={`${playing}-${attempt}`}
        levelNumber={playing}
        hasNext={playing < LEVEL_COUNT}
        onWon={(stars, movesUsed) => {
          // bestTime holds the fewest moves used (smaller is better, like a time).
          const next = withPuzzleResult(progress, MAP, playing, { stars, bestTime: movesUsed });
          setProgress(next);
          savePuzzleProgress(STORAGE_KEY, next);
        }}
        onNext={() => setPlaying(Math.min(playing + 1, LEVEL_COUNT))}
        onRetry={() => setAttempt((a) => a + 1)}
        onMap={() => setPlaying(null)}
      />
    );
  }

  return (
    <LevelMap
      count={LEVEL_COUNT}
      perWorld={LEVELS_PER_WORLD}
      worlds={WORLDS}
      progress={progress}
      accent={ACCENT}
      renderInfo={(n) => <LevelInfo level={getFruitLevel(n)} />}
      onPlay={setPlaying}
    />
  );
};

// ---------------------------------------------------------------------------
// Goal pieces shared by the start popup and the play screen.

const goalTitle = (level: FruitLevel) =>
  level.goal.type === 'score'
    ? '🎯 Score the points!'
    : level.goal.type === 'collect'
      ? '🧺 Collect the fruits!'
      : level.goal.type === 'crates'
        ? '📦 Break all the crates!'
        : '🍮 Clear all the jelly!';

const JellySquare = ({ size }: { size: number }) => (
  <View style={[styles.jellySquare, { width: size, height: size, borderRadius: size * 0.28 }]} />
);

/** The goal as chips: what's still needed (or the full amount before playing). */
const GoalChips = ({
  level,
  collected,
  jellyLeft,
  cratesLeft,
  score,
  big,
}: {
  level: FruitLevel;
  collected?: number[];
  jellyLeft?: number;
  cratesLeft?: number;
  score?: number;
  big?: boolean;
}) => {
  const { goal } = level;
  const font = big ? 22 : 18;
  const chip = (key: string, icon: React.ReactNode, left: number) => (
    <View key={key} style={styles.goalChip}>
      {icon}
      {left <= 0 ? (
        <Text style={[styles.goalDone, { fontSize: font }]}>✓</Text>
      ) : (
        <Text style={[styles.goalCount, { fontSize: font }]}>{withCommas(left)}</Text>
      )}
    </View>
  );
  if (goal.type === 'score') {
    return <View style={styles.goalRow}>{chip('score', <Text style={{ fontSize: font }}>🎯</Text>, goal.target - (score ?? 0))}</View>;
  }
  if (goal.type === 'collect') {
    return (
      <View style={styles.goalRow}>
        {goal.items.map((it) =>
          chip(
            `k${it.kind}`,
            <Text style={{ fontSize: font + 2 }}>{FRUITS[it.kind].emoji}</Text>,
            it.count - (collected?.[it.kind] ?? 0)
          )
        )}
      </View>
    );
  }
  if (goal.type === 'crates') {
    const all = level.crates.reduce((s, c) => s + c, 0);
    return (
      <View style={styles.goalRow}>
        {chip('crates', <CrateBox size={font + 4} hits={1} />, cratesLeft ?? all)}
      </View>
    );
  }
  const total = level.jelly.reduce((s, j) => s + j, 0);
  return <View style={styles.goalRow}>{chip('jelly', <JellySquare size={font} />, jellyLeft ?? total)}</View>;
};

const LevelInfo = ({ level }: { level: FruitLevel }) => (
  <>
    <Text style={styles.infoTitle}>{goalTitle(level)}</Text>
    <View style={styles.infoGoals}>
      <GoalChips level={level} big />
    </View>
    <Text style={styles.infoMoves}>in {level.moves} moves</Text>
    {level.crates.some((c) => c > 0) ? (
      <View style={styles.obstacleTip}>
        <CrateBox size={26} hits={Math.max(...level.crates)} />
        <Text style={styles.obstacleText}>
          Crates: make matches next to them to break them
          {level.crates.some((c) => c > 1) ? ' (dark ones need 2 hits)' : ''}.
        </Text>
      </View>
    ) : null}
    {level.ice.some(Boolean) ? (
      <View style={styles.obstacleTip}>
        <View style={{ width: 26, height: 26 }}>
          <IceCover cell={26} />
        </View>
        <Text style={styles.obstacleText}>Frozen fruits can't move. Match them to melt the ice.</Text>
      </View>
    ) : null}
    <Text style={styles.infoTip}>
      Swipe a fruit to swap it. Match 4 or 5 for special fruits! ↔️ 💥 🌈
    </Text>
  </>
);

// ---------------------------------------------------------------------------
// Playing one level.

type View_ = {
  board: Cell[];
  jelly: number[];
  crates: number[];
  ice: boolean[];
  hits: number[]; // crates knocked by the latest pop
  melted: number[]; // ice melted by the latest pop
  score: number;
  movesLeft: number;
  collected: number[];
  spawn: Record<number, number>;
  popped: { piece: Piece; index: number }[];
  blasts: Blast[];
  combo: number;
  tick: number; // bumps on every pop, so pop effects replay
  banner: string;
};

type Result =
  | { won: true; bonus: number; final: number; stars: number; movesLeft: number }
  | { won: false };

type FruitPlayProps = {
  levelNumber: number;
  hasNext: boolean;
  onWon: (stars: number, movesUsed: number) => void;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
};

const FruitPlay = ({ levelNumber, hasNext, onWon, onNext, onRetry, onMap }: FruitPlayProps) => {
  const { width, height } = useWindowDimensions();
  const level = getFruitLevel(levelNumber);
  const gameRef = useRef<FruitGame | null>(null);
  if (!gameRef.current) gameRef.current = new FruitGame(level);
  const game = gameRef.current;

  const [view, setView] = useState<View_>(() => ({
    board: [...game.board],
    jelly: [...game.jelly],
    crates: [...game.crates],
    ice: [...game.ice],
    hits: [],
    melted: [],
    score: 0,
    movesLeft: game.movesLeft,
    collected: [...game.collected],
    spawn: {},
    popped: [],
    blasts: [],
    combo: 0,
    tick: 0,
    banner: '',
  }));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false); // set at once, so two quick swipes can't overlap
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [usedExtra, setUsedExtra] = useState(false);
  const [badge, record] = useRecordPlay();
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );

  const { rows, cols } = level;
  const boardMax = Math.min(width - 24, height - 300, 480);
  const cell = Math.floor(Math.max(boardMax, 240) / cols);

  // After a few quiet seconds, wiggle a pair of fruits that can be swapped.
  useEffect(() => {
    if (busy || result) return;
    const timer = setTimeout(() => {
      const moves = game.findMoves();
      if (moves.length) setHint(moves[Math.floor(Math.random() * moves.length)]);
    }, 6000);
    return () => clearTimeout(timer);
  }, [busy, result, view.board, game]);

  const finishMove = () => {
    const status = game.status();
    if (status === 'won') {
      const bonus = game.movesLeft * BONUS_PER_MOVE;
      const final = game.score + bonus;
      const stars = starsForScore(level, final);
      onWon(stars, game.movesUsed);
      record({ game: 'fruitpop', won: true, level: levelNumber, score: final, stars, moves: game.movesUsed });
      setTimeout(() => alive.current && setResult({ won: true, bonus, final, stars, movesLeft: game.movesLeft }), 350);
    } else if (status === 'lost') {
      setTimeout(() => alive.current && setResult({ won: false }), 350);
    }
  };

  // Play the steps of a move one after another.
  const animate = async (steps: Step[], valid: boolean) => {
    busyRef.current = true;
    setBusy(true);
    setHint(null);
    setSelected(null);
    if (valid) setView((v) => ({ ...v, movesLeft: game.movesLeft }));
    for (const step of steps) {
      if (!alive.current) return;
      if (step.type === 'swap') {
        setView((v) => ({ ...v, board: step.board, spawn: {} }));
        await wait(SWAP_MS);
      } else if (step.type === 'clear') {
        // Celebrate each cleared cluster with a pop sound.
        if (step.popped && step.popped.length > 0) playPop();
        setView((v) => ({
          ...v,
          board: step.board,
          jelly: step.jelly,
          crates: step.crates,
          ice: step.ice,
          hits: step.hits,
          melted: step.melted,
          score: step.score,
          collected: step.collected,
          popped: step.popped,
          blasts: step.blasts,
          combo: step.combo,
          tick: v.tick + 1,
          banner: COMBO_WORDS[Math.min(step.combo, COMBO_WORDS.length - 1)],
        }));
        await wait(POP_MS);
      } else if (step.type === 'fall') {
        let far = 1;
        step.board.forEach((p, i) => {
          if (p && step.spawn[p.id] !== undefined) far = Math.max(far, Math.floor(i / cols) - step.spawn[p.id]);
        });
        setView((v) => ({ ...v, board: step.board, spawn: step.spawn, popped: [] }));
        await wait(moveMs(far) + 30);
      } else {
        setView((v) => ({ ...v, board: step.board, spawn: {}, tick: v.tick + 1, banner: '🔀 Shuffle!' }));
        await wait(600);
      }
    }
    if (!alive.current) return;
    setView((v) => ({ ...v, popped: [], blasts: [], hits: [], melted: [], movesLeft: game.movesLeft }));
    busyRef.current = false;
    setBusy(false);
    if (valid) finishMove();
  };

  const trySwap = (a: number, b: number) => {
    if (busyRef.current || result) return;
    const outcome = game.trySwap(a, b);
    if (outcome) animate(outcome.steps, outcome.valid);
  };

  const tap = (i: number) => {
    if (busy || result || !view.board[i] || view.ice[i]) return;
    setHint(null);
    if (selected === null || selected === i) setSelected(selected === i ? null : i);
    else if (game.adjacent(selected, i)) trySwap(selected, i);
    else setSelected(i);
  };

  // Touches: swipe a fruit towards a neighbour, or tap two fruits.
  const handlers = useRef({ trySwap, tap });
  handlers.current = { trySwap, tap };
  const touch = useRef<{ start: number | null; done: boolean }>({ start: null, done: false });
  const geometry = useRef({ cell, rows, cols });
  geometry.current = { cell, rows, cols };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const g = geometry.current;
        const c = Math.floor(e.nativeEvent.locationX / g.cell);
        const r = Math.floor(e.nativeEvent.locationY / g.cell);
        touch.current = {
          start: r >= 0 && r < g.rows && c >= 0 && c < g.cols ? r * g.cols + c : null,
          done: false,
        };
      },
      onPanResponderMove: (_, gesture) => {
        const t = touch.current;
        const g = geometry.current;
        if (t.done || t.start === null) return;
        const { dx, dy } = gesture;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < g.cell * 0.35) return;
        t.done = true;
        const r = Math.floor(t.start / g.cols);
        const c = t.start % g.cols;
        const [tr, tc] = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
        if (tr < 0 || tr >= g.rows || tc < 0 || tc >= g.cols) return;
        handlers.current.trySwap(t.start, tr * g.cols + tc);
      },
      onPanResponderRelease: () => {
        const t = touch.current;
        if (!t.done && t.start !== null) handlers.current.tap(t.start);
        touch.current = { start: null, done: true };
      },
    })
  ).current;

  const restartLevel = () => {
    if (game.status() === 'lost') {
      record({ game: 'fruitpop', won: false, level: levelNumber, score: game.score, stars: 0, moves: game.movesUsed });
    }
    onRetry();
  };
  const leaveLost = () => {
    record({ game: 'fruitpop', won: false, level: levelNumber, score: game.score, stars: 0, moves: game.movesUsed });
    onMap();
  };
  const addMoves = () => {
    game.addMoves(EXTRA_MOVES);
    setUsedExtra(true);
    setResult(null);
    setView((v) => ({ ...v, movesLeft: game.movesLeft }));
  };

  const boardW = cell * cols;
  const boardH = cell * rows;
  const topStar = level.stars[2];
  const fill = Math.min(1, view.score / topStar);

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { width: Math.max(boardW, 300) }]}>
        <Pressable onPress={onMap} hitSlop={10} accessibilityLabel="Back to the map">
          <Text style={styles.backLink}>‹ Map</Text>
        </Pressable>
        <Text style={styles.levelTitle}>Level {levelNumber}</Text>
        <HelpButton small />
        <Pressable onPress={restartLevel} hitSlop={10} accessibilityLabel="Restart level">
          <Text style={styles.backLink}>🔄</Text>
        </Pressable>
      </View>

      {/* Moves, goal and score */}
      <View style={[styles.panel, { width: Math.max(boardW, 300) }]}>
        <View style={[styles.movesBubble, view.movesLeft <= 3 && { backgroundColor: colors.danger }]}>
          <Text style={styles.movesNumber}>{view.movesLeft}</Text>
          <Text style={styles.movesLabel}>moves</Text>
        </View>
        <View style={styles.panelMiddle}>
          <GoalChips
            level={level}
            collected={view.collected}
            jellyLeft={view.jelly.reduce((s, j) => s + j, 0)}
            cratesLeft={view.crates.reduce((s, c) => s + c, 0)}
            score={view.score}
          />
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${fill * 100}%` }]} />
            {level.stars.map((s, k) =>
              s > 0 ? (
                <Text
                  key={k}
                  style={[
                    styles.scoreStar,
                    { left: `${Math.min(100, (s / topStar) * 100)}%` },
                    view.score >= s ? styles.scoreStarOn : null,
                  ]}
                >
                  ★
                </Text>
              ) : null
            )}
          </View>
          <Text style={styles.scoreText}>{withCommas(view.score)} points</Text>
        </View>
      </View>

      {/* The board */}
      <View style={[styles.frame, { width: boardW + 12, height: boardH + 12 }]}>
        <View style={{ width: boardW, height: boardH, overflow: 'hidden' }} {...responder.panHandlers}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {level.mask.map((open, i) =>
              open ? (
                <View
                  key={i}
                  style={[
                    styles.slot,
                    {
                      left: (i % cols) * cell,
                      top: Math.floor(i / cols) * cell,
                      width: cell,
                      height: cell,
                      backgroundColor: (Math.floor(i / cols) + (i % cols)) % 2 ? '#FFFFFF' : '#F4EEFF',
                    },
                  ]}
                >
                  {view.jelly[i] > 0 ? (
                    <View
                      style={[
                        styles.jelly,
                        { backgroundColor: JELLY[view.jelly[i]], borderRadius: cell * 0.22 },
                      ]}
                    />
                  ) : null}
                </View>
              ) : null
            )}
          </View>

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {view.board.map((piece, i) =>
              piece ? (
                <PieceView
                  key={piece.id}
                  piece={piece}
                  row={Math.floor(i / cols)}
                  col={i % cols}
                  cell={cell}
                  spawnRow={view.spawn[piece.id]}
                  selected={selected === i}
                  hinted={hint !== null && (hint[0] === i || hint[1] === i)}
                />
              ) : null
            )}
            {view.crates.map((hits, i) =>
              hits > 0 ? (
                <View key={`c${i}`} style={[styles.obstacle, cellBox(i, cols, cell)]}>
                  <CrateBox size={cell * 0.9} hits={hits} />
                </View>
              ) : null
            )}
            {view.ice.map((frozen, i) =>
              frozen ? (
                <View key={`i${i}`} style={[styles.obstacle, cellBox(i, cols, cell)]}>
                  <IceCover cell={cell} />
                </View>
              ) : null
            )}
            {view.hits.map((i) => (
              <Burst key={`${view.tick}-h${i}`} box={cellBox(i, cols, cell)}>
                <CrateBox size={cell * 0.9} hits={1} />
              </Burst>
            ))}
            {view.melted.map((i) => (
              <Burst key={`${view.tick}-m${i}`} box={cellBox(i, cols, cell)}>
                <IceCover cell={cell} />
              </Burst>
            ))}
            {view.popped.map(({ piece, index }) => (
              <Ghost
                key={`${view.tick}-${piece.id}`}
                piece={piece}
                row={Math.floor(index / cols)}
                col={index % cols}
                cell={cell}
              />
            ))}
            {view.blasts.map((blast, k) => (
              <BlastFlash key={`${view.tick}-b${k}`} blast={blast} cell={cell} rows={rows} cols={cols} />
            ))}
          </View>
        </View>
        {view.banner ? <Banner key={view.tick} text={view.banner} /> : null}
      </View>

      <Text style={styles.tip}>
        {result?.won
          ? '🎉 Level done! Tap ‹ Map to pick the next level.'
          : result
            ? '😮 Out of moves! Tap 🔄 to try again.'
            : selected !== null
              ? 'Now tap a fruit next to it'
              : 'Swipe a fruit to swap it with its neighbour'}
      </Text>

      <Popup visible={result !== null}>
          {result?.won ? (
            <WinCard
              title={`🎉 Level ${levelNumber} done!`}
              subtitle={goalTitle(level).replace('!', '') + ' ✓'}
              stars={result.stars}
              stats={[
                { label: 'Points', value: withCommas(result.final) },
                { label: 'Moves left', value: result.movesLeft },
              ]}
              message={
                result.bonus > 0
                  ? `+${withCommas(result.bonus)} bonus points for moves you didn't need!`
                  : 'Just in time! 😅'
              }
              badge={badge}
              buttonLabel={hasNext ? `Next: Level ${levelNumber + 1} ▶` : '🏆 Back to the map'}
              onPlayAgain={hasNext ? onNext : onMap}
              secondaryLabel={hasNext ? '🗺️ Map' : '🔄 Play again'}
              onSecondary={hasNext ? onMap : onRetry}
            />
          ) : result ? (
            <WinCard
              celebrate={false}
              title="😮 Out of moves!"
              subtitle={`Level ${levelNumber}`}
              stats={[{ label: 'Points', value: withCommas(view.score) }]}
              message={usedExtra ? 'So close! Have another go?' : `Want ${EXTRA_MOVES} more moves to finish?`}
              buttonLabel={usedExtra ? '🔄 Try again' : `➕ ${EXTRA_MOVES} more moves`}
              onPlayAgain={usedExtra ? restartLevel : addMoves}
              secondaryLabel={usedExtra ? '🗺️ Map' : '🔄 Start over'}
              onSecondary={usedExtra ? leaveLost : restartLevel}
            />
          ) : null}
      </Popup>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Board pieces

/** The look of one fruit (plain or special), filling a cell. */
const FruitFace = ({ piece, cell }: { piece: Piece; cell: number }) => {
  const inner = cell * 0.86;
  if (piece.special === 'rainbow') {
    return (
      <View style={[styles.face, styles.rainbow, { width: inner, height: inner, borderRadius: inner * 0.3 }]}>
        <Text style={{ fontSize: cell * 0.52 }}>🌈</Text>
      </View>
    );
  }
  const fruit = FRUITS[piece.kind];
  const strong = piece.special === 'bomb';
  return (
    <View
      style={[
        styles.face,
        {
          width: inner,
          height: inner,
          borderRadius: inner * 0.3,
          backgroundColor: strong ? fruit.color : fruit.bg,
          borderBottomColor: shade(strong ? fruit.color : fruit.bg, 0.12),
        },
      ]}
    >
      {piece.special === 'row' || piece.special === 'col' ? (
        <View style={[StyleSheet.absoluteFill, styles.stripes, piece.special === 'col' && styles.stripesCol]}>
          {[0, 1, 2].map((k) => (
            <View
              key={k}
              style={[
                { backgroundColor: fruit.color, opacity: 0.55, borderRadius: 2 },
                piece.special === 'row' ? { height: 3, width: '86%' } : { width: 3, height: '86%' },
              ]}
            />
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: cell * 0.5 }}>{fruit.emoji}</Text>
      {strong ? <Text style={[styles.bombMark, { fontSize: cell * 0.26 }]}>💥</Text> : null}
    </View>
  );
};

type PieceViewProps = {
  piece: Piece;
  row: number;
  col: number;
  cell: number;
  spawnRow?: number; // set when it drops in from above the board
  selected: boolean;
  hinted: boolean;
};

const PieceView = memo(({ piece, row, col, cell, spawnRow, selected, hinted }: PieceViewProps) => {
  const pos = useRef(new Animated.ValueXY({ x: col * cell, y: (spawnRow ?? row) * cell })).current;
  const last = useRef({ row: spawnRow ?? row, col });
  const grow = useRef(new Animated.Value(spawnRow === undefined ? 0.3 : 1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const scale = useRef(Animated.multiply(grow, pulse)).current;

  // New in place (start of level, or a special just made): pop in.
  useEffect(() => {
    Animated.spring(grow, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [grow]);

  // Slide to the cell whenever it changes.
  useEffect(() => {
    const distance = Math.max(Math.abs(row - last.current.row), Math.abs(col - last.current.col));
    last.current = { row, col };
    Animated.timing(pos, {
      toValue: { x: col * cell, y: row * cell },
      duration: distance === 0 ? 0 : moveMs(distance),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [row, col, cell, pos]);

  // Hint: a gentle throb.
  useEffect(() => {
    if (!hinted) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.14, duration: 320, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 320, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hinted, pulse]);

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: cell,
          height: cell,
          transform: [...pos.getTranslateTransform(), { scale }],
        },
      ]}
    >
      <FruitFace piece={piece} cell={cell} />
      {selected ? <View style={[styles.selectRing, { borderRadius: cell * 0.3 }]} /> : null}
    </Animated.View>
  );
});

const cellBox = (i: number, cols: number, cell: number) => ({
  left: (i % cols) * cell,
  top: Math.floor(i / cols) * cell,
  width: cell,
  height: cell,
});

/** A wooden crate. A two-hit crate is darker, with metal corners. */
const CrateBox = ({ size, hits }: { size: number; hits: number }) => {
  const tough = hits > 1;
  const plank = { height: Math.max(2, size * 0.08), backgroundColor: tough ? '#6B4226' : '#A9713F' };
  return (
    <View
      style={[
        styles.crate,
        {
          width: size,
          height: size,
          borderRadius: size * 0.16,
          borderWidth: Math.max(2, size * 0.08),
          backgroundColor: tough ? '#9C6B3F' : '#E0A96D',
          borderColor: tough ? '#5C3A1E' : '#9A6232',
        },
      ]}
    >
      <View style={plank} />
      <View style={plank} />
      {tough
        ? [styles.boltTL, styles.boltTR, styles.boltBL, styles.boltBR].map((corner, k) => (
            <View
              key={k}
              style={[styles.bolt, corner, { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08 }]}
            />
          ))
        : null}
    </View>
  );
};

/** Ice over a frozen fruit. */
const IceCover = ({ cell }: { cell: number }) => (
  <View style={[styles.ice, { borderRadius: cell * 0.26 }]}>
    <Text style={[styles.iceFlake, { fontSize: Math.max(9, cell * 0.24) }]}>❄️</Text>
  </View>
);

/** A crate knock or melting ice: puffs up and fades. */
const Burst = ({ box, children }: { box: object; children: React.ReactNode }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [t]);
  return (
    <Animated.View
      style={[
        styles.obstacle,
        box,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** A fruit that just popped: puffs up and fades away. */
const Ghost = ({ piece, row, col, cell }: { piece: Piece; row: number; col: number; cell: number }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: POP_MS, useNativeDriver: true }).start();
  }, [t]);
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: cell,
          height: cell,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateX: col * cell },
            { translateY: row * cell },
            { scale: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.25, 0.2] }) },
          ],
        },
      ]}
    >
      <FruitFace piece={piece} cell={cell} />
    </Animated.View>
  );
};

/** A flash across the row, column or square that a special fruit cleared. */
const BlastFlash = ({ blast, cell, rows, cols }: { blast: Blast; cell: number; rows: number; cols: number }) => {
  const t = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 0, duration: 380, useNativeDriver: true }).start();
  }, [t]);
  const r = Math.floor(blast.index / cols);
  const c = blast.index % cols;
  const box =
    blast.type === 'row'
      ? { left: 0, top: r * cell + cell * 0.25, width: cols * cell, height: cell * 0.5 }
      : blast.type === 'col'
        ? { left: c * cell + cell * 0.25, top: 0, width: cell * 0.5, height: rows * cell }
        : blast.type === 'bomb'
          ? { left: (c - 1) * cell, top: (r - 1) * cell, width: cell * 3, height: cell * 3 }
          : { left: 0, top: 0, width: cols * cell, height: rows * cell };
  return (
    <Animated.View
      style={[
        styles.flash,
        box,
        { opacity: t, borderRadius: blast.type === 'bomb' ? cell * 1.5 : cell * 0.25 },
        blast.type === 'rainbow' && { backgroundColor: 'rgba(255,236,153,0.7)' },
      ]}
    />
  );
};

/** "Juicy!" and friends: grows in over the board, then fades. */
const Banner = ({ text }: { text: string }) => {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(t, { toValue: 2, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [t]);
  return (
    <View style={styles.bannerWrap} pointerEvents="none">
      <Animated.Text
        style={[
          styles.banner,
          {
            opacity: t.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1, 1.15] }) }],
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

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
    backgroundColor: '#FFF0F6',
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
  // --- goal panel ---
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 4,
    borderBottomColor: '#F3D1E1',
  },
  movesBubble: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movesNumber: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.white,
  },
  movesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: -2,
  },
  panelMiddle: {
    flex: 1,
  },
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F6',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  goalCount: {
    fontWeight: '700',
    color: colors.text,
  },
  goalDone: {
    fontWeight: '700',
    color: colors.success,
  },
  jellySquare: {
    backgroundColor: 'rgba(214,51,132,0.6)',
    borderWidth: 2,
    borderColor: 'rgba(214,51,132,0.9)',
  },
  scoreBar: {
    height: 12,
    marginTop: 10,
    borderRadius: 6,
    backgroundColor: '#F1E9F7',
  },
  scoreFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.warning,
  },
  scoreStar: {
    position: 'absolute',
    top: -9,
    marginLeft: -11,
    fontSize: 22,
    color: '#DDD5EA',
  },
  scoreStarOn: {
    color: '#FFC83D',
  },
  scoreText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  // --- board ---
  frame: {
    padding: 6,
    borderRadius: radius.md + 4,
    backgroundColor: '#C9A7EB',
  },
  slot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jelly: {
    width: '88%',
    height: '88%',
  },
  piece: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
  },
  rainbow: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#FFC83D',
    borderBottomColor: '#F59F00',
  },
  stripes: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  stripesCol: {
    flexDirection: 'row',
  },
  bombMark: {
    position: 'absolute',
    right: -2,
    bottom: -4,
  },
  selectRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  obstacle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crate: {
    justifyContent: 'space-evenly',
    paddingHorizontal: '6%',
  },
  bolt: {
    position: 'absolute',
    backgroundColor: '#CED4DA',
  },
  boltTL: { top: 1, left: 1 },
  boltTR: { top: 1, right: 1 },
  boltBL: { bottom: 1, left: 1 },
  boltBR: { bottom: 1, right: 1 },
  ice: {
    width: '92%',
    height: '92%',
    backgroundColor: 'rgba(165,216,255,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  iceFlake: {
    position: 'absolute',
    top: 0,
    left: 2,
  },
  obstacleTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: '#FFF4E6',
    alignSelf: 'stretch',
  },
  obstacleText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  flash: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bannerWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    fontFamily: 'Fredoka_700Bold',
    fontSize: 40,
    color: colors.white,
    textShadowColor: ACCENT,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  tip: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // --- start popup ---
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  infoGoals: {
    marginTop: 12,
  },
  infoMoves: {
    marginTop: 10,
    fontSize: 16,
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

export default FruitPopGame;
