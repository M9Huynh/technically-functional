import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes

export const useInactivityTimeout = (onTimeout: () => void) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onTimeout();
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetTimer();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        resetTimer();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      subscription.remove();
    };
  }, []);
};