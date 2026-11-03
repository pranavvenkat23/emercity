import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle, type StatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/**
 * Sets the status bar text style while the calling screen is focused, so
 * light text sits on the navy app bar and the dark Emergency screens, and
 * dark text on light backgrounds.
 */
export function useStatusBarStyle(style: StatusBarStyle) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
    }, [style]),
  );
}
