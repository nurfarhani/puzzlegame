import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Text } from '../AppText';
import { colors } from '../../theme';
import { palette } from './palette';
import ChapterScene from './ChapterScene';
import ChunkyButton from '../ChunkyButton';
import {
  CHAPTERS,
  LEVELS_PER_CHAPTER,
  TOTAL_LEVELS,
  getLevel,
  type Chapter,
} from '../../lib/levelGenerator';
import {
  type Progress,
  completedCount,
  currentLevel,
  totalStars,
} from '../../lib/progress';
import { HelpButton } from '../HowToPlay';

type RouteMapProps = {
  progress: Progress;
  onPlay: (level: number) => void;
};

const NODE = 56; // diameter of a level circle
const CURRENT_NODE = 70; // the level you're on is drawn bigger
const ROW_HEIGHT = 92; // vertical space per level
const MAP_TOP = 48; // space above the first level in a chapter
const DOTS_BETWEEN = 3; // little trail dots joining two levels

const firstLevelOf = (chapter: Chapter) => (chapter.number - 1) * LEVELS_PER_CHAPTER + 1;

// The route map. A summary card on top, then one page per chapter that
// you swipe left and right between. Each page shows that chapter's 20
// levels on a winding trail: finished levels with their stars, the next
// level highlighted, later levels locked.
const RouteMap = ({ progress, onPlay }: RouteMapProps) => {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Chapter>>(null);
  const [pageHeight, setPageHeight] = useState(0);

  const done = completedCount(progress);
  const current = currentLevel(progress);
  const allDone = done >= TOTAL_LEVELS;
  const stars = totalStars(progress);
  const nextInfo = getLevel(current);
  const currentChapterIndex = nextInfo.chapter.number - 1;
  const [page, setPage] = useState(currentChapterIndex);

  const statusOf = (n: number) =>
    progress.results[n] ? 'done' : n === current && !allDone ? 'current' : 'locked';

  const handlePress = (n: number) => {
    if (statusOf(n) === 'locked') {
      Alert.alert('Locked', `Finish level ${current} to unlock the next one.`);
      return;
    }
    onPlay(n);
  };

  const goToPage = (index: number) => {
    const clamped = Math.max(0, Math.min(CHAPTERS.length - 1, index));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setPage(clamped);
  };

  const onSwipeEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const shownChapter = CHAPTERS[page];

  return (
    <View style={styles.container}>
      {/* Summary: how far you've come and what's next */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryValue}>
            {done}
            <Text style={styles.summaryOf}>/{TOTAL_LEVELS} levels</Text>
          </Text>
          <Text style={styles.summaryValue}>
            {stars}
            <Text style={styles.summaryOf}>/{TOTAL_LEVELS * 3} ★</Text>
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(done / TOTAL_LEVELS) * 100}%` }]} />
        </View>
        <HelpButton style={{ marginTop: 10 }} />
        {allDone ? (
          <Text style={styles.nextText}>
            🏆 All {TOTAL_LEVELS} levels done! Replay any level for more stars.
          </Text>
        ) : (
          <View style={styles.nextRow}>
            <View style={styles.nextInfo}>
              <Text style={styles.nextText} numberOfLines={1}>
                Next: <Text style={styles.nextStrong}>Level {current}</Text> · {nextInfo.name}
              </Text>
              <Text style={styles.nextChapter}>{nextInfo.chapter.name}</Text>
            </View>
            <ChunkyButton label="▶ Play" onPress={() => onPlay(current)} color={palette.litPath} />
          </View>
        )}
      </View>

      {/* Chapter switcher: arrows, name and one dot per chapter */}
      <View style={styles.switcher}>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => goToPage(page - 1)}
          disabled={page === 0}
        >
          <Text style={[styles.arrowText, page === 0 && styles.arrowDisabled]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.switcherMiddle}>
          <Text style={[styles.switcherKicker, { color: shownChapter.accent }]}>
            CHAPTER {shownChapter.number} OF {CHAPTERS.length}
          </Text>
          <Text style={styles.switcherName}>{shownChapter.name}</Text>
          <View style={styles.pageDots}>
            {CHAPTERS.map((chapter, i) => (
              <TouchableOpacity key={chapter.number} onPress={() => goToPage(i)} hitSlop={8}>
                <View
                  style={[
                    styles.pageDot,
                    i === page && { backgroundColor: chapter.accent, width: 22 },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => goToPage(page + 1)}
          disabled={page === CHAPTERS.length - 1}
        >
          <Text
            style={[styles.arrowText, page === CHAPTERS.length - 1 && styles.arrowDisabled]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* One swipeable page per chapter */}
      <View
        style={styles.pages}
        onLayout={(e: LayoutChangeEvent) => setPageHeight(e.nativeEvent.layout.height)}
      >
        {pageHeight > 0 && (
          <FlatList
            ref={listRef}
            data={CHAPTERS}
            keyExtractor={(chapter) => String(chapter.number)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentChapterIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={onSwipeEnd}
            renderItem={({ item }) => (
              <ChapterPage
                chapter={item}
                width={width}
                height={pageHeight}
                progress={progress}
                current={current}
                statusOf={statusOf}
                onPressLevel={handlePress}
              />
            )}
          />
        )}
      </View>
    </View>
  );
};

type ChapterPageProps = {
  chapter: Chapter;
  width: number;
  height: number;
  progress: Progress;
  current: number;
  statusOf: (n: number) => 'done' | 'current' | 'locked';
  onPressLevel: (n: number) => void;
};

// One chapter: its levels on a winding trail, scrolling up and down.
const ChapterPage = ({
  chapter,
  width,
  height,
  progress,
  current,
  statusOf,
  onPressLevel,
}: ChapterPageProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const mapWidth = Math.min(width - 32, 420);
  // How far the trail swings left and right; leaves room for the
  // "YOU ARE HERE" label at the edges.
  const swing = mapWidth / 2 - 62;
  const first = firstLevelOf(chapter);
  const levels = [...Array(LEVELS_PER_CHAPTER).keys()].map((i) => first + i);
  const chapterDone = levels.filter((n) => progress.results[n]).length;
  const unlocked = first <= current;

  const nodeCenter = (indexInChapter: number) => ({
    x: mapWidth / 2 + swing * Math.sin(indexInChapter * 0.8),
    y: MAP_TOP + indexInChapter * ROW_HEIGHT,
  });

  // If this chapter holds the current level, scroll it into view once.
  const onTrailLayout = (event: LayoutChangeEvent) => {
    if (scrolled.current) return;
    if (current < first || current >= first + LEVELS_PER_CHAPTER) return;
    scrolled.current = true;
    const nodeY = event.nativeEvent.layout.y + nodeCenter(current - first).y;
    const target = Math.max(0, nodeY - height / 2.5);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: target, animated: false }));
  };

  const renderNode = (n: number, indexInChapter: number) => {
    const status = statusOf(n);
    const size = status === 'current' ? CURRENT_NODE : NODE;
    const { x, y } = nodeCenter(indexInChapter);
    const result = progress.results[n];

    return (
      <View
        key={n}
        style={[styles.nodeWrap, { left: x - size / 2, top: y - size / 2, width: size }]}
      >
        {status === 'current' && (
          <View style={[styles.herePill, { backgroundColor: chapter.accent }]}>
            <Text style={styles.herePillText}>YOU ARE HERE</Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onPressLevel(n)}
          style={[
            styles.node,
            { width: size, height: size, borderRadius: size / 2 },
            status === 'done' && { backgroundColor: chapter.accent },
            status === 'current' && styles.nodeCurrent,
            status === 'locked' && styles.nodeLocked,
          ]}
        >
          <Text
            style={[
              styles.nodeText,
              status === 'current' && styles.nodeTextCurrent,
              status === 'locked' && styles.nodeTextLocked,
            ]}
          >
            {n}
          </Text>
          {status === 'locked' && <Text style={styles.lock}>🔒</Text>}
        </TouchableOpacity>
        {result && (
          <View style={styles.nodeStars}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[styles.nodeStar, s > result.stars && styles.nodeStarEmpty]}>
                ★
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Small dots along the trail between level n and level n + 1.
  const renderTrail = (n: number, indexInChapter: number) => {
    const a = nodeCenter(indexInChapter);
    const b = nodeCenter(indexInChapter + 1);
    const walked = !!progress.results[n];
    return [...Array(DOTS_BETWEEN).keys()].map((k) => {
      const f = (k + 1) / (DOTS_BETWEEN + 1);
      return (
        <View
          key={`${n}-${k}`}
          style={[
            styles.trailDot,
            {
              left: a.x + (b.x - a.x) * f - 4,
              top: a.y + (b.y - a.y) * f - 4,
              backgroundColor: walked ? chapter.accent : palette.locked,
            },
          ]}
        />
      );
    });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ width, height }}
      contentContainerStyle={styles.pageContent}
      nestedScrollEnabled
    >
      <View style={[styles.chapter, { backgroundColor: chapter.color, width: mapWidth }]}>
        <ChapterScene chapter={chapter.number} />
        <View style={styles.chapterHeader}>
          <Text style={[styles.chapterLevels, { color: chapter.accent }]}>
            LEVELS {first}–{first + LEVELS_PER_CHAPTER - 1}
          </Text>
          <Text style={[styles.chapterCount, { color: chapter.accent }]}>
            {unlocked ? `${chapterDone}/${LEVELS_PER_CHAPTER} done` : `🔒 Unlocks at level ${first}`}
          </Text>
        </View>
        <View
          onLayout={onTrailLayout}
          style={{ height: MAP_TOP * 2 + (LEVELS_PER_CHAPTER - 1) * ROW_HEIGHT }}
        >
          {levels.slice(0, -1).map((n, i) => renderTrail(n, i))}
          {levels.map((n, i) => renderNode(n, i))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.sky,
  },
  summary: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderBottomWidth: 5,
    borderBottomColor: '#EFE6DD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: palette.spinPath,
  },
  summaryOf: {
    fontSize: 14,
    color: palette.lockedText,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.locked,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.litPath,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  nextInfo: {
    flex: 1,
    marginRight: 10,
  },
  nextText: {
    fontSize: 14,
    color: colors.text,
  },
  nextStrong: {
    fontWeight: 'bold',
  },
  nextChapter: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 36,
    lineHeight: 40,
    color: palette.title,
  },
  arrowDisabled: {
    color: palette.locked,
  },
  switcherMiddle: {
    flex: 1,
    alignItems: 'center',
  },
  switcherKicker: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switcherName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: palette.title,
  },
  pageDots: {
    flexDirection: 'row',
    marginTop: 6,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: palette.locked,
  },
  pages: {
    flex: 1,
  },
  pageContent: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  chapter: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  chapterHeader: {
    height: 40,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  chapterLevels: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  chapterCount: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  trailDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  nodeCurrent: {
    backgroundColor: palette.goal,
    borderWidth: 4,
    borderColor: colors.white,
    elevation: 8,
  },
  nodeLocked: {
    backgroundColor: palette.locked,
    borderWidth: 2,
    borderColor: colors.white,
    elevation: 0,
    shadowOpacity: 0,
  },
  nodeText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  nodeTextCurrent: {
    fontSize: 24,
  },
  nodeTextLocked: {
    color: palette.lockedText,
    fontSize: 16,
  },
  lock: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 12,
  },
  nodeStars: {
    flexDirection: 'row',
    marginTop: 1,
  },
  nodeStar: {
    fontSize: 13,
    color: palette.star,
  },
  nodeStarEmpty: {
    color: palette.starEmpty,
  },
  herePill: {
    position: 'absolute',
    top: -24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    width: 110,
    alignItems: 'center',
  },
  herePillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default RouteMap;
