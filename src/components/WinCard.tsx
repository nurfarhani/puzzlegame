import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { colors, radius } from '../theme';
import ChunkyButton from './ChunkyButton';
import { CloseButton, usePopupClose } from './Popup';
import { celebrateWin, playSnap } from '../lib/sound';
import Confetti from './Confetti';

// When the first star pops in, and the gap before each next one (ms).
const FIRST_STAR = 350;
const STAR_GAP = 260;

export type WinStat = {
  label: string;
  value: string | number;
};

type WinCardProps = {
  title?: string;
  subtitle?: string;
  stats: WinStat[];
  message?: string;
  // Optional highlight such as "🏆 New top score!", shown in a gold pill.
  badge?: string;
  buttonLabel?: string;
  onPlayAgain: () => void;
  // Optional star rating out of 3, shown under the title.
  stars?: number;
  // Optional second, quieter button (for example "Route Map").
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Fanfare, confetti and popping stars. Turn off for cards that aren't a win, like "Out of moves". */
  celebrate?: boolean;
};

// End-of-game card: a title, a row of big numbers, a short message and a
// Play Again button.
const WinCard = ({
  title = '🎉 You won!',
  subtitle,
  stats,
  message,
  badge,
  buttonLabel = 'Play Again',
  onPlayAgain,
  stars,
  secondaryLabel,
  onSecondary,
  celebrate = true,
}: WinCardProps) => {
  const close = usePopupClose();
  const earned = stars ?? 0;
  // The card springs in, and each earned star starts small and pops up.
  const cardScale = useRef(new Animated.Value(celebrate ? 0.8 : 1)).current;
  const starScale = useRef([1, 2, 3].map((n) => new Animated.Value(celebrate && n <= earned ? 0 : 1))).current;

  // Celebrate the win once, when the card appears: fanfare, a success buzz,
  // then the stars pop in one by one, each with a "ding".
  useEffect(() => {
    if (!celebrate) return;
    celebrateWin();
    Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    const timers = starScale.slice(0, earned).map((scale, i) =>
      setTimeout(() => {
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
        playSnap();
      }, FIRST_STAR + i * STAR_GAP),
    );
    return () => timers.forEach(clearTimeout);
  }, [celebrate, earned, cardScale, starScale]);

  return (
  <>
  <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
    {close ? <CloseButton onPress={close} /> : null}
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {stars !== undefined ? (
      <View style={styles.starRow}>
        {[1, 2, 3].map((n) => (
          <Animated.View key={n} style={{ transform: [{ scale: starScale[n - 1] }] }}>
            <Text style={[styles.star, n > stars && styles.starEmpty]}>★</Text>
          </Animated.View>
        ))}
      </View>
    ) : null}

    <View style={styles.stats}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>

    {badge ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : null}

    {message ? <Text style={styles.message}>{message}</Text> : null}

    <ChunkyButton
      label={buttonLabel}
      onPress={onPlayAgain}
      color={colors.success}
      size="lg"
      style={styles.primaryButton}
    />

    {secondaryLabel && onSecondary ? (
      <ChunkyButton
        label={secondaryLabel}
        onPress={onSecondary}
        color={colors.white}
        textColor={colors.primary}
        size="sm"
        style={styles.secondaryButton}
      />
    ) : null}
  </Animated.View>
  {celebrate ? <Confetti /> : null}
  </>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 340,
    marginTop: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: '#E6E1F5',
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    paddingHorizontal: 30, // room for the ✕
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  star: {
    fontSize: 44,
    color: '#FFC83D',
    marginHorizontal: 2,
  },
  starEmpty: {
    color: '#E8E4F2',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  stat: {
    alignItems: 'center',
    minWidth: 92,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#F3F1FF',
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  badge: {
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: '#FFF3C4',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B37400',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
  },
  primaryButton: {
    marginTop: 18,
  },
  secondaryButton: {
    marginTop: 10,
  },
});

export default WinCard;
