import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './AppText';
import { colors, radius, shade } from '../theme';
import { playTap, buzzLight } from '../lib/sound';

type ChunkyButtonProps = {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 14, edge: 4 },
  md: { paddingVertical: 11, paddingHorizontal: 22, fontSize: 17, edge: 5 },
  lg: { paddingVertical: 15, paddingHorizontal: 32, fontSize: 21, edge: 6 },
};

// A rounded "toy" button with a darker bottom edge that looks pressable.
// When pressed it sinks down onto its edge.
const ChunkyButton = ({
  label,
  onPress,
  color = colors.primary,
  textColor = colors.white,
  size = 'md',
  disabled = false,
  style,
}: ChunkyButtonProps) => {
  const s = SIZES[size];
  // Add a tap sound + light buzz to every press for tactile feedback.
  const handlePress = () => {
    playTap();
    buzzLight();
    onPress();
  };
  return (
    <Pressable onPress={handlePress} disabled={disabled} style={[styles.wrap, style]}>
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            {
              backgroundColor: color,
              borderBottomColor: shade(color),
              borderBottomWidth: pressed ? 1 : s.edge,
              marginTop: pressed ? s.edge - 1 : 0,
              paddingVertical: s.paddingVertical,
              paddingHorizontal: s.paddingHorizontal,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.label, { color: textColor, fontSize: s.fontSize }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChunkyButton;
