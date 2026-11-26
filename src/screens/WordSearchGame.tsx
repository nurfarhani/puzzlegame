import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  PanResponder,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import PuzzleList from '../components/PuzzleList';
import WinCard from '../components/WinCard';
import { colors, gameStyles, radius } from '../theme';
import {
  PUZZLES_PER_LEVEL,
  WORD_SEARCH_LEVELS,
  continuesLine,
  getWordSearch,
  sameCells,
  startsWithCells,
  themeFor,
} from '../lib/wordSearch';
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
import { buzzLight, playPop, playTap } from '../lib/sound';

const ACCENT = gameStyles.wordsearch.color;
const STORAGE_KEY = 'wordsearch.progress.v1';

// Each word gets a colour: its chip in the list and its letters once found.
const WORD_COLORS = ['#FFC9DE', '#C5E3FF', '#FFE3A3', '#B7F0CF', '#DCCBFF', '#FFD6B8'];

const starsFor = (hints: number) => (hints === 0 ? 3 : hints <= 2 ? 2 : 1);

type Cell = [number, number];

const TIP_LINE = '❌ Letters must touch in a line!';
const TIP_NOT_WORD = '❌ Not a word. Try again!';
type Playing = { level: number; puzzle: number; round: number };

// ---------------------------------------------------------------------------
// Word Search: opens on the puzzle list for a level; tapping a puzzle plays it.

