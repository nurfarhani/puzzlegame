import React, { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { Text } from './src/components/AppText';
import { colors, gameStyles, radius, shade, type GameId } from './src/theme';
import type { Profile } from './src/lib/profile';
import {
  accountStore,
  createAccount,
  findGoogleAccount,
  loadAccounts,
  randomAvatar,
  removeAccount,
  signInAs,
  signOut,
  uniqueName,
  updateAccount,
  type Account,
  type AccountStore,
} from './src/lib/accounts';
import { googleAvailable, signInWithGoogle, signOutOfGoogle } from './src/lib/google';
import { firstVisit } from './src/lib/howToPlay';
import HowToPlayCard, { HowToPlayContext } from './src/components/HowToPlay';
import { isSoundOn, loadSoundSetting, playTap, setSoundOn } from './src/lib/sound';
import { useBackHandler } from './src/lib/useBackHandler';

import SlidingPuzzle from './src/screens/SlidingPuzzle';
import WordSearchGame from './src/screens/WordSearchGame';
import NumberMatchGame from './src/screens/NumberMatchGame';
import MonumentValleyGame from './src/screens/MonumentValleyGame';
import SudokuGame from './src/screens/SudokuGame';
import JigsawGame from './src/screens/JigsawGame';
import FruitPopGame from './src/screens/FruitPopGame';
import PipesGame from './src/screens/PipesGame';
import MazeGame from './src/screens/MazeGame';
import LightsGame from './src/screens/LightsGame';
import FloodGame from './src/screens/FloodGame';
import PicrossGame from './src/screens/PicrossGame';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AccountsScreen from './src/screens/AccountsScreen';

type Game = {
  id: GameId;
  tagline: string;
  component: ComponentType;
};

const GAMES: Game[] = [
  { id: 'monumentvalley', tagline: '100 path puzzles', component: MonumentValleyGame },
  { id: 'sliding', tagline: 'Slide the numbers', component: SlidingPuzzle },
  { id: 'numbermatch', tagline: 'Find the pairs', component: NumberMatchGame },
  { id: 'wordsearch', tagline: 'Spot hidden words', component: WordSearchGame },
  { id: 'sudoku', tagline: 'Fill in the numbers', component: SudokuGame },
  { id: 'jigsaw', tagline: 'Build the picture', component: JigsawGame },
  { id: 'fruitpop', tagline: 'Match 3 fruits · 60 levels', component: FruitPopGame },
  { id: 'pipes', tagline: 'Water the flowers · 60 levels', component: PipesGame },
  { id: 'maze', tagline: 'Find the way · 60 mazes', component: MazeGame },
  { id: 'lights', tagline: 'Light every lamp · 60 levels', component: LightsGame },
  { id: 'flood', tagline: 'One colour · 60 levels', component: FloodGame },
  { id: 'picross', tagline: 'Secret pictures · 30 puzzles', component: PicrossGame },
];

type Screen =
  | { kind: 'home' }
  | { kind: 'game'; id: GameId }
  | { kind: 'leaderboard' }
  | { kind: 'profile' }
  | { kind: 'newPlayer' } // making a player (nobody signed in)
  | { kind: 'welcome' }; // a player just added with Google: pick a name and buddy

// A full screen with a coloured header bar and a round back button.
const Page = ({
  title,
  color,
  onBack,
  children,
}: {
  title: string;
  color: string;
  onBack: () => void;
  children: ReactNode;
}) => (
  <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
    <View style={[styles.gameHeader, { backgroundColor: color }]}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={10} accessibilityLabel="Back">
        <Text style={[styles.backArrow, { color }]}>‹</Text>
      </Pressable>
      <Text style={styles.gameTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
    <View style={styles.gameBody}>{children}</View>
  </SafeAreaView>
);

const App = () => {
  const { width } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  // undefined while the players are loading
  const [players, setPlayers] = useState<AccountStore | undefined>(undefined);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const profile = players && (players.accounts.find((a) => a.id === players.current) ?? null);
  const openGame = screen.kind === 'game' ? screen.id : null;
  const showHelp = useCallback(() => setHelp(true), []);
  const [sound, setSound] = useState(isSoundOn());

  // Phone back button: any screen goes back home; on home, Android leaves the app.
  // (Popups close themselves, and a game playing a puzzle goes back to its list first.)
  useBackHandler(() => {
    if (screen.kind === 'home') return false;
    setScreen({ kind: 'home' });
    return true;
  });

  /** Turns sound and buzzes on or off, and remembers the choice. */
  const toggleSound = () => {
    const next = !isSoundOn();
    void setSoundOn(next);
    setSound(next);
    if (next) playTap();
  };

  // The first time a game is opened, show how to play it.
  useEffect(() => {
    setHelp(false);
    if (!openGame) return;
    let active = true;
    firstVisit(openGame).then((first) => {
      if (active && first) setHelp(true);
    });
    return () => {
      active = false;
    };
  }, [openGame]);

  useEffect(() => {
    let active = true;
    loadAccounts().then((loaded) => {
      if (active) setPlayers(loaded);
    });
    loadSoundSetting().then(() => {
      if (active) setSound(isSoundOn());
    });
    return () => {
      active = false;
    };
  }, []);

  const goHome = () => setScreen({ kind: 'home' });
  const refresh = () => setPlayers(accountStore());

  const handleNewPlayer = async (next: Profile) => {
    await createAccount(next);
    refresh();
    goHome();
  };

  const handleSaveProfile = async (next: Profile) => {
    if (profile) await updateAccount(profile.id, next);
    refresh();
    goHome();
  };

  // Google sign-in from the "Who's playing?" screen. `expected` is the
  // player whose card was tapped; without it, a new Google account becomes
  // a new player.
  const handleGoogle = async (expected?: Account) => {
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    setGoogleBusy(false);
    if (!result.ok) {
      if (result.reason === 'unavailable') {
        Alert.alert('Google sign-in', 'Google sign-in works in the installed app, not in Expo Go.');
      } else if (result.reason === 'error') {
        Alert.alert('Google sign-in', result.message ?? 'Something went wrong. Please try again.');
      }
      return;
    }
    const { user } = result;
    const google = { id: user.id, email: user.email };
    const existing = findGoogleAccount(user.id);
    if (expected && existing?.id !== expected.id) {
      await signOutOfGoogle();
      Alert.alert('Oops, a different account', `${expected.name} uses another Google account. Please pick theirs.`);
      return;
    }
    if (existing) {
      await updateAccount(existing.id, { google });
      await signInAs(existing.id);
      refresh();
      goHome();
      return;
    }
    await createAccount({ name: uniqueName(user.name), avatar: randomAvatar() }, google);
    refresh();
    setScreen({ kind: 'welcome' });
  };

  const handlePick = async (account: Account) => {
    if (account.google) {
      await handleGoogle(account);
      return;
    }
    await signInAs(account.id);
    refresh();
    goHome();
  };

  const handleLogOut = async () => {
    if (profile?.google) await signOutOfGoogle();
    await signOut();
    refresh();
    goHome();
  };

  const handleRemove = async () => {
    if (!profile) return;
    if (profile.google) await signOutOfGoogle();
    await removeAccount(profile.id);
    refresh();
    goHome();
  };

  if (players === undefined || profile === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Nobody signed in (first launch, or after Log out).
  if (profile === null) {
    if (screen.kind === 'newPlayer') {
      return (
        <Page title="➕ New player" color={colors.secondary} onBack={goHome}>
          <ProfileScreen profile={null} welcome onSave={handleNewPlayer} />
        </Page>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <AccountsScreen
          accounts={players.accounts}
          googleReady={googleAvailable()}
          busy={googleBusy}
          onPick={handlePick}
          onNew={() => setScreen({ kind: 'newPlayer' })}
          onGoogle={() => handleGoogle()}
        />
      </SafeAreaView>
    );
  }

  if (screen.kind === 'welcome') {
    return (
      <Page title="👋 Welcome!" color={colors.secondary} onBack={goHome}>
        <ProfileScreen profile={profile} welcome onSave={handleSaveProfile} />
      </Page>
    );
  }

  if (screen.kind === 'game') {
    const game = GAMES.find((g) => g.id === screen.id) ?? GAMES[0];
    const CurrentGame = game.component;
    const look = gameStyles[game.id];
    return (
      <Page title={`${look.emoji} ${look.name}`} color={look.color} onBack={goHome}>
        <HowToPlayContext.Provider value={showHelp}>
          <CurrentGame />
        </HowToPlayContext.Provider>
        <HowToPlayCard game={game.id} visible={help} onClose={() => setHelp(false)} />
      </Page>
    );
  }

  if (screen.kind === 'leaderboard') {
    return (
      <Page title="🏆 Leaderboard" color={colors.warning} onBack={goHome}>
        <LeaderboardScreen
          playerName={profile.name}
          onPlay={(id) => setScreen({ kind: 'game', id })}
        />
      </Page>
    );
  }

  if (screen.kind === 'profile') {
    return (
      <Page title="😊 My Profile" color={colors.secondary} onBack={goHome}>
        <ProfileScreen
          profile={profile}
          onSave={handleSaveProfile}
          onLogOut={handleLogOut}
          onRemove={handleRemove}
        />
      </Page>
    );
  }

  // Home menu: profile chip and trophy button, then big colourful game
  // cards (two per row on most phones).
  const columns = width >= 360 ? 2 : 1;
  const cardWidth = (Math.min(width, 520) - 20 * 2 - 14 * (columns - 1)) / columns;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.menu}>
        <View style={[styles.topBar, { maxWidth: 520 }]}>
          <Pressable
            onPress={() => setScreen({ kind: 'profile' })}
            style={({ pressed }) => [styles.profileChip, pressed && styles.pressed]}
            accessibilityLabel="My profile"
          >
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarEmoji}>{profile.avatar}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileHello}>Hi there,</Text>
              <Text style={styles.profileName} numberOfLines={1}>
                {profile.name} ✏️
              </Text>
            </View>
          </Pressable>
          <View style={styles.topButtons}>
            <Pressable
              onPress={() => setScreen({ kind: 'leaderboard' })}
              style={({ pressed }) => [styles.trophyButton, pressed && styles.pressed]}
              accessibilityLabel="Leaderboard"
            >
              <Text style={styles.trophyEmoji}>🏆</Text>
            </Pressable>
            <Pressable
              onPress={toggleSound}
              style={({ pressed }) => [styles.logOutButton, pressed && styles.pressed]}
              accessibilityLabel={sound ? 'Turn sound off' : 'Turn sound on'}
            >
              <Text style={styles.logOutEmoji}>{sound ? '🔊' : '🔇'}</Text>
              <Text style={styles.logOutText}>{sound ? 'Sound' : 'Muted'}</Text>
            </Pressable>
            <Pressable
              onPress={handleLogOut}
              style={({ pressed }) => [styles.logOutButton, pressed && styles.pressed]}
              accessibilityLabel="Log out"
            >
              <Text style={styles.logOutEmoji}>🚪</Text>
              <Text style={styles.logOutText}>Log out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🧩✨</Text>
          <Text style={styles.heroTitle}>Puzzle Fun!</Text>
          <Text style={styles.heroSubtitle}>Pick a game and let's play</Text>
        </View>

        <View style={[styles.grid, { maxWidth: 520 }]}>
          {GAMES.map((game) => {
            const look = gameStyles[game.id];
            return (
              <Pressable
                key={game.id}
                onPress={() => setScreen({ kind: 'game', id: game.id })}
                style={{ width: cardWidth }}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: look.color,
                        borderBottomColor: shade(look.color),
                        borderBottomWidth: pressed ? 2 : 7,
                        marginTop: pressed ? 5 : 0,
                      },
                    ]}
                  >
                    <View style={styles.cardIcon}>
                      <Text style={styles.cardEmoji}>{look.emoji}</Text>
                    </View>
                    <Text style={styles.cardName}>{look.name}</Text>
                    <Text style={styles.cardTagline}>{game.tagline}</Text>
                    <View style={styles.cardPlay}>
                      <Text style={[styles.cardPlayText, { color: look.color }]}>Play ▶</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pressed: {
    opacity: 0.75,
  },
  // --- page header ---
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    marginTop: -3,
    marginLeft: -2,
  },
  gameTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  headerSpacer: {
    width: 42, // balances the back button so the title stays centred
  },
  gameBody: {
    flex: 1,
  },
  // --- home menu ---
  menu: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    gap: 12,
  },
  profileChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 16,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderBottomWidth: 4,
    borderBottomColor: '#E6E1F5',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarEmoji: {
    fontSize: 26,
  },
  profileText: {
    flexShrink: 1,
  },
  profileHello: {
    fontSize: 12,
    color: colors.textMuted,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  trophyButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.warning,
    borderBottomWidth: 5,
    borderBottomColor: shade(colors.warning),
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: {
    fontSize: 28,
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logOutButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
    borderBottomWidth: 4,
    borderBottomColor: '#E6E1F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logOutEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  logOutText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 22,
  },
  heroEmoji: {
    fontSize: 44,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 17,
    color: colors.textMuted,
    marginTop: 2,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    minHeight: 200,
  },
  cardIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardName: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  cardTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
  cardPlay: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  cardPlayText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

// Loads the rounded Fredoka font before showing anything, so text never
// flashes in the system font.
const Root = () => {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  return (
    <SafeAreaProvider>
      {fontsLoaded || fontError ? (
        <App />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaProvider>
  );
};

export default Root;
