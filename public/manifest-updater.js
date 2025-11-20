// CRITICAL: This sets the correct manifest BEFORE browser PWA detection
// It only runs on initial page load, NOT during React Router navigation
(function() {
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
  
  manifestLink.href = newManifest;
  if (appleTitle) {
    appleTitle.content = newTitle;
  }
  console.log('[PWA] Manifest set to:', newManifest, 'for path:', path);
})();
