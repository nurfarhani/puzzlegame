import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import { colors, radius, shade } from '../theme';
import WinCard from '../components/WinCard';
import ChunkyButton from '../components/ChunkyButton';
import { useRecordPlay } from '../lib/useRecordPlay';
import { HelpButton } from '../components/HowToPlay';
import { Popup } from '../components/Popup';
import { buzzLight, playPop, playTap } from '../lib/sound';

// A bright colour for each number when its card is face up.
const NUMBER_COLORS: Record<number, string> = {
  1: '#FF6B6B',
  2: '#FFA94D',
  3: '#FFD43B',
  4: '#69DB7C',
  5: '#38D9A9',
  6: '#4DABF7',
  7: '#9775FA',
  8: '#F783AC',
};
// The colour of the card backs.
const CARD_BACK = '#FF6B9D';

const NumberMatchGame = () => {
  const { width } = useWindowDimensions();
  const [numbers, setNumbers] = useState<number[]>([]);
  // Up to two face-up cards that are not matched yet.
  const [selected, setSelected] = useState<number[]>([]);
  // Indexes of every card already matched; these stay face-up.
  const [matched, setMatched] = useState<number[]>([]);
  // True while a wrong pair is shown, so extra taps are ignored.
  const [isChecking, setIsChecking] = useState(false);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [badge, recordWin] = useRecordPlay();

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    // Create pairs of numbers (1-8)
    let pairs = [];
    for (let i = 1; i <= 8; i++) {
      pairs.push(i, i);
    }

    setNumbers(shuffleArray(pairs));
    setSelected([]);
    setMatched([]);
    setIsChecking(false);
    setMoves(0);
    setScore(0);
    setIsSolved(false);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleNumberPress = (index: number) => {
    if (isSolved || isChecking) return;
    // Ignore cards that are already face-up.
    if (selected.includes(index) || matched.includes(index)) return;

    const newSelected = [...selected, index];
    setSelected(newSelected);
    playTap();
    if (newSelected.length < 2) return;

    // Two cards are up: count the move and compare them.
    const newMoves = moves + 1;
    setMoves(newMoves);
    const [firstIndex, secondIndex] = newSelected;

    if (numbers[firstIndex] === numbers[secondIndex]) {
      const newMatched = [...matched, firstIndex, secondIndex];
      const newScore = score + 100;
      setMatched(newMatched);
      playPop();
      buzzLight();
      setScore(newScore);
      setSelected([]);

      // Only pop up once every pair has been found.
      if (newMatched.length === numbers.length) {
        setIsSolved(true); // shows the win popup
        recordWin({ game: 'numbermatch', won: true, moves: newMoves });
      }
    } else {
      // Not a match: show both briefly, then flip them back.
      setIsChecking(true);
      setTimeout(() => {
        setSelected([]);
        setIsChecking(false);
      }, 800);
    }
  };

  // 4 x 4 grid of cards that fills the screen width (max 400).
  const gridSize = Math.min(width - 32, 400);
  const gap = 10;
  const cardSize = Math.floor((gridSize - gap * 3) / 4);

  const renderNumber = (number: number, index: number) => {
    const isMatched = matched.includes(index);
    const isSelected = selected.includes(index);
    const isFaceUp = isMatched || isSelected;
    const face = isFaceUp ? NUMBER_COLORS[number] ?? colors.primary : CARD_BACK;

    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            width: cardSize,
            height: cardSize,
            backgroundColor: face,
            borderBottomColor: shade(face),
          },
          isSelected && styles.selectedCard,
          isMatched && styles.matchedCard,
        ]}
        onPress={() => handleNumberPress(index)}
        disabled={isFaceUp || isSolved}
      >
        <Text style={[styles.cardText, { fontSize: cardSize * (isFaceUp ? 0.48 : 0.42) }]}>
          {isFaceUp ? number : '?'}
        </Text>
        {isMatched && <Text style={styles.matchedBadge}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.instructions}>Flip two cards. Find all 8 matching pairs! 🃏</Text>
      <HelpButton style={{ marginBottom: 10 }} />

      <View style={[styles.statRow, { width: gridSize }]}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <ChunkyButton label="🔄 New" onPress={startNewGame} color={colors.primary} size="sm" />
      </View>

      <View style={[styles.grid, { width: gridSize, gap }]}>
        {numbers.map((number, index) => renderNumber(number, index))}
      </View>

      <Text style={styles.progress}>
        {matched.length / 2} of {numbers.length / 2} pairs found
      </Text>

      <Popup visible={isSolved}>
          <WinCard
            title="🎉 All matched!"
            subtitle="You found all 8 pairs"
            stats={[
              { label: 'Moves', value: moves },
              { label: 'Score', value: score },
            ]}
            message={
              moves <= 8
                ? '🏆 Perfect memory! Fewest moves possible.'
                : moves <= 14
                ? '⭐ Great job!'
                : 'Nice! Try again for fewer moves.'
            }
            badge={badge}
            onPlayAgain={startNewGame}
          />
      </Popup>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: colors.background,
  },
  instructions: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: radius.md,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    transform: [{ scale: 1.05 }],
  },
  matchedCard: {
    opacity: 0.85,
  },
  cardText: {
    fontWeight: '700',
    color: colors.white,
  },
  matchedBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  progress: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(45, 42, 74, 0.55)',
  },
});

export default NumberMatchGame;
