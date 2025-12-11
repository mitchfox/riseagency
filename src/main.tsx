// Redirect www.{subdomain}.domain.com → {subdomain}.domain.com
// Must run before React renders to avoid flash of content
(function() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Check for www.{subdomain}.domain.com format (4+ parts with www prefix)
  if (parts.length >= 4 && parts[0].toLowerCase() === 'www') {
    const newHostname = parts.slice(1).join('.');
    const newUrl = `${window.location.protocol}//${newHostname}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
  }
})();

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Register service worker with update detection - wrapped in try-catch to prevent console errors
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker registered');
      
      // Check for updates on page load - wrapped in try-catch
      try {
        await registration.update();
      } catch {
        // Silently ignore update errors - not critical
      }
      
      // Check for updates periodically (every 5 minutes)
      setInterval(async () => {
        try {
          await registration.update();
        } catch {
          // Silently ignore periodic update errors
        }
      }, 5 * 60 * 1000);
    } catch {
      // Silently fail - SW is not critical for app functionality
    }
  });
}

const root = createRoot(document.getElementById("root")!);

// Hide loading splash once React is mounted and ready
root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Remove loading splash after React has rendered - only show on /portal and /staff routes
const removeSplash = () => {
  const splash = document.getElementById('loading-splash');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 4000);
  }
};

setTimeout(() => {
  const splash = document.getElementById('loading-splash');
  const currentPath = window.location.pathname;
  
  // Only show splash for /portal and /staff routes (exact match or starts with)
  const shouldShowSplash = currentPath === '/portal' || currentPath.startsWith('/portal/') || 
                           currentPath === '/staff' || currentPath.startsWith('/staff/');
  
  if (splash && !shouldShowSplash) {
    // Immediately hide splash on other pages
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 500);
  } else if (splash && shouldShowSplash) {
    // For portal/staff, show for 1 second then fade out over 4 seconds
    setTimeout(() => {
      removeSplash();
    }, 1000);
    
    // Fallback: Always remove splash after 6 seconds max (for offline scenarios)
    setTimeout(() => {
      removeSplash();
    }, 6000);
  }
}, 100);
