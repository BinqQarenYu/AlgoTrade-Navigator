
"use client";

import { useState, useEffect } from 'react';

export const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      // Check for null or the literal string "undefined" before parsing.
      if (item && item !== "undefined") {
        const parsed = JSON.parse(item);
        // Special handling for date ranges, as they need to be rehydrated as Date objects
        if (key.endsWith('-date-range') && parsed) {
          if (parsed.from) parsed.from = new Date(parsed.from);
          if (parsed.to) parsed.to = new Date(parsed.to);
        }
        if (isMounted) {
          setState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse stored state for key:', key, e);
      localStorage.removeItem(key);
    } finally {
      if (isMounted) {
        setIsHydrated(true);
      }
    }
    return () => { isMounted = false; };
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      // Avoid saving `undefined` to localStorage.
      if (state !== undefined) {
        window.localStorage.setItem(key, JSON.stringify(state));
      } else {
        // If state becomes undefined, remove it from storage to avoid errors.
        window.localStorage.removeItem(key);
      }
    }
  }, [key, state, isHydrated]);

  return [isHydrated ? state : defaultValue, setState];
};
