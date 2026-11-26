import React, { useState, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import ChunkyButton from './ChunkyButton';
import LevelPicker, { type LevelOption } from './LevelPicker';
import { colors, radius, shade } from '../theme';
import {
  type PuzzleProgress,
  isUnlocked,
  nextPuzzle,
  resultFor,
  solvedCount,
  starCount,
} from '../lib/puzzleProgress';
import { HelpButton } from './HowToPlay';

type PuzzleListProps = {
  levels: Omit<LevelOption, 'detail'>[];
  level: number;
  onLevel: (level: number) => void;
  count: number; // puzzles per level
  progress: PuzzleProgress;
  accent: string;
  title: string; // summary heading, e.g. "🦊 Easy · 9×9"
  onPlay: (puzzle: number) => void;
  // Optional picture inside an unlocked tile (Jigsaw shows the puzzle's image).
  renderThumb?: (puzzle: number, size: number) => ReactNode;
};

const starText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(3 - stars);

const GAP = 8;
const LABEL = 18; // room under a thumbnail for its label
const PAD_TOP = 12;
const PAD_BOTTOM = 14;
const GRID_TOP = 12;
const HINT = 30; // the hint line under the grid

/**
 * How many columns and how big the tiles are. If every tile can fit on the
 * screen (big enough to tap), pick the column count that makes them
 * biggest; otherwise fall back to the usual columns and let the list scroll.
 */
const layoutTiles = (count: number, width: number, gridHeight: number, thumbs: boolean) => {
  const defaultCols = thumbs ? 4 : 5;
  const widthFor = (cols: number) => Math.floor((width - GAP * (cols - 1)) / cols);
  const fallback = { cols: defaultCols, size: widthFor(defaultCols) };
  if (gridHeight <= 0) return fallback;
  let best = { cols: defaultCols, size: 0 };
  for (let cols = defaultCols; cols <= 8; cols++) {
    const rows = Math.ceil(count / cols);
    const tallest = Math.floor((gridHeight - GAP * (rows - 1)) / rows) - (thumbs ? LABEL : 0);
    const size = Math.min(widthFor(cols), tallest);
    if (size > best.size) best = { cols, size };
  }
  return best.size >= (thumbs ? 44 : 40) ? best : fallback;
};

// Difficulty buttons, a progress card and a grid of numbered puzzle tiles:
// solved (with stars), next, open, or locked.
const PuzzleList = ({
  levels,
  level,
  onLevel,
  count,
  progress,
  accent,
  title,
  onPlay,
  renderThumb,
}: PuzzleListProps) => {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 24, 460);
  const [viewHeight, setViewHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(0);

  const gridHeight =
    viewHeight && topHeight ? viewHeight - PAD_TOP - topHeight - GRID_TOP - HINT - PAD_BOTTOM : 0;
  const { size } = layoutTiles(count, contentWidth, gridHeight, Boolean(renderThumb));

  const solved = solvedCount(progress, level, count);
  const stars = starCount(progress, level, count);
  const next = nextPuzzle(progress, level, count);
  const allDone = solved >= count;

  const options = levels.map((l) => ({
    ...l,
    detail: `${solvedCount(progress, l.level, count)}/${count}`,
  }));

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.top} onLayout={(e) => setTopHeight(e.nativeEvent.layout.height)}>
        <View style={{ width: contentWidth }}>
          <LevelPicker options={options} value={level} onChange={onLevel} color={accent} />
        </View>

        <View style={[styles.summary, { width: contentWidth }]}>
          <Text style={styles.summaryTitle}>{title}</Text>
          <Text style={styles.summaryText}>
            {solved} of {count} solved · ⭐ {stars}/{count * 3}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: `${accent}22` }]}>
            <View
              style={[styles.progressFill, { width: `${(solved / count) * 100}%`, backgroundColor: accent }]}
            />
          </View>
          <View style={styles.summaryButtons}>
            <ChunkyButton
              label={allDone ? '🏆 Play #1 again' : `▶ Play Puzzle ${next}`}
              onPress={() => onPlay(allDone ? 1 : next)}
              color={accent}
              size="sm"
            />
            <HelpButton />
          </View>
        </View>
      </View>

      <View style={[styles.tiles, { width: contentWidth, gap: GAP }]}>
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          const result = resultFor(progress, level, n);
          const open = isUnlocked(progress, level, n);
          const isNext = n === next && !allDone;
          const background = result ? accent : isNext ? colors.warning : open ? colors.white : '#E9E6F2';
          const light = Boolean(result || isNext);
          const small = size < 56;
          return (
            <Pressable
              key={n}
              disabled={!open}
              onPress={() => onPlay(n)}
              style={[
                styles.tile,
                {
                  width: size,
                  height: renderThumb ? size + LABEL : size,
                  backgroundColor: background,
                  borderBottomColor: light ? shade(background) : '#D9D4EA',
                  borderBottomWidth: small ? 4 : 5,
                },
              ]}
              accessibilityLabel={`Puzzle ${n}${result ? ', solved' : open ? '' : ', locked'}`}
            >
              {!open ? (
                <Text style={styles.tileLock}>🔒</Text>
              ) : renderThumb ? (
                <>
                  <View style={styles.thumb}>{renderThumb(n, size - (small ? 8 : 14))}</View>
                  <Text style={[styles.thumbLabel, small && styles.thumbLabelSmall, light && styles.textLight]}>
                    {result ? starText(result.stars) : isNext ? (small ? `▶ ${n}` : `#${n} NEXT`) : `#${n}`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tileNumber, light && styles.textLight]}>{n}</Text>
                  {result ? (
                    <Text style={styles.tileStars}>{starText(result.stars)}</Text>
                  ) : isNext ? (
                    <Text style={styles.tileNext}>NEXT</Text>
                  ) : null}
                </>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.listHint}>Solve a puzzle to unlock the next one.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM,
    backgroundColor: colors.background,
  },
  top: {
    alignItems: 'center',
  },
  summary: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 5,
    borderBottomColor: '#E6E1F5',
  },
  summaryTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  summaryText: {
    marginTop: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 10,
    marginTop: 8,
    borderRadius: radius.pill,
  },
  progressFill: {
    height: 10,
    borderRadius: radius.pill,
  },
  summaryButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: GRID_TOP,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tileNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  textLight: {
    color: colors.white,
  },
  tileStars: {
    fontSize: 12,
    color: '#FFE066',
    letterSpacing: 1,
  },
  tileNext: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  tileLock: {
    fontSize: 18,
    opacity: 0.6,
  },
  thumb: {
    borderRadius: radius.sm,
    overflow: 'hidden', // fixed: never change this view's border (Android clipping bug)
  },
  thumbLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  thumbLabelSmall: {
    marginTop: 2,
    fontSize: 10,
  },
  listHint: {
    marginTop: 10,
    height: HINT - 10,
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default PuzzleList;
