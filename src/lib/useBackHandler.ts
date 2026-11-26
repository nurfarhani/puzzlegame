import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Runs `handler` when the phone's back button is pressed, while `enabled` is true.
 *
 * Android asks the most recently added listener first, so a game that turns
 * this on while a puzzle is open gets the press before the app-wide "go home"
 * handler in App.tsx. Return false from `handler` to let the next one have it.
 */
export const useBackHandler = (handler: () => boolean | void, enabled = true) => {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => latest.current() !== false);
    return () => sub.remove();
  }, [enabled]);
};
