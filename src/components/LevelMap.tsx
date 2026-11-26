import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import ChunkyButton from './ChunkyButton';
import { colors, radius, shade } from '../theme';
import { currentProfile } from '../lib/profile';
import {
  type PuzzleProgress,
  isUnlocked,
  nextPuzzle,
  resultFor,
  starCount,
  solvedCount,
} from '../lib/puzzleProgress';
import { HelpButton } from './HowToPlay';
import { CloseButton, Popup } from './Popup';

// A level map like the ones in big puzzle games: one long winding road of
// numbered levels from the bottom up, split into themed worlds. Solved
// levels show their stars; the player's avatar waits on the next level.
// Progress is stored under level 1 of a PuzzleProgress (results[1][n]).

export type MapWorld = { name: string; emoji: string; color: string };

type LevelMapProps = {
  count: number;
  perWorld: number;
  worlds: MapWorld[];
  progress: PuzzleProgress;
  accent: string;
  /** What the level is about, shown in the popup before playing. */
  renderInfo: (level: number) => ReactNode;
  onPlay: (level: number) => void;
};

const MAP = 1; // the PuzzleProgress "level" that holds the map's results
const SPACING = 88; // between levels, top to bottom
const LABEL = 64; // room for a world's name under its levels
const PAD_TOP = 30;
const PAD_BOTTOM = 20;
const NODE = 58;

