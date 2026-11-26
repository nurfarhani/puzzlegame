import React from 'react';
import { Text as RNText, StyleSheet, type TextProps } from 'react-native';
import { fonts } from '../theme';

// Drop-in replacement for React Native's Text that uses the app's rounded
// Fredoka font. It picks the right Fredoka file from the style's
// fontWeight, because Android can't make a custom font bold on its own.
const familyFor = (weight: unknown): string => {
  switch (String(weight ?? '400')) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return fonts.bold;
    case '600':
      return fonts.semibold;
    case '500':
      return fonts.medium;
    default:
      return fonts.regular;
  }
};

export const Text = ({ style, ...rest }: TextProps) => {
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <RNText
      {...rest}
      style={[style, { fontFamily: flat.fontFamily ?? familyFor(flat.fontWeight), fontWeight: 'normal' }]}
    />
  );
};

export default Text;
