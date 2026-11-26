import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { colors, radius } from '../theme';
import type { Account } from '../lib/accounts';

type AccountsScreenProps = {
  accounts: Account[];
  googleReady: boolean; // false in Expo Go: the Google button is shown but off
  busy: boolean; // a Google sign-in is in progress
  onPick: (account: Account) => void;
  onNew: () => void;
  onGoogle: () => void;
};

const GAP = 12;

// "Who's playing?": every player on this phone, a New player card and a
// Sign in with Google button. Shown on first launch and after logging out.
const AccountsScreen = ({ accounts, googleReady, busy, onPick, onNew, onGoogle }: AccountsScreenProps) => {
  const { width } = useWindowDimensions();
  const inner = Math.min(width - 32, 460);
  const columns = inner >= 400 ? 4 : 3;
  const cardWidth = Math.floor((inner - GAP * (columns - 1)) / columns);
  const first = accounts.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heroEmoji}>{first ? '👋' : '🧩✨'}</Text>
      <Text style={styles.title}>{first ? 'Welcome, gamer!' : "Who's playing?"}</Text>
      <Text style={styles.subtitle}>
        {first ? 'Make a player to start, or sign in with Google.' : 'Tap your buddy to log in.'}
      </Text>

      <View style={[styles.grid, { width: inner }]}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => onPick(account)}
            disabled={busy}
            style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
            accessibilityLabel={`Log in as ${account.name}${account.google ? ', with Google' : ''}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{account.avatar}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {account.name}
            </Text>
            {account.google ? (
              <View style={styles.googleTag}>
                <Text style={styles.googleTagG}>G</Text>
                <Text style={styles.googleTagText}>Google</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
        <Pressable
          onPress={onNew}
          disabled={busy}
          style={({ pressed }) => [styles.card, styles.newCard, { width: cardWidth }, pressed && styles.pressed]}
          accessibilityLabel="New player"
        >
          <View style={[styles.avatar, styles.newAvatar]}>
            <Text style={styles.newPlus}>＋</Text>
          </View>
          <Text style={[styles.name, styles.newName]} numberOfLines={1}>
            New player
          </Text>
        </Pressable>
      </View>

      <View style={[styles.orRow, { width: inner }]}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <Pressable
        onPress={onGoogle}
        disabled={busy || !googleReady}
        style={({ pressed }) => [
          styles.googleButton,
          !googleReady && styles.googleButtonOff,
          pressed && styles.googleButtonPressed,
        ]}
        accessibilityLabel="Sign in with Google"
      >
        {busy ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <View style={styles.googleG}>
            <Text style={styles.googleGText}>G</Text>
          </View>
        )}
        <Text style={styles.googleLabel}>{busy ? 'Signing in…' : 'Sign in with Google'}</Text>
      </Pressable>
      <Text style={styles.note}>
        {googleReady
          ? 'Google only tells the app your name and email. Your stars stay on this phone.'
          : 'Google sign-in works in the installed app, not in Expo Go.'}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  heroEmoji: {
    fontSize: 44,
  },
  title: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: GAP,
    marginTop: 22,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderBottomWidth: 5,
    borderBottomColor: '#E6E1F5',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ translateY: 3 }],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 38,
  },
  name: {
    marginTop: 6,
    maxWidth: '100%',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  googleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: '#EEF3FE',
  },
  googleTagG: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleTagText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  newCard: {
    backgroundColor: '#F3F1FF',
    borderBottomColor: '#DCD7F5',
  },
  newAvatar: {
    backgroundColor: colors.white,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  newPlus: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
  },
  newName: {
    color: colors.primary,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
  },
  orLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E6E1F5',
  },
  orText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 22,
    minWidth: 250,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#DADCE0',
    borderBottomWidth: 5,
  },
  googleButtonOff: {
    opacity: 0.5,
  },
  googleButtonPressed: {
    borderBottomWidth: 2,
    marginTop: 21,
  },
  googleG: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF3FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  note: {
    marginTop: 10,
    maxWidth: 320,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default AccountsScreen;
