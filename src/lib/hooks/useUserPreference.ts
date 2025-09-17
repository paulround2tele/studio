/**
 * User Preference Hook (Phase 2)
 * localStorage-backed preferences with multi-tab synchronization
 */

import { useState, useEffect, useCallback } from 'react';

export function useUserPreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Read from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn(`[useUserPreference] Failed to read preference '${key}':`, error);
    }
  }, [key]);

  // Set value and persist to localStorage
  const setValueAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(newValue));
      
      // Dispatch storage event for cross-tab sync (skip in test environment)
      if (typeof window !== 'undefined' && window.dispatchEvent && typeof StorageEvent !== 'undefined') {
        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(newValue)
          }));
        } catch (storageEventError) {
          // StorageEvent creation may fail in test environments - this is non-critical
          console.debug('[useUserPreference] StorageEvent dispatch failed (likely test environment):', storageEventError);
        }
      }
    } catch (error) {
      console.warn(`[useUserPreference] Failed to persist preference '${key}':`, error);
    }
  }, [key]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`[useUserPreference] Failed to parse storage event for '${key}':`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setValueAndPersist];
}