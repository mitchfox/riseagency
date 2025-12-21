import { useState, useEffect } from 'react';

/**
 * Hook to detect if the app is running as an installed PWA (standalone mode)
 * Works on iOS Safari, Android Chrome, and desktop browsers
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState<boolean>(() => {
    // Initial check - run immediately to avoid flash
    if (typeof window === 'undefined') return false;
    
    // Check iOS Safari standalone mode
    const isIOSStandalone = (navigator as any).standalone === true;
    
    // Check display-mode media query (works on Android Chrome & desktop)
    const isStandaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check fullscreen mode as fallback
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    
    // Check if launched from home screen on Android (document.referrer is empty)
    const isAndroidHomeScreen = document.referrer === '' && !isIOSStandalone && isStandaloneMediaQuery;
    
    return isIOSStandalone || isStandaloneMediaQuery || isFullscreen || isAndroidHomeScreen;
  });

  useEffect(() => {
    // Re-check on mount and listen for changes
    const checkPWA = () => {
      const isIOSStandalone = (navigator as any).standalone === true;
      const isStandaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      
      setIsPWA(isIOSStandalone || isStandaloneMediaQuery || isFullscreen);
    };

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    
    // Use addEventListener with fallback for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkPWA);
      fullscreenQuery.addEventListener('change', checkPWA);
    } else {
      // Fallback for older Safari
      mediaQuery.addListener(checkPWA);
      fullscreenQuery.addListener(checkPWA);
    }

    // Initial check after mount
    checkPWA();

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkPWA);
        fullscreenQuery.removeEventListener('change', checkPWA);
      } else {
        mediaQuery.removeListener(checkPWA);
        fullscreenQuery.removeListener(checkPWA);
      }
    };
  }, []);

  return isPWA;
}

/**
 * Get PWA status synchronously (for use outside React components)
 */
export function getIsPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isIOSStandalone = (navigator as any).standalone === true;
  const isStandaloneMediaQuery = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isIOSStandalone || isStandaloneMediaQuery || isFullscreen;
}

export default useIsPWA;
