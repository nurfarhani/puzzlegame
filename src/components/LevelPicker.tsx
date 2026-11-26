import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from './AppText';
import { colors, radius, shade } from '../theme';

export type LevelOption = {
  level: number;
  name: string;
  emoji: string;
  detail: string; // small line under the name, e.g. "4×4" or "9 pieces"
};

type LevelPickerProps = {
  options: LevelOption[];
  value: number; // selected level number
  onChange: (level: number) => void;
  color: string; // fill colour of the selected level
};

// A row of chunky level buttons: emoji, name and a small detail line.
const LevelPicker = ({ options, value, onChange, color }: LevelPickerProps) => (
  <View style={styles.row}>
    {options.map((option) => {
      const active = option.level === value;
      return (
        <Pressable
          key={option.level}
          onPress={() => onChange(option.level)}
          style={[
            styles.pill,
            active
              ? { backgroundColor: color, borderBottomColor: shade(color) }
              : styles.pillIdle,
          ]}
          accessibilityLabel={`Level ${option.level}: ${option.name}`}
          accessibilityState={{ selected: active }}
        >
          <Text style={styles.emoji}>{option.emoji}</Text>
          <Text style={[styles.name, active && styles.textActive]} numberOfLines={1}>
            {option.name}
          </Text>
          <Text style={[styles.detail, active && styles.textActive]} numberOfLines={1}>
            {option.detail}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderBottomWidth: 4,
  },
  pillIdle: {
    backgroundColor: colors.white,
    borderBottomColor: '#E6E1F5',
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  textActive: {
    color: colors.white,
  },
});

export default LevelPicker;
