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

// Remove loading splash after React has rendered - only show on /dashboard and /staff routes
setTimeout(() => {
  const splash = document.getElementById('loading-splash');
  const currentPath = window.location.pathname;
  
  // Only keep splash for dashboard and staff pages
  if (splash && !currentPath.includes('/dashboard') && !currentPath.includes('/staff')) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 500);
  } else if (splash) {
    // For dashboard/staff, add fade out after 4 seconds
    setTimeout(() => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 4000);
    }, 0);
  }
}, 100);
