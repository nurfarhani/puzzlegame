import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

// A shower of colourful paper pieces for the win screen. It never takes
// touches, plays once (about 3 seconds) and needs no extra packages.

const COUNT = 44;
const COLOURS = [
  colors.primary,
  colors.secondary,
  colors.success,
  colors.warning,
  colors.sky,
  colors.danger,
  '#B197FC',
];

type Piece = {
  x: number; // where it starts across the screen
  size: number;
  round: boolean; // dots and strips
  color: string;
  delay: number;
  duration: number;
  drift: number; // how far it sways sideways
  spin: number; // degrees turned on the way down
};

const makePieces = (width: number): Piece[] =>
  Array.from({ length: COUNT }, () => ({
    x: Math.random() * width,
    size: 8 + Math.random() * 8,
    round: Math.random() < 0.3,
    color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    delay: Math.random() * 700,
    duration: 1900 + Math.random() * 1200,
    drift: 12 + Math.random() * 26,
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
  }));

const Confetti = () => {
  const { width, height } = useWindowDimensions();
  const [pieces] = useState(() => makePieces(width));
  const fall = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const run = Animated.parallel(
      fall.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          delay: pieces[i].delay,
          duration: pieces[i].duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    );
    run.start();
    return () => run.stop();
  }, [fall, pieces]);

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((piece, i) => {
        const value = fall[i];
        const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [-30, height + 30] });
        const translateX = value.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, piece.drift, 0, -piece.drift, 0],
        });
        const rotate = value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] });
        const opacity = value.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                left: piece.x,
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 0.45,
                borderRadius: piece.round ? piece.size / 2 : 2,
                backgroundColor: piece.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: 0,
  },
});

export default Confetti;