const WordSearchGame = () => {
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
      <WordSearchPlay
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

  const info = WORD_SEARCH_LEVELS[level - 1];
  return (
    <PuzzleList
      levels={WORD_SEARCH_LEVELS.map((l) => ({ level: l.level, name: l.name, emoji: l.emoji }))}
      level={level}
      onLevel={setLevel}
      count={PUZZLES_PER_LEVEL}
      progress={progress}
      accent={ACCENT}
      title={`${info.emoji} ${info.name} · ${info.size}×${info.size} · ${info.words} words`}
      onPlay={(puzzle) => setPlaying({ level, puzzle, round: 0 })}
      renderThumb={(puzzle, size) => {
        const theme = themeFor(level, puzzle);
        return (
          <View style={[styles.themeThumb, { width: size, height: size * 0.62 }]}>
            <Text style={{ fontSize: size * 0.34 }}>{theme.emoji}</Text>
            <Text style={styles.themeThumbName} numberOfLines={1}>
              {theme.name}
            </Text>
          </View>
        );
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Playing one numbered puzzle.

type WordSearchPlayProps = {
  level: number;
  puzzle: number;
  onSolved: (stars: number, time: number) => void;
  onRestart: () => void;
  onNext: () => void;
  onList: () => void;
};

const WordSearchPlay = ({
  level: levelNumber,
  puzzle: puzzleNumber,
  onSolved,
  onRestart,
  onNext,
  onList,
}: WordSearchPlayProps) => {
  const { width } = useWindowDimensions();
  const game = getWordSearch(levelNumber, puzzleNumber);
  const { level: info, theme, grid, placements } = game;
  const size = info.size;
  const words = placements.map((p) => p.word);

  const [selected, setSelected] = useState<Cell[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [hints, setHints] = useState(0);
  const [hintCell, setHintCell] = useState<Cell | null>(null);
  const [tip, setTip] = useState<string | null>(null); // why the last try didn't count
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [badge, recordWin] = useRecordPlay();

  // Clock: ticks once a second until every word is found.
  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  // A "that didn't work" tip goes away after a moment.
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(null), 2200);
    return () => clearTimeout(timer);
  }, [tip]);

  // The hint glow fades after 3 seconds.
  useEffect(() => {
    if (!hintCell) return;
    const timer = setTimeout(() => setHintCell(null), 3000);
    return () => clearTimeout(timer);
  }, [hintCell]);

  // Which found word (by list index) colours each cell.
  const foundColor = new Map<string, string>();
  placements.forEach((p, i) => {
    if (!found.includes(p.word)) return;
    p.cells.forEach(([r, c]) => foundColor.set(`${r},${c}`, WORD_COLORS[i % WORD_COLORS.length]));
  });

  const lettersOf = (cells: Cell[]) => cells.map(([r, c]) => grid[r][c]).join('');

  const accept = (word: string) => {
    const nextFound = [...found, word];
    setFound(nextFound);
    playPop();
    buzzLight();
    setSelected([]);
    setHintCell(null);
    if (nextFound.length === words.length) {
      setSolved(true);
      onSolved(starsFor(hints), seconds);
      recordWin({
        game: 'wordsearch',
        won: true,
        level: levelNumber,
        puzzle: puzzleNumber,
        time: seconds,
        hints,
        found: words.length,
        total: words.length,
        theme: `${theme.emoji} ${theme.name}`,
        difficulty: `${info.emoji} ${info.name}`,
      });
    }
  };

  // The word still to find whose hidden cells are exactly these cells, tapped
  // from either end. Matching cells, not just letters, means the same letters
  // picked from other places in the grid don't count.
  const matchFor = (cells: Cell[]) =>
    placements.find(
      (p) => !found.includes(p.word) && (sameCells(cells, p.cells) || sameCells(cells, [...p.cells].reverse()))
    )?.word;

  // A tap on one letter: add it to the letters picked so far (`before`).
  const tapCell = (r: number, c: number, before: Cell[]) => {
    if (solved) return;
    const index = before.findIndex(([sr, sc]) => sr === r && sc === c);
    if (index >= 0) {
      // Tapping a picked letter takes it back, with any picked after it.
      setSelected(before.slice(0, index));
      return;
    }
    if (!continuesLine(before, [r, c])) {
      // Letters must touch, one after another in a straight line. Start a new
      // word from this letter instead.
      setTip(TIP_LINE);
      setSelected([[r, c]]);
      return;
    }
    const next: Cell[] = [...before, [r, c]];
    setSelected(next);
    setTip(null);

    // Accept a word as soon as it's spelled, unless a longer word still to
    // find starts on the same cells (e.g. BEE and BEETLE): then wait for ✓.
    const word = matchFor(next);
    const longer = placements.some(
      (p) =>
        !found.includes(p.word) &&
        p.word !== word &&
        (startsWithCells(p.cells, next) || startsWithCells([...p.cells].reverse(), next))
    );
    if (word && !longer) accept(word);
  };

  const check = () => {
    const word = matchFor(selected);
    if (word) accept(word);
    else setSelected([]); // not a word: start again
  };

  // A drag let go: the line under the finger is the guess. A drag that never
  // left its first letter is a tap.
  const endDrag = (line: Cell[]) => {
    if (solved || line.length === 0) return;
    if (line.length === 1) {
      tapCell(line[0][0], line[0][1], dragStartSelection.current);
      return;
    }
    const word = matchFor(line);
    if (word) {
      setTip(null);
      accept(word);
    } else {
      setTip(TIP_NOT_WORD);
      setSelected([]);
    }
  };

  // --- dragging --------------------------------------------------------------
  // The grid is one touch area (its letters don't take touches), so a finger
  // can slide across it. The selection is the straight line from the first
  // letter towards the finger, in whichever of the 8 directions is closest.
  const pitch = useRef(1); // cell size plus its margins, set during render
  const gridSize = useRef(size);
  gridSize.current = size;
  const dragOrigin = useRef({ x: 0, y: 0 }); // the grid's top-left on screen
  const dragStart = useRef<Cell | null>(null);
  const dragLine = useRef<Cell[]>([]);
  const dragStartSelection = useRef<Cell[]>([]); // what was picked before the drag
  const latest = useRef({ endDrag, solved });
  latest.current = { endDrag, solved };

  // (These two only use refs: the drag handlers below are made once.)
  const cellAt = (x: number, y: number): Cell => {
    const clamp = (v: number) => Math.min(gridSize.current - 1, Math.max(0, Math.floor(v / pitch.current)));
    return [clamp(y), clamp(x)];
  };

  const lineTo = (x: number, y: number): Cell[] => {
    const start = dragStart.current;
    if (!start) return [];
    const size = gridSize.current;
    const p = pitch.current;
    // From the middle of the first letter to the finger.
    const dx = x - (start[1] + 0.5) * p;
    const dy = y - (start[0] + 0.5) * p;
    const steps = Math.round(Math.max(Math.abs(dx), Math.abs(dy)) / p);
    if (steps === 0) return [start];
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const dr = Math.round(Math.sin(angle));
    const dc = Math.round(Math.cos(angle));
    const line: Cell[] = [start];
    for (let i = 1; i <= steps; i++) {
      const r = start[0] + dr * i;
      const c = start[1] + dc * i;
      if (r < 0 || c < 0 || r >= size || c >= size) break;
      line.push([r, c]);
    }
    return line;
  };

  const [dragging, setDragging] = useState(false);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.solved,
      onMoveShouldSetPanResponder: () => !latest.current.solved,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        playTap();
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        dragOrigin.current = { x: pageX - locationX, y: pageY - locationY };
        const cell = cellAt(locationX, locationY);
        dragStart.current = cell;
        dragLine.current = [cell];
        // Show the letter under the finger straight away: added to the
        // letters picked by tapping if it carries on their line, else alone.
        setSelected((now) => {
          dragStartSelection.current = now;
          if (now.some((n) => n[0] === cell[0] && n[1] === cell[1])) return now;
          return continuesLine(now, cell) ? [...now, cell] : [cell];
        });
        setDragging(true);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.pageX - dragOrigin.current.x;
        const y = e.nativeEvent.pageY - dragOrigin.current.y;
        const line = lineTo(x, y);
        const old = dragLine.current;
        if (sameCells(line, old)) return;
        dragLine.current = line;
        setSelected(line);
        setTip(null);
      },
      onPanResponderRelease: () => {
        setDragging(false);
        latest.current.endDrag(dragLine.current);
        dragStart.current = null;
        dragLine.current = [];
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        setSelected([]);
        dragStart.current = null;
        dragLine.current = [];
      },
    })
  ).current;

  // Light up the first letter of a word that hasn't been found yet.
  const giveHint = () => {
    const left = placements.filter((p) => !found.includes(p.word));
    if (left.length === 0 || solved) return;
    const pick = left[Math.floor(Math.random() * left.length)];
    setHintCell(pick.cells[0]);
    setHints((h) => h + 1);
  };

  // --- sizes ---------------------------------------------------------------
  // Grid fills the screen width with 15px either side.
  const gridWidth = width - 30;
  const cellSize = Math.floor((gridWidth - 16) / size) - 2;
  const fontSize = Math.min(cellSize * 0.58, 30);
  pitch.current = cellSize + 2; // each cell has a 1px margin all round

  const selectedLetters = lettersOf(selected);
  const stars = starsFor(hints);
  const hasNext = puzzleNumber < PUZZLES_PER_LEVEL;

  return (
    <ScrollView contentContainerStyle={styles.container} scrollEnabled={!dragging}>
      <View style={[styles.topRow, { width: gridWidth }]}>
        <Pressable onPress={onList} hitSlop={8} accessibilityLabel="Back to puzzle list">
          <Text style={styles.backLink}>‹ Puzzles</Text>
        </Pressable>
        <Text style={styles.puzzleTitle}>
          {info.emoji} {info.name} · #{puzzleNumber}
        </Text>
        <HelpButton small />
      </View>

      <View style={styles.themeBanner}>
        <Text style={styles.themeText}>
          {theme.emoji} {theme.name}
        </Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>⏰</Text>
          <Text style={styles.statValue}>{formatSeconds(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Found</Text>
          <Text style={styles.statValue}>
            {found.length}/{words.length}
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>💡</Text>
          <Text style={styles.statValue}>{hints}</Text>
        </View>
      </View>

      <View style={[styles.wordList, { width: gridWidth }]}>
        {words.map((word, i) => {
          const isFound = found.includes(word);
          return (
            <View
              key={word}
              style={[styles.wordChip, { backgroundColor: WORD_COLORS[i % WORD_COLORS.length] }]}
            >
              <Text style={[styles.word, isFound && styles.foundWord]}>
                {isFound ? '✓ ' : ''}
                {word}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.directions}>{info.directionHint}</Text>

      <View style={[styles.grid, { width: gridWidth }]}>
        <View pointerEvents="box-only" {...pan.panHandlers}>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((letter, c) => {
                const isSelected = selected.some(([sr, sc]) => sr === r && sc === c);
                const isHint = hintCell !== null && hintCell[0] === r && hintCell[1] === c;
                const color = foundColor.get(`${r},${c}`);
                return (
                  <View
                    key={c}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      color ? { backgroundColor: color } : null,
                      isHint && styles.hintCell,
                      isSelected && styles.selectedCell,
                    ]}
                  >
                    <Text
                      style={[styles.cellText, { fontSize }, isSelected && styles.selectedCellText]}
                    >
                      {letter}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.selectionBar, { width: gridWidth }]}>
        <Text style={[styles.selectionText, tip !== null && styles.oopsText]} numberOfLines={2}>
          {tip
            ? tip
            : selectedLetters
              ? selectedLetters.split('').join(' ')
              : 'Drag from the first letter to the last'}
        </Text>
        <View style={styles.selectionButtons}>
          <ChunkyButton
            label="✓ Check"
            onPress={check}
            color={colors.success}
            size="sm"
            disabled={selected.length < 2}
          />
          <ChunkyButton
            label="✖"
            onPress={() => setSelected([])}
            color={colors.danger}
            size="sm"
            disabled={selected.length === 0}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" />
        <ChunkyButton label="🔄 Restart" onPress={onRestart} color={ACCENT} size="sm" />
      </View>
      {hintCell ? <Text style={styles.hintText}>Look at the glowing letter! ✨</Text> : null}

      <Popup visible={solved}>
          <WinCard
            title="🎉 All words found!"
            subtitle={`${info.emoji} ${info.name} · Puzzle ${puzzleNumber} · ${theme.emoji} ${theme.name}`}
            stars={stars}
            stats={[
              { label: 'Time', value: formatSeconds(seconds) },
              { label: 'Hints', value: hints },
            ]}
            message={stars === 3 ? "No hints needed. You're a word wizard! 🧙" : 'Great finding! Try with fewer hints for 3 stars.'}
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
  themeThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeThumbName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
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
  themeBanner: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: ACCENT,
  },
  themeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
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
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  wordChip: {
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  word: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  foundWord: {
    color: '#1E9E57',
    textDecorationLine: 'line-through',
  },
  directions: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 13,
    color: colors.textMuted,
  },
  grid: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: '#E6E1F5',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F1FF',
    margin: 1,
    borderRadius: 6,
  },
  hintCell: {
    backgroundColor: '#FFE066',
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  cellText: {
    fontWeight: '600',
    color: colors.text,
  },
  selectedCellText: {
    color: colors.white,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  selectionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
  },
  oopsText: {
    fontSize: 14,
    color: colors.danger,
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  hintText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#C27C00',
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

export default WordSearchGame;
