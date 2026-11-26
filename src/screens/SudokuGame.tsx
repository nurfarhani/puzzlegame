import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import PuzzleList from '../components/PuzzleList';
import WinCard from '../components/WinCard';
import { colors, gameStyles, radius } from '../theme';
import { PUZZLES_PER_LEVEL, SUDOKU_LEVELS, boxIndex, getSudoku } from '../lib/sudoku';
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
import { buzzLight, playSnap } from '../lib/sound';

const ACCENT = gameStyles.sudoku.color;
const STORAGE_KEY = 'sudoku.progress.v1';

// Each digit has its own colour, like the other games' tiles.
const DIGIT_COLORS = [
  '#FF6B6B', '#F59F00', '#E8A800', '#40C057', '#12B886',
  '#339AF0', '#7950F2', '#E64980', '#F76707',
];

const starsFor = (mistakes: number, hints: number) =>
  mistakes + hints === 0 ? 3 : mistakes + hints <= 3 ? 2 : 1;

type Playing = { level: number; puzzle: number };

// ---------------------------------------------------------------------------
// Sudoku: opens on the puzzle list for a level; tapping a puzzle plays it.

const SudokuGame = () => {
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

  const handleSolved = (p: Playing, stars: number, time: number) => {
    const next = withPuzzleResult(progress, p.level, p.puzzle, { stars, bestTime: time });
    setProgress(next);
    savePuzzleProgress(STORAGE_KEY, next);
  };

  if (playing) {
    return (
      <SudokuPlay
        key={`${playing.level}-${playing.puzzle}`}
        level={playing.level}
        puzzle={playing.puzzle}
        onSolved={(stars, time) => handleSolved(playing, stars, time)}
        onNext={() =>
          setPlaying({ level: playing.level, puzzle: Math.min(playing.puzzle + 1, PUZZLES_PER_LEVEL) })
        }
        onList={() => {
          setLevel(playing.level);
          setPlaying(null);
        }}
      />
    );
  }

  const info = SUDOKU_LEVELS[level - 1];
  return (
    <PuzzleList
      levels={SUDOKU_LEVELS.map((l) => ({ level: l.level, name: l.name, emoji: l.emoji }))}
      level={level}
      onLevel={setLevel}
      count={PUZZLES_PER_LEVEL}
      progress={progress}
      accent={ACCENT}
      title={`${info.emoji} ${info.name} · ${info.size}×${info.size}`}
      onPlay={(puzzle) => setPlaying({ level, puzzle })}
    />
  );
};

// ---------------------------------------------------------------------------
// Playing one numbered puzzle.

type SudokuPlayProps = {
  level: number;
  puzzle: number;
  onSolved: (stars: number, time: number) => void;
  onNext: () => void;
  onList: () => void;
};

