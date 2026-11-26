import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import { colors, fonts, gameStyles, GAME_ORDER, radius, shade } from '../theme';
import {
  AVATARS,
  NAME_MAX_LENGTH,
  cleanName,
  randomGamerName,
  type Profile,
} from '../lib/profile';
import { nameTaken, type Account } from '../lib/accounts';
import { describe, loadScores, playerKey, type PlayerStats } from '../lib/scores';

type ProfileScreenProps = {
  profile: Account | null; // null for a brand-new player
  welcome?: boolean; // a new player: friendlier wording, no trophies yet
  onSave: (profile: Profile) => void;
  onLogOut?: () => void;
  onRemove?: () => void;
};

// Pick a gamer name and an animal avatar. For a player who already exists it
// also shows their trophies (games played, wins and best result per game)
// and how they log in, with Log out and Remove player.
const ProfileScreen = ({ profile, welcome = false, onSave, onLogOut, onRemove }: ProfileScreenProps) => {
  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [stats, setStats] = useState<PlayerStats | null>(null);

  // Trophies belong to the saved name, so they don't jump around while typing.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    loadScores().then((store) => {
      if (active) setStats(store.players[playerKey(profile.name)] ?? null);
    });
    return () => {
      active = false;
    };
  }, [profile]);

  const cleaned = cleanName(name);
  const changed = !profile || cleaned !== profile.name || avatar !== profile.avatar;
  const taken = cleaned.length >= 2 && nameTaken(cleaned, profile?.id);
  // A new player (even one pre-filled from Google) can always save.
  const canSave = cleaned.length >= 2 && (welcome || changed) && !taken;

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${profile?.name ?? 'this player'}?`,
      'Their stars, levels and trophies on this phone will be deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {welcome ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Welcome, gamer! 👋</Text>
            <Text style={styles.welcomeText}>
              Choose your name and buddy. They show up on the leaderboard.
            </Text>
          </View>
        ) : null}

        <View style={styles.bigAvatar}>
          <Text style={styles.bigAvatarEmoji}>{avatar}</Text>
        </View>
        <Text style={styles.previewName} numberOfLines={1}>
          {cleaned || 'Your name'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gamer name</Text>
          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Type a name"
              placeholderTextColor={colors.textMuted}
              maxLength={NAME_MAX_LENGTH}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="done"
              style={styles.input}
            />
            <Pressable
              onPress={() => setName(randomGamerName())}
              style={({ pressed }) => [styles.diceButton, pressed && styles.diceButtonPressed]}
              accessibilityLabel="Random name"
              hitSlop={6}
            >
              <Text style={styles.diceText}>🎲</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {cleaned.length < 2
              ? 'At least 2 letters. Tap 🎲 for a fun name!'
              : taken
                ? 'Another player on this phone has that name. Try another!'
                : `${cleaned.length}/${NAME_MAX_LENGTH} letters`}
          </Text>

          <Text style={[styles.sectionTitle, styles.sectionGap]}>Pick your buddy</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => {
              const active = emoji === avatar;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => setAvatar(emoji)}
                  style={[styles.avatarChoice, active && styles.avatarChoiceActive]}
                  accessibilityLabel={`Avatar ${emoji}`}
                >
                  <Text style={styles.avatarChoiceEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>

          <ChunkyButton
            label={welcome ? "Let's play! ▶" : changed ? '💾 Save' : '✓ Saved'}
            onPress={() => onSave({ name: cleaned, avatar })}
            color={colors.success}
            size="lg"
            disabled={!canSave}
            style={styles.saveButton}
          />
        </View>

        {!welcome && profile ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔑 Log in</Text>
            <View style={styles.loginRow}>
              <View style={[styles.loginIcon, profile.google && styles.loginIconGoogle]}>
                <Text style={profile.google ? styles.loginG : styles.loginEmoji}>
                  {profile.google ? 'G' : '📱'}
                </Text>
              </View>
              <View style={styles.trophyInfo}>
                <Text style={styles.trophyName}>
                  {profile.google ? 'Signed in with Google' : 'Player on this phone'}
                </Text>
                <Text style={styles.trophyBest} numberOfLines={1}>
                  {profile.google ? profile.google.email : 'Tap your buddy on the "Who\'s playing?" screen'}
                </Text>
              </View>
            </View>
            {onLogOut ? (
              <ChunkyButton
                label="🚪 Log out"
                onPress={onLogOut}
                color={colors.primary}
                style={styles.saveButton}
              />
            ) : null}
            <Text style={styles.trophyNote}>
              Log out to let someone else play. Your stars stay saved for next time.
            </Text>
            {onRemove ? (
              <Pressable onPress={confirmRemove} hitSlop={8} style={styles.removeButton}>
                <Text style={styles.removeText}>🗑️ Remove this player</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!welcome && profile ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🏆 My trophies</Text>
            {GAME_ORDER.map((id) => {
              const look = gameStyles[id];
              const plays = stats?.plays[id] ?? 0;
              const wins = stats?.wins[id] ?? 0;
              const best = stats?.best[id];
              return (
                <View key={id} style={styles.trophyRow}>
                  <View
                    style={[
                      styles.trophyIcon,
                      { backgroundColor: look.color, borderBottomColor: shade(look.color) },
                    ]}
                  >
                    <Text style={styles.trophyEmoji}>{look.emoji}</Text>
                  </View>
                  <View style={styles.trophyInfo}>
                    <Text style={styles.trophyName}>{look.name}</Text>
                    <Text style={styles.trophyBest} numberOfLines={1}>
                      {best ? `Best: ${describe(best)}` : 'Not played yet'}
                    </Text>
                  </View>
                  <View style={styles.trophyCount}>
                    <Text style={[styles.trophyCountValue, { color: look.color }]}>{wins}</Text>
                    <Text style={styles.trophyCountLabel}>
                      {plays === wins ? 'wins' : `won of ${plays}`}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text style={styles.trophyNote}>
              Trophies follow your gamer name. Scores you played under an older name stay with that
              name.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  welcome: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  bigAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.white,
    borderWidth: 5,
    borderColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatarEmoji: {
    fontSize: 62,
  },
  previewName: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    maxWidth: '90%',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    marginTop: 16,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 6,
    borderBottomColor: '#E6E1F5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionGap: {
    marginTop: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: '#E6E1F5',
    backgroundColor: '#F8F7FF',
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.text,
  },
  diceButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.warning,
    borderBottomWidth: 5,
    borderBottomColor: shade(colors.warning),
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceButtonPressed: {
    borderBottomWidth: 1,
    marginTop: 4,
    height: 48,
  },
  diceText: {
    fontSize: 26,
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  avatarChoice: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F1FF',
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChoiceActive: {
    backgroundColor: '#FFF3C4',
    borderColor: colors.warning,
  },
  avatarChoiceEmoji: {
    fontSize: 30,
  },
  saveButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  trophyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: {
    fontSize: 24,
  },
  trophyInfo: {
    flex: 1,
  },
  trophyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  trophyBest: {
    fontSize: 13,
    color: colors.textMuted,
  },
  trophyCount: {
    alignItems: 'center',
    minWidth: 52,
  },
  trophyCountValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  trophyCountLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  loginIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginIconGoogle: {
    backgroundColor: '#EEF3FE',
  },
  loginEmoji: {
    fontSize: 24,
  },
  loginG: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4285F4',
  },
  removeButton: {
    marginTop: 14,
    alignSelf: 'center',
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  trophyNote: {
    marginTop: 14,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default ProfileScreen;
