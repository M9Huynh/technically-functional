import { useState, useRef } from 'react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 10000; // 10 seconds in milliseconds

export const useLoginAttempts = () => {
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= MAX_ATTEMPTS) {
      setIsLocked(true);
      
      // Clear any existing timer
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
      
      // Set timer to unlock after 10 seconds
      lockTimerRef.current = setTimeout(() => {
        setIsLocked(false);
        setAttempts(0);
      }, LOCKOUT_DURATION);
    }
  };

  const resetAttempts = () => {
    setAttempts(0);
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  };

  return {
    attempts,
    isLocked,
    registerFailedAttempt,
    resetAttempts,
    remainingAttempts: MAX_ATTEMPTS - attempts,
  };
};