const SudokuPlay = ({ level: levelNumber, puzzle: puzzleNumber, onSolved, onNext, onList }: SudokuPlayProps) => {
  const { width } = useWindowDimensions();
  const game = getSudoku(levelNumber, puzzleNumber);
  const [entries, setEntries] = useState<number[]>(() => [...game.puzzle]);
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [solved, setSolved] = useState(false);
  const [badge, recordWin] = useRecordPlay();

  const { size, boxRows, boxCols } = game.level;

  // Clock: ticks once a second until the puzzle is solved.
  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  const restart = () => {
    setEntries([...game.puzzle]);
    setSelected(null);
    setMistakes(0);
    setHints(0);
    setSeconds(0);
    setSolved(false);
  };

  const isGiven = (i: number) => game.puzzle[i] !== 0;
  const isCorrect = (i: number) => entries[i] === game.solution[i];
  // Givens and correct answers are locked; empty or wrong cells can change.
  const isLocked = (i: number) => isGiven(i) || isCorrect(i);

  const finishIfSolved = (next: number[], usedHints: number) => {
    if (!next.every((v, i) => v === game.solution[i])) return;
    setSolved(true);
    setSelected(null);
    onSolved(starsFor(mistakes, usedHints), seconds);
    recordWin({
      game: 'sudoku',
      won: true,
      level: levelNumber,
      puzzle: puzzleNumber,
      time: seconds,
      mistakes,
      hints: usedHints,
    });
  };

  const enterDigit = (digit: number) => {
    if (selected === null || solved || isLocked(selected)) return;
    const next = [...entries];
    next[selected] = digit;
    setEntries(next);
    if (digit !== game.solution[selected]) {
      setMistakes((m) => m + 1); // shown in red so the player can fix it
      buzzLight(); // a little "oops" bump, no happy sound
      return;
    }
    playSnap();
    finishIfSolved(next, hints);
  };

  const erase = () => {
    if (selected === null || solved || isLocked(selected)) return;
    const next = [...entries];
    next[selected] = 0;
    setEntries(next);
  };

  // Fill the selected cell if it needs it, otherwise a random empty one.
  const giveHint = () => {
    if (solved) return;
    const open = entries.map((_, i) => i).filter((i) => !isLocked(i));
    if (open.length === 0) return;
    const target =
      selected !== null && !isLocked(selected)
        ? selected
        : open[Math.floor(Math.random() * open.length)];
    const next = [...entries];
    next[target] = game.solution[target];
    const used = hints + 1;
    setEntries(next);
    setHints(used);
    setSelected(target);
    finishIfSolved(next, used);
  };

  // --- sizes ---------------------------------------------------------------
  const gridWidth = Math.min(width - 24, 440);
  const outer = 4; // frame around the grid
  const boxGap = 3; // thick line between boxes
  const cellGap = 2; // thin line between cells
  const boxesAcross = size / boxCols;
  const boxesDown = size / boxRows;
  const cellSize = Math.floor(
    (gridWidth - outer * 2 - boxGap * (boxesAcross - 1) - cellGap * (size - boxesAcross)) / size
  );
  const padGap = 6;
  const padSize = Math.min(64, Math.floor((gridWidth - padGap * (size - 1)) / size));

  // How many of each digit are correctly placed (to grey out finished ones).
  const placedCount = (digit: number) =>
    entries.filter((v, i) => v === digit && v === game.solution[i]).length;

  const selRow = selected === null ? -1 : Math.floor(selected / size);
  const selCol = selected === null ? -1 : selected % size;
  const selBox = selected === null ? -1 : boxIndex(game.level, selRow, selCol);
  const selValue = selected === null ? 0 : entries[selected];

  const renderCell = (i: number) => {
    const r = Math.floor(i / size);
    const c = i % size;
    const value = entries[i];
    const wrong = value !== 0 && !isCorrect(i);
    const isSel = i === selected;
    const related =
      selected !== null && (r === selRow || c === selCol || boxIndex(game.level, r, c) === selBox);
    const sameDigit = selValue !== 0 && value === selValue;

    let background = isGiven(i) ? '#EEF2FF' : colors.white;
    if (related) background = '#E3ECFF';
    if (sameDigit) background = '#C9DAFF';
    if (wrong) background = '#FFE3E3';
    if (isSel) background = '#FFE58F';

    return (
      <Pressable
        key={i}
        onPress={() => setSelected(i)}
        style={[styles.cell, { width: cellSize, height: cellSize, backgroundColor: background }]}
        accessibilityLabel={`Row ${r + 1} column ${c + 1}${value ? `, ${value}` : ', empty'}`}
      >
        {value !== 0 ? (
          <Text
            style={[
              styles.cellText,
              { fontSize: cellSize * 0.58 },
              isGiven(i)
                ? styles.givenText
                : { color: wrong ? colors.danger : DIGIT_COLORS[value - 1] },
            ]}
          >
            {value}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const info = game.level;
  const stars = starsFor(mistakes, hints);
  const hasNext = puzzleNumber < PUZZLES_PER_LEVEL;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.topRow, { width: gridWidth }]}>
        <Pressable onPress={onList} hitSlop={8} accessibilityLabel="Back to puzzle list">
          <Text style={styles.backLink}>‹ Puzzles</Text>
        </Pressable>
        <Text style={styles.puzzleTitle}>
          {info.emoji} {info.name} · #{puzzleNumber}
        </Text>
        <HelpButton small />
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>⏰</Text>
          <Text style={styles.statValue}>{formatSeconds(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Oops</Text>
          <Text style={[styles.statValue, mistakes > 0 && { color: colors.danger }]}>
            {mistakes}
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>💡</Text>
          <Text style={styles.statValue}>{hints}</Text>
        </View>
      </View>

      <Text style={styles.instructions}>
        Fill every row, column and box with 1 to {size}. No repeats!
      </Text>

      {/* Grid built from boxes, so the thicker box lines come from the gaps. */}
      <View style={[styles.grid, { padding: outer, gap: boxGap }]}>
        {Array.from({ length: boxesDown }, (_, br) => (
          <View key={br} style={[styles.boxRow, { gap: boxGap }]}>
            {Array.from({ length: boxesAcross }, (_, bc) => (
              <View key={bc} style={[styles.box, { gap: cellGap }]}>
                {Array.from({ length: boxRows }, (_, rr) => (
                  <View key={rr} style={[styles.cellRow, { gap: cellGap }]}>
                    {Array.from({ length: boxCols }, (_, cc) =>
                      renderCell((br * boxRows + rr) * size + bc * boxCols + cc)
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View style={[styles.pad, { width: gridWidth, gap: padGap }]}>
        {Array.from({ length: size }, (_, d) => {
          const digit = d + 1;
          const done = placedCount(digit) >= size;
          const color = DIGIT_COLORS[d];
          return (
            <Pressable
              key={digit}
              onPress={() => enterDigit(digit)}
              disabled={done}
              style={({ pressed }) => [
                styles.padButton,
                {
                  width: padSize,
                  height: Math.max(48, padSize),
                  borderColor: color,
                  backgroundColor: pressed ? color : colors.white,
                  opacity: done ? 0.3 : 1,
                },
              ]}
              accessibilityLabel={`Enter ${digit}`}
            >
              {({ pressed }) => (
                <Text style={[styles.padText, { color: pressed ? colors.white : color }]}>
                  {digit}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <ChunkyButton label="🧽 Erase" onPress={erase} color={colors.secondary} size="sm" />
        <ChunkyButton label="💡 Hint" onPress={giveHint} color={colors.warning} size="sm" />
        <ChunkyButton label="🔄 Restart" onPress={restart} color={ACCENT} size="sm" />
      </View>

      <Popup visible={solved}>
          <WinCard
            title="🎉 Sudoku solved!"
            subtitle={`${info.emoji} ${info.name} · Puzzle ${puzzleNumber} of ${PUZZLES_PER_LEVEL}`}
            stars={stars}
            stats={[
              { label: 'Time', value: formatSeconds(seconds) },
              { label: 'Oops', value: mistakes },
            ]}
            message={
              stars === 3
                ? 'No mistakes and no hints. Brilliant! 🌟'
                : `You used ${hints} ${hints === 1 ? 'hint' : 'hints'}. Great thinking!`
            }
            badge={badge}
            buttonLabel={hasNext ? `Next: Puzzle ${puzzleNumber + 1} ▶` : '🏆 Back to puzzles'}
            onPlayAgain={hasNext ? onNext : onList}
            secondaryLabel={hasNext ? '📋 Puzzle list' : '🔄 Play again'}
            onSecondary={hasNext ? onList : restart}
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
  // --- playing ---
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
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
  statRow: {
    flexDirection: 'row',
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
    color: ACCENT,
  },
  instructions: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    backgroundColor: ACCENT,
    borderRadius: radius.md,
  },
  boxRow: {
    flexDirection: 'row',
  },
  box: {
    backgroundColor: '#B9CCF8', // shows through the thin gaps between cells
    borderRadius: 6,
  },
  cellRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  cellText: {
    fontWeight: '700',
  },
  givenText: {
    color: colors.text,
  },
  pad: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  padButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 3,
  },
  padText: {
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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

export default SudokuGame;
