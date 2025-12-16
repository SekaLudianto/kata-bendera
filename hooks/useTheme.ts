
import { useState, useEffect, useCallback } from 'react';

export const useTheme = () => {
  // Initialize state based on localStorage or System Preference
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
        return 'light';
    }
    // Priority 1: Local Storage
    if (localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    // Priority 2: System Preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Sync state across multiple hook instances using a custom window event
  useEffect(() => {
    const handleThemeChange = () => {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
        if (storedTheme) {
            setTheme(storedTheme);
        }
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        
        // Apply directly to DOM
        const root = window.document.documentElement;
        if (newTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Save to Storage
        localStorage.setItem('theme', newTheme);

        // Dispatch event to notify other components (like App.tsx) to update their state
        window.dispatchEvent(new Event('theme-change'));

        return newTheme;
    });
  }, []);

  return { theme, toggleTheme };
};