const LevelMap = ({ count, perWorld, worlds, progress, accent, renderInfo, onPlay }: LevelMapProps) => {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const [chosen, setChosen] = useState<number | null>(null);

  const worldCount = Math.ceil(count / perWorld);
  const bandHeight = perWorld * SPACING + LABEL;
  const contentHeight = PAD_TOP + worldCount * bandHeight + PAD_BOTTOM;
  const current = nextPuzzle(progress, MAP, count);
  const stars = starCount(progress, MAP);
  const solved = solvedCount(progress, MAP);

  // Where each level sits: x weaves left and right, y climbs from the bottom.
  const spots = useMemo(() => {
    const amp = Math.min(width * 0.28, 140);
    return Array.from({ length: count }, (_, k) => {
      const w = Math.floor(k / perWorld);
      const i = k % perWorld;
      const bandTop = PAD_TOP + (worldCount - 1 - w) * bandHeight;
      return {
        x: width / 2 + amp * Math.sin(k * 0.8),
        y: bandTop + bandHeight - LABEL - (i + 0.5) * SPACING,
      };
    });
  }, [width, count, perWorld, worldCount, bandHeight]);

  // The road through every level, as one curvy line.
  const road = useMemo(
    () =>
      spots
        .map((p, k) => {
          if (k === 0) return `M ${p.x} ${p.y + SPACING}  L ${p.x} ${p.y}`;
          const prev = spots[k - 1];
          const mid = (prev.y - p.y) / 2;
          return `C ${prev.x} ${prev.y - mid} ${p.x} ${p.y + mid} ${p.x} ${p.y}`;
        })
        .join(' '),
    [spots]
  );

  // Open on the next level to play.
  const scrollToCurrent = () => {
    if (scrolled.current) return;
    scrolled.current = true;
    const spot = spots[current - 1];
    const y = Math.max(0, spot.y - height * 0.45);
    scrollRef.current?.scrollTo({ y, animated: false });
  };

  const chosenResult = chosen ? resultFor(progress, MAP, chosen) : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryText}>
            ⭐ {stars} / {count * 3}
          </Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryText}>
            🏁 {solved} / {count} levels
          </Text>
        </View>
        <ChunkyButton label={`▶ Level ${current}`} onPress={() => setChosen(current)} color={accent} size="sm" />
        <HelpButton small />
      </View>

      <ScrollView ref={scrollRef} onContentSizeChange={scrollToCurrent} showsVerticalScrollIndicator={false}>
        <View style={{ height: contentHeight }}>
          {/* Worlds, top (last) to bottom (first) */}
          {Array.from({ length: worldCount }, (_, k) => worldCount - 1 - k).map((w) => {
            const world = worlds[w % worlds.length];
            const top = PAD_TOP + (worldCount - 1 - w) * bandHeight;
            const first = w * perWorld + 1;
            const last = Math.min(count, first + perWorld - 1);
            let worldStars = 0;
            for (let n = first; n <= last; n++) worldStars += resultFor(progress, MAP, n)?.stars ?? 0;
            return (
              <View key={w} style={[styles.band, { top, height: bandHeight, backgroundColor: world.color }]}>
                {/* Big faint decorations down the sides */}
                {[0.12, 0.42, 0.72].map((f, d) => (
                  <Text
                    key={d}
                    style={[
                      styles.decor,
                      { top: bandHeight * f, [d % 2 === 0 ? 'left' : 'right']: 8 } as object,
                    ]}
                  >
                    {world.emoji}
                  </Text>
                ))}
                <View style={styles.worldLabel}>
                  <Text style={styles.worldName}>
                    {world.emoji} World {w + 1} · {world.name}
                  </Text>
                  <Text style={styles.worldStars}>
                    ⭐ {worldStars}/{(last - first + 1) * 3}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* The road (drawn in slices so no single drawing gets too tall) */}
          {Array.from({ length: worldCount }, (_, w) => {
            const top = PAD_TOP + (worldCount - 1 - w) * bandHeight;
            return (
              <Svg
                key={`road-${w}`}
                width={width}
                height={bandHeight}
                viewBox={`0 ${top} ${width} ${bandHeight}`}
                style={[styles.road, { top }]}
                pointerEvents="none"
              >
                <Path d={road} stroke="rgba(255,255,255,0.85)" strokeWidth={22} fill="none" strokeLinecap="round" />
                <Path
                  d={road}
                  stroke={accent}
                  strokeOpacity={0.35}
                  strokeWidth={5}
                  strokeDasharray="2 14"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            );
          })}

          {/* Levels */}
          {spots.map((spot, k) => {
            const n = k + 1;
            const result = resultFor(progress, MAP, n);
            const open = isUnlocked(progress, MAP, n);
            const isCurrent = n === current && !result;
            return (
              <MapNode
                key={n}
                n={n}
                x={spot.x}
                y={spot.y}
                stars={result?.stars}
                open={open}
                isCurrent={isCurrent}
                accent={accent}
                onPress={() => open && setChosen(n)}
              />
            );
          })}
        </View>
      </ScrollView>

      <Popup visible={chosen !== null} onClose={() => setChosen(null)}>
        {chosen !== null ? (
            <View style={styles.sheet}>
              <CloseButton onPress={() => setChosen(null)} />
              <View style={[styles.sheetBadge, { backgroundColor: accent, borderBottomColor: shade(accent) }]}>
                <Text style={styles.sheetBadgeText}>Level {chosen}</Text>
              </View>
              <View style={styles.sheetStars}>
                {[1, 2, 3].map((s) => (
                  <Text key={s} style={[styles.sheetStar, s > (chosenResult?.stars ?? 0) && styles.starEmpty]}>
                    ★
                  </Text>
                ))}
              </View>
              <View style={styles.sheetInfo}>{renderInfo(chosen)}</View>
              <ChunkyButton
                label="▶ Play!"
                onPress={() => {
                  const n = chosen;
                  setChosen(null);
                  onPlay(n);
                }}
                color={colors.success}
                size="lg"
                style={styles.sheetPlay}
              />
              <Pressable onPress={() => setChosen(null)} hitSlop={10} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>Not now</Text>
              </Pressable>
            </View>
          ) : null}
      </Popup>
    </View>
  );
};

// One level on the map: a round button with its number and stars.
const MapNode = React.memo(
  ({
    n,
    x,
    y,
    stars,
    open,
    isCurrent,
    accent,
    onPress,
  }: {
    n: number;
    x: number;
    y: number;
    stars?: number;
    open: boolean;
    isCurrent: boolean;
    accent: string;
    onPress: () => void;
  }) => {
    const size = isCurrent ? NODE + 10 : NODE;
    const fill = stars !== undefined ? accent : isCurrent ? colors.white : '#D9D4E7';
    return (
      <View style={[styles.node, { left: x - size / 2, top: y - size / 2, width: size }]}>
        {isCurrent ? <AvatarBubble accent={accent} /> : null}
        <Pressable onPress={onPress} disabled={!open} accessibilityLabel={`Level ${n}`}>
          {({ pressed }) => (
            <View
              style={[
                styles.nodeCircle,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: fill,
                  borderBottomColor: stars !== undefined ? shade(accent) : isCurrent ? accent : '#BDB7CF',
                  borderBottomWidth: pressed ? 2 : 6,
                  marginTop: pressed ? 4 : 0,
                },
                isCurrent && { borderWidth: 4, borderColor: accent },
              ]}
            >
              <Text
                style={[
                  styles.nodeNumber,
                  { color: stars !== undefined ? colors.white : isCurrent ? accent : '#9A94AF' },
                ]}
              >
                {open ? n : '🔒'}
              </Text>
            </View>
          )}
        </Pressable>
        {stars !== undefined ? (
          <View style={styles.nodeStars}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[styles.nodeStar, s > stars && styles.starEmpty]}>
                ★
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  }
);

// The player's avatar, bobbing above the level they're up to.
const AvatarBubble = ({ accent }: { accent: string }) => {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  return (
    <Animated.View style={[styles.avatar, { borderColor: accent, transform: [{ translateY: bob }] }]}>
      <Text style={styles.avatarEmoji}>{currentProfile().avatar}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryPill: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
    fontSize: 54,
    opacity: 0.35,
  },
  worldLabel: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  worldName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  worldStars: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  road: {
    position: 'absolute',
    left: 0,
  },
  node: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  nodeStars: {
    flexDirection: 'row',
    marginTop: -2,
  },
  nodeStar: {
    fontSize: 16,
    color: '#FFC83D',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 2,
  },
  starEmpty: {
    color: '#E8E4F2',
  },
  avatar: {
    position: 'absolute',
    top: -44,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  // --- start popup ---
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(45,42,74,0.55)',
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingTop: 34,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 6,
    borderBottomColor: '#E6E1F5',
  },
  sheetBadge: {
    position: 'absolute',
    top: -22,
    paddingVertical: 8,
    paddingHorizontal: 26,
    borderRadius: radius.pill,
    borderBottomWidth: 5,
  },
  sheetBadgeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  sheetStars: {
    flexDirection: 'row',
  },
  sheetStar: {
    fontSize: 40,
    color: '#FFC83D',
    marginHorizontal: 2,
  },
  sheetInfo: {
    width: '100%',
    marginTop: 8,
    alignItems: 'center',
  },
  sheetPlay: {
    marginTop: 18,
  },
  sheetClose: {
    marginTop: 12,
  },
  sheetCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

export default LevelMap;
