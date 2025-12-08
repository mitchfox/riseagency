import { useState, useEffect } from 'react';

export const useDevMode = () => {
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check URL param or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const devParam = urlParams.get('dev');
    const storedDev = localStorage.getItem('devMode');
    
    if (devParam === 'true') {
      setIsDevMode(true);
      localStorage.setItem('devMode', 'true');
    } else if (devParam === 'false') {
      setIsDevMode(false);
      localStorage.removeItem('devMode');
    } else if (storedDev === 'true') {
      setIsDevMode(true);
    }

    // Toggle with Ctrl+Shift+D
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsDevMode(prev => {
          const newValue = !prev;
          if (newValue) {
            localStorage.setItem('devMode', 'true');
          } else {
            localStorage.removeItem('devMode');
          }
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return isDevMode;
};
