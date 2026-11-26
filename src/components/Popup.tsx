import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, Modal, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { colors } from '../theme';

// Every popup in the app goes through here, so each one can be closed with
// its ✕ button or the phone's back button.

const PopupCloseContext = createContext<(() => void) | null>(null);

/** Inside a Popup: a function that closes it. Cards like WinCard use it to show their ✕. */
export const usePopupClose = () => useContext(PopupCloseContext);

type PopupProps = {
  visible: boolean;
  /** Called when the popup is closed with ✕ or the back button. */
  onClose?: () => void;
  children: ReactNode;
};

/**
 * A popup over a dimmed screen. Closing it hides it until `visible` turns
 * false and true again (for example the next win), so games can just pass
 * `visible={solved}`.
 */
export const Popup = ({ visible, onClose, children }: PopupProps) => {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!visible) setClosed(false);
  }, [visible]);
  const close = useCallback(() => {
    setClosed(true);
    onClose?.();
  }, [onClose]);

  return (
    <Modal visible={visible && !closed} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <PopupCloseContext.Provider value={close}>
        <View style={styles.backdrop}>{children}</View>
      </PopupCloseContext.Provider>
    </Modal>
  );
};

/** A round ✕ for the top-right corner of a popup card. */
export const CloseButton = ({
  onPress,
  light,
  style,
}: {
  onPress: () => void;
  light?: boolean; // white ✕ for coloured headers
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={12}
    accessibilityLabel="Close"
    style={({ pressed }) => [styles.close, light && styles.closeLight, pressed && styles.pressed, style]}
  >
    <Text style={[styles.closeText, light && styles.closeTextLight]}>✕</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(45,42,74,0.55)',
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EEF8',
    zIndex: 5,
    elevation: 5,
  },
  closeLight: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pressed: {
    opacity: 0.6,
  },
  closeText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMuted,
  },
  closeTextLight: {
    color: colors.white,
  },
});
