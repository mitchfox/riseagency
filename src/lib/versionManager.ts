// Version management for PWA cache invalidation

const APP_VERSION_KEY = 'rise_app_version';
const LAST_CHECK_KEY = 'rise_last_version_check';
const CHECK_INTERVAL_MS = 60000; // Check every minute

export class VersionManager {
  private static buildTimestamp: string | null = null;

  // Get the current build timestamp from the HTML
  static async getCurrentBuildVersion(): Promise<string> {
    try {
      // Fetch the index.html with cache-busting
      const response = await fetch(`/?_v=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch version');
      }

      const html = await response.text();
      
      // Look for the script src with hash (Vite adds hashes to bundles)
      const scriptMatch = html.match(/src="\/assets\/index-([a-zA-Z0-9]+)\.js"/);
      if (scriptMatch) {
        return scriptMatch[1];
      }

      // Fallback to checking any main script hash
      const anyScriptMatch = html.match(/src="([^"]+index[^"]+\.js)"/);
      if (anyScriptMatch) {
        return anyScriptMatch[1];
      }

      // Last resort - use response headers
      const etag = response.headers.get('etag');
      if (etag) {
        return etag;
      }

      return Date.now().toString();
    } catch (error) {
      console.error('[VersionManager] Error fetching version:', error);
      return '';
    }
  }

  // Check if we need to reload due to new version
  static async checkForUpdates(): Promise<boolean> {
    try {
      // Don't check too frequently
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck) {
        const timeSinceCheck = Date.now() - parseInt(lastCheck, 10);
        if (timeSinceCheck < CHECK_INTERVAL_MS) {
          return false;
        }
      }

      localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

      const currentVersion = await this.getCurrentBuildVersion();
      if (!currentVersion) {
        return false;
      }

      const storedVersion = localStorage.getItem(APP_VERSION_KEY);
      
      if (!storedVersion) {
        // First visit - store version
        localStorage.setItem(APP_VERSION_KEY, currentVersion);
        return false;
      }

      if (storedVersion !== currentVersion) {
        console.log('[VersionManager] New version detected:', currentVersion, 'vs stored:', storedVersion);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[VersionManager] Error checking for updates:', error);
      return false;
    }
  }

  // Force update to new version
  static async forceUpdate(): Promise<void> {
    try {
      const newVersion = await this.getCurrentBuildVersion();
      if (newVersion) {
        localStorage.setItem(APP_VERSION_KEY, newVersion);
      }

      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[VersionManager] Cleared all caches');
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('[VersionManager] Unregistered service workers');
      }

      // Hard reload
      window.location.replace(window.location.pathname + '?_refresh=' + Date.now());
    } catch (error) {
      console.error('[VersionManager] Error forcing update:', error);
      window.location.reload();
    }
  }

  // Initialize version tracking on first load
  static async initialize(): Promise<void> {
    try {
      // On page load, always verify we have the latest
      if (navigator.onLine) {
        const hasUpdate = await this.checkForUpdates();
        if (hasUpdate) {
          console.log('[VersionManager] Update available, will reload');
          await this.forceUpdate();
        }
      }
    } catch (error) {
      console.error('[VersionManager] Initialization error:', error);
    }
  }
}
