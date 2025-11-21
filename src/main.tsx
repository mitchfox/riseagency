import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Register service worker with update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[PWA] Service Worker registered:', registration);
        
        // Check for updates on page load
        registration.update();
        
        // Check for updates periodically (every 5 minutes)
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch(error => {
        console.log('[PWA] Service Worker registration failed:', error);
      });
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
