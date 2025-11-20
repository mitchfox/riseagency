// This script updates the PWA manifest dynamically based on the current route
// It runs on every navigation to ensure the correct manifest is loaded

(function() {
  function updateManifest() {
    const path = window.location.pathname;
    const manifestLink = document.getElementById('manifest-link');
    const appleTitle = document.getElementById('apple-title');
    
    if (!manifestLink) return;
    
    let newManifest = '/manifest.json';
    let newTitle = 'RISE Football Agency';
    
    if (path.startsWith('/dashboard')) {
      newManifest = '/manifest-player.json';
      newTitle = 'RISE Player Portal';
    } else if (path.startsWith('/staff')) {
      newManifest = '/manifest-staff.json';
      newTitle = 'RISE Staff Portal';
    }
    
    if (manifestLink.href !== window.location.origin + newManifest) {
      manifestLink.href = newManifest;
      if (appleTitle) {
        appleTitle.content = newTitle;
      }
      console.log('[PWA] Manifest updated to:', newManifest);
    }
  }
  
  // Update on load
  updateManifest();
  
  // Update on navigation (for client-side routing)
  window.addEventListener('popstate', updateManifest);
  
  // Override history methods to catch React Router navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    updateManifest();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    updateManifest();
  };
})();
