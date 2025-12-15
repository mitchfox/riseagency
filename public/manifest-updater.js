// CRITICAL: Keep the correct manifest in sync with SPA navigation (React Router)
(function () {
  const manifestLink = document.getElementById('manifest-link');
  const appleTitle = document.getElementById('apple-title');

  if (!manifestLink) return;

  const compute = (path) => {
    if (path.startsWith('/portal')) {
      return { manifest: '/manifest-player.json', title: 'RISE Player Portal' };
    }
    if (path.startsWith('/staff')) {
      return { manifest: '/manifest-staff.json', title: 'RISE Staff Portal' };
    }
    return { manifest: '/manifest.json', title: 'RISE Football Agency' };
  };

  let lastManifest = null;

  const apply = () => {
    const path = window.location.pathname || '/';
    const next = compute(path);

    if (lastManifest !== next.manifest) {
      manifestLink.href = next.manifest;
      manifestLink.rel = 'manifest';
      lastManifest = next.manifest;
    }

    if (appleTitle) {
      appleTitle.content = next.title;
    }

    console.log('[PWA] Manifest set to:', next.manifest, 'for path:', path);
  };

  const wrapHistory = (method) => {
    const original = history[method];
    if (typeof original !== 'function') return;
    history[method] = function () {
      const result = original.apply(this, arguments);
      apply();
      return result;
    };
  };

  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', apply);
  window.addEventListener('hashchange', apply);

  apply();
})();

