import React, { createContext, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './AppText';
import ChunkyButton from './ChunkyButton';
import { colors, gameStyles, radius, shade, type GameId } from '../theme';
import { HOW_TO_PLAY } from '../lib/howToPlay';
import TutorialPlayer from './tutorial/TutorialPlayer';
import { DEMOS } from './tutorial/demos';
import { CloseButton, Popup } from './Popup';

/** Opens the current game's how-to-play card (provided by App.tsx). */
export const HowToPlayContext = createContext<(() => void) | null>(null);

/**
 * The "❓ How to play" button that sits inside every game screen. The
 * `small` one is a compact "❓ Help" for tight top rows. Shows nothing
 * outside a game.
 */
export const HelpButton = ({ small, style }: { small?: boolean; style?: StyleProp<ViewStyle> }) => {
  const open = useContext(HowToPlayContext);
  if (!open) return null;
  return (
    <Pressable
      onPress={open}
      hitSlop={8}
      accessibilityLabel="How to play"
      style={({ pressed }) => [styles.help, small && styles.helpSmall, pressed && styles.helpPressed, style]}
    >
      <Text style={[styles.helpText, small && styles.helpTextSmall]}>{small ? '❓ Help' : '❓ How to play'}</Text>
    </Pressable>
  );
};

type HowToPlayProps = {
  game: GameId;
  visible: boolean;
  onClose: () => void;
};

// A popup card explaining a game: the goal, numbered steps and how stars work.
const HowToPlayCard = ({ game, visible, onClose }: HowToPlayProps) => {
  const { height } = useWindowDimensions();
  const look = gameStyles[game];
  const guide = HOW_TO_PLAY[game];
  return (
    <Popup visible={visible} onClose={onClose}>
        <View style={[styles.card, { maxHeight: height * 0.86 }]}>
          <View style={[styles.header, { backgroundColor: look.color, borderBottomColor: shade(look.color) }]}>
            <Text style={styles.headerEmoji}>{look.emoji}</Text>
            <View style={styles.headerText}>
              <Text style={styles.headerSmall}>How to play</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {look.name}
              </Text>
            </View>
            <CloseButton onPress={onClose} light style={styles.headerClose} />
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <TutorialPlayer demo={DEMOS[game]} accent={look.color} />

            <View style={styles.goal}>
              <Text style={styles.goalLabel}>🏁 Goal</Text>
              <Text style={styles.goalText}>{guide.goal}</Text>
            </View>

            {guide.steps.map((step, k) => (
              <View key={k} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: `${look.color}22` }]}>
                  <Text style={styles.stepEmoji}>{step.icon}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}

            <View style={styles.stars}>
              <Text style={styles.starsText}>{guide.stars}</Text>
            </View>
          </ScrollView>

          <ChunkyButton
            label="Got it! Let's play ▶"
            onPress={onClose}
            color={colors.success}
            size="md"
            style={styles.button}
          />
        </View>
    </Popup>
  );
};

const styles = StyleSheet.create({
  help: {
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#E6E1F5',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  helpSmall: {
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  helpPressed: {
    opacity: 0.7,
  },
  helpText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  helpTextSmall: {
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(45,42,74,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: '#E6E1F5',
    paddingBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 5,
  },
  headerClose: {
    top: 14,
    right: 14,
  },
  headerEmoji: {
    fontSize: 38,
  },
  headerText: {
    flexShrink: 1,
    paddingRight: 40, // room for the ✕
  },
  headerSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
  },
  goal: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B37400',
  },
  goalText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 22,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  stars: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: '#F3F1FF',
  },
  starsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
  },
});

export default HowToPlayCard;
