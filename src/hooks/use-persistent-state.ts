
"use client";

import { useState, useEffect } from 'react';

export const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    try {
      const item = window.localStorage.getItem(key);
      if (item && item !== "undefined") {
        const parsed = JSON.parse(item);
        if (key.endsWith('-date-range') && parsed) {
          if (parsed.from) parsed.from = new Date(parsed.from);
          if (parsed.to) parsed.to = new Date(parsed.to);
        }
        setState(parsed);
      }
    } catch (e) {
      console.error('Failed to parse stored state for key:', key, e);
      localStorage.removeItem(key);
    }
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      if (state !== undefined) {
        window.localStorage.setItem(key, JSON.stringify(state));
      } else {
        window.localStorage.removeItem(key);
      }
    }
  }, [key, state, isHydrated]);

  return [state, setState];
};
