import React, { type ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { HelpButton } from './HowToPlay';
import { colors, radius } from '../theme';

// Small building blocks shared by the level-map games' play screens, so they
// all look alike: a top row, stat pills with a live star meter, and the text
// in a level's "start" popup on the map.

/** "‹ Map   Level 12   🌸 3/5   ?" */
export const PlayTop = ({
  levelNumber,
  accent,
  onMap,
  right,
  width,
}: {
  levelNumber: number;
  accent: string;
  onMap: () => void;
  right?: ReactNode;
  width: number;
}) => (
  <View style={[styles.topRow, { width }]}>
    <Pressable onPress={onMap} hitSlop={10} accessibilityLabel="Back to the map">
      <Text style={[styles.backLink, { color: accent }]}>‹ Map</Text>
    </Pressable>
    <Text style={styles.levelTitle}>Level {levelNumber}</Text>
    {right ? <Text style={styles.counter}>{right}</Text> : <View />}
    <HelpButton small />
  </View>
);

/** A row of white pills: label + big number, then the stars you'd get right now. */
export const StatPills = ({
  items,
  stars,
  accent,
}: {
  items: { label: string; value: string | number }[];
  stars: number;
  accent: string;
}) => (
  <View style={styles.statRow}>
    {items.map((item) => (
      <View key={item.label} style={styles.statPill}>
        <Text style={styles.statLabel}>{item.label}</Text>
        <Text style={[styles.statValue, { color: accent }]}>{item.value}</Text>
      </View>
    ))}
    <View style={styles.statPill}>
      <Text style={[styles.statLabel, styles.starsNow]}>{'★'.repeat(stars)}</Text>
      <Text style={[styles.statLabel, styles.starsGone]}>{'★'.repeat(3 - stars)}</Text>
    </View>
  </View>
);

/** The grey line under the stats, e.g. "⭐⭐⭐ if you finish in 12 taps". */
export const TargetLine = ({ children }: { children: ReactNode }) => (
  <Text style={styles.target}>{children}</Text>
);

/** Text for a level's start popup on the map. */
export const LevelInfoText = ({
  title,
  line,
  target,
  tip,
  accent,
}: {
  title: string;
  line: string;
  target: string;
  tip: string;
  accent: string;
}) => (
  <>
    <Text style={styles.infoTitle}>{title}</Text>
    <Text style={styles.infoLine}>{line}</Text>
    <Text style={[styles.infoTarget, { color: accent }]}>{target}</Text>
    <Text style={styles.infoTip}>{tip}</Text>
  </>
);

export const playStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: {
    fontSize: 17,
    fontWeight: '700',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  counter: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  starsNow: {
    fontSize: 18,
    color: '#FFC83D',
  },
  starsGone: {
    fontSize: 18,
    color: '#E0DBEA',
    marginLeft: -6,
  },
  target: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  infoLine: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  infoTarget: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  infoTip: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
