import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../AppText';
import { colors, radius } from '../../theme';

// A little "video" that shows how a game is played: a scripted scene where
// a pointing hand makes moves, with a caption for each step, play/pause and
// replay. Scenes are drawn in a fixed 300 x 190 space and scaled to fit.

export const STAGE_W = 300;
export const STAGE_H = 190;

export type DemoStep = {
  caption: string;
  ms: number; // how long this step stays on screen
  hand?: [number, number]; // where the fingertip points (stage units); none = hand hidden
  tap?: boolean; // the hand taps when this step starts
};

export type Demo = {
  tint: string; // stage background
  steps: DemoStep[];
  Stage: (props: { step: number }) => ReactNode;
};

/**
 * Something on the stage that glides to its new place (and fades, grows or
 * turns) whenever its props change. It starts wherever it is first drawn.
 */
export const Mover = ({
  x,
  y,
  w,
  h,
  opacity = 1,
  scale = 1,
  rotate = 0,
  ms = 320,
  style,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity?: number;
  scale?: number;
  rotate?: number; // degrees
  ms?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) => {
  const a = useRef({
    x: new Animated.Value(x),
    y: new Animated.Value(y),
    o: new Animated.Value(opacity),
    s: new Animated.Value(scale),
    r: new Animated.Value(rotate),
  }).current;
  useEffect(() => {
    const to = (v: Animated.Value, value: number) =>
      Animated.timing(v, { toValue: value, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true });
    Animated.parallel([to(a.x, x), to(a.y, y), to(a.o, opacity), to(a.s, scale), to(a.r, rotate)]).start();
  }, [a, x, y, opacity, scale, rotate, ms]);
  return (
    <Animated.View
      style={[
        styles.mover,
        {
          width: w,
          height: h,
          opacity: a.o,
          transform: [
            { translateX: a.x },
            { translateY: a.y },
            { scale: a.s },
            { rotate: a.r.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// The pointing hand. Its fingertip is at the top middle of the emoji.
const HAND = 40;
const Hand = ({ at, tap, step }: { at?: [number, number]; tap?: boolean; step: number }) => {
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tap) return;
    Animated.sequence([
      Animated.timing(press, { toValue: 0.78, duration: 120, useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [tap, step, press]);
  const [x, y] = at ?? [STAGE_W - 30, STAGE_H + 10];
  return (
    <Mover x={x - HAND / 2} y={y - 4} w={HAND} h={HAND + 6} opacity={at ? 1 : 0} ms={380}>
      <Animated.Text style={[styles.hand, { transform: [{ scale: press }] }]}>👆</Animated.Text>
    </Mover>
  );
};

const TutorialPlayer = ({ demo, accent }: { demo: Demo; accent: string }) => {
  const [width, setWidth] = useState(0);
  const [step, setStep] = useState(0);
  const [loop, setLoop] = useState(0); // bumps on every replay, so the scene starts fresh
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step + 1 >= demo.steps.length) {
        setStep(0);
        setLoop((n) => n + 1);
      } else {
        setStep(step + 1);
      }
    }, demo.steps[step].ms);
    return () => clearTimeout(timer);
  }, [playing, step, demo]);

  const replay = () => {
    setStep(0);
    setLoop((n) => n + 1);
    setPlaying(true);
  };

  const scale = width / STAGE_W;
  const height = STAGE_H * scale;
  const current = demo.steps[step];
  const { Stage } = demo;

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <View
          style={[styles.stage, { height: height || STAGE_H, backgroundColor: demo.tint }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 ? (
            <View
              key={loop}
              style={[
                styles.scene,
                {
                  left: (width - STAGE_W) / 2,
                  top: (height - STAGE_H) / 2,
                  transform: [{ scale }],
                },
              ]}
            >
              <Stage step={step} />
              <Hand at={current.hand} tap={current.tap} step={step} />
            </View>
          ) : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🎬 How to play</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            hitSlop={8}
            style={styles.control}
            accessibilityLabel={playing ? 'Pause' : 'Play'}
          >
            <Text style={styles.controlText}>{playing ? '⏸' : '▶'}</Text>
          </Pressable>
          <View style={styles.progress}>
            {demo.steps.map((_, k) => (
              <View
                key={k}
                style={[styles.segment, { backgroundColor: k <= step ? accent : 'rgba(255,255,255,0.25)' }]}
              />
            ))}
          </View>
          <Pressable onPress={replay} hitSlop={8} style={styles.control} accessibilityLabel="Watch again">
            <Text style={styles.controlText}>↺</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.caption}>{current.caption}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  frame: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    padding: 6,
  },
  stage: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  scene: {
    position: 'absolute',
    width: STAGE_W,
    height: STAGE_H,
  },
  mover: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hand: {
    fontSize: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(45,42,74,0.7)',
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  control: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  caption: {
    marginTop: 8,
    minHeight: 40,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});

export default TutorialPlayer;
