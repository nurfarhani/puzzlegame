import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../components/AppText';
import ChunkyButton from '../components/ChunkyButton';
import { colors, gameStyles, GAME_ORDER, radius, shade, type GameId } from '../theme';
import {
  RANKING_RULE,
  TOP_LIMIT,
  clearScores,
  describe,
  headline,
  loadScores,
  playerKey,
  timeAgo,
  type PlayRecord,
  type ScoreStore,
} from '../lib/scores';

type LeaderboardScreenProps = {
  playerName: string; // the current gamer, highlighted in the lists
  onPlay: (game: GameId) => void;
};

type Tab = 'top' | 'history';

const MEDALS = ['🥇', '🥈', '🥉'];

// Two tabs: the top 10 for each game, and every recent play across games.
const LeaderboardScreen = ({ playerName, onPlay }: LeaderboardScreenProps) => {
  const [store, setStore] = useState<ScoreStore | null>(null);
  const [tab, setTab] = useState<Tab>('top');
  const [game, setGame] = useState<GameId>(GAME_ORDER[0]);

  useEffect(() => {
    let active = true;
    loadScores().then((loaded) => {
      if (active) setStore(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const me = playerKey(playerName);
  const now = Date.now();

  const confirmClear = () =>
    Alert.alert('Clear all scores?', 'This removes the leaderboard and history for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearScores().then(setStore) },
    ]);

  if (!store) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const look = gameStyles[game];
  const top = store.top[game] ?? [];

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        {(['top', 'history'] as Tab[]).map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t === 'top' ? '🏆 Top 10' : '📜 History'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {tab === 'top' ? (
          <>
            <View style={styles.gamePills}>
              {GAME_ORDER.map((id) => {
                const g = gameStyles[id];
                const active = id === game;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setGame(id)}
                    style={[
                      styles.gamePill,
                      active && { backgroundColor: g.color, borderColor: g.color },
                    ]}
                    accessibilityLabel={g.name}
                  >
                    <Text style={styles.gamePillEmoji}>{g.emoji}</Text>
                    <Text
                      style={[styles.gamePillText, active && styles.gamePillTextActive]}
                      numberOfLines={1}
                    >
                      {g.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.rule}>
              {look.emoji} {look.name} · {RANKING_RULE[game]}
            </Text>

            {top.length === 0 ? (
              <EmptyState
                emoji={look.emoji}
                text={`No scores yet. Play ${look.name} to get on the board!`}
                button={
                  <ChunkyButton
                    label={`▶ Play ${look.name}`}
                    onPress={() => onPlay(game)}
                    color={look.color}
                  />
                }
              />
            ) : (
              <>
                {top.map((play, index) => (
                  <PlayRow
                    key={play.id}
                    play={play}
                    rank={index + 1}
                    isMe={playerKey(play.player) === me}
                    accent={look.color}
                    now={now}
                  />
                ))}
                {top.length < TOP_LIMIT ? (
                  <Text style={styles.footnote}>
                    {TOP_LIMIT - top.length} more spots open. Can you grab one?
                  </Text>
                ) : null}
              </>
            )}
          </>
        ) : store.history.length === 0 ? (
          <EmptyState emoji="📜" text="Nothing here yet. Finish a game and it shows up here!" />
        ) : (
          <>
            <Text style={styles.rule}>Last {store.history.length} games, newest first</Text>
            {store.history.map((play) => (
              <PlayRow
                key={play.id}
                play={play}
                isMe={playerKey(play.player) === me}
                accent={gameStyles[play.game].color}
                now={now}
                showGame
              />
            ))}
          </>
        )}

        {store.history.length > 0 ? (
          <ChunkyButton
            label="🗑 Clear all scores"
            onPress={confirmClear}
            color={colors.white}
            textColor={colors.danger}
            size="sm"
            style={styles.clearButton}
          />
        ) : null}
      </ScrollView>
    </View>
  );
};

type PlayRowProps = {
  play: PlayRecord;
  rank?: number; // top-10 position; history rows have none
  isMe: boolean;
  accent: string;
  now: number;
  showGame?: boolean;
};

const PlayRow = ({ play, rank, isMe, accent, now, showGame = false }: PlayRowProps) => {
  const big = headline(play);
  const g = gameStyles[play.game];
  return (
    <View style={[styles.row, isMe && { borderColor: accent }]}>
      {rank !== undefined ? (
        <View style={styles.rank}>
          {rank <= 3 ? (
            <Text style={styles.medal}>{MEDALS[rank - 1]}</Text>
          ) : (
            <Text style={styles.rankNumber}>{rank}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.avatar}>
        <Text style={styles.avatarEmoji}>{play.avatar}</Text>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {play.player}
          {isMe ? <Text style={[styles.youTag, { color: accent }]}> (you)</Text> : null}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {showGame ? `${g.emoji} ${g.name} · ` : ''}
          {describe(play)}
        </Text>
        <Text style={styles.rowDate}>{timeAgo(play.date, now)}</Text>
      </View>

      <View
        style={[
          styles.score,
          { backgroundColor: play.won ? accent : '#C9C5DB', borderBottomColor: shade(play.won ? accent : '#C9C5DB') },
        ]}
      >
        <Text style={styles.scoreValue}>{big.value}</Text>
        <Text style={styles.scoreLabel}>{big.label}</Text>
      </View>
    </View>
  );
};

const EmptyState = ({
  emoji,
  text,
  button,
}: {
  emoji: string;
  text: string;
  button?: React.ReactNode;
}) => (
  <View style={styles.empty}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyText}>{text}</Text>
    {button ? <View style={styles.emptyButton}>{button}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  gamePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  gamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: '#E6E1F5',
    backgroundColor: colors.white,
  },
  gamePillEmoji: {
    fontSize: 16,
  },
  gamePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  gamePillTextActive: {
    color: colors.white,
  },
  rule: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  rank: {
    width: 30,
    alignItems: 'center',
  },
  medal: {
    fontSize: 26,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  youTag: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 13,
    color: colors.text,
  },
  rowDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  score: {
    minWidth: 58,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginTop: -2,
  },
  footnote: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 18,
  },
  clearButton: {
    marginTop: 24,
    alignSelf: 'center',
  },
});

export default LeaderboardScreen;
