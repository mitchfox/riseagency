// Cache Manager Utility for PWA Offline Content

interface CacheConfig {
  name: string;
  maxSize: number; // in MB
  ttl?: number; // time to live in seconds
}

export class CacheManager {
  private static readonly CACHE_PREFIX = 'rise-offline-';
  private static readonly VERSION = 'v1';

  static getCacheName(category: string): string {
    return `${this.CACHE_PREFIX}${category}-${this.VERSION}`;
  }

  // Cache player data
  static async cachePlayerData(playerId: string, data: any): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('players'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/player/${playerId}`, response);
      console.log(`[Cache] Cached player data for ${playerId}`);
    } catch (error) {
      console.error('[Cache] Error caching player data:', error);
    }
  }

  // Cache analysis/report data
  static async cacheAnalysis(analysisId: string, data: any): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('analyses'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/analysis/${analysisId}`, response);
      console.log(`[Cache] Cached analysis ${analysisId}`);
    } catch (error) {
      console.error('[Cache] Error caching analysis:', error);
    }
  }

  // Cache image/asset
  static async cacheAsset(url: string): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('assets'));
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log(`[Cache] Cached asset ${url}`);
      }
    } catch (error) {
      console.error('[Cache] Error caching asset:', error);
    }
  }

  // Cache multiple assets
  static async cacheAssets(urls: string[]): Promise<void> {
    const cache = await caches.open(this.getCacheName('assets'));
    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.error(`[Cache] Error caching ${url}:`, error);
      }
    });
    await Promise.all(promises);
    console.log(`[Cache] Cached ${urls.length} assets`);
  }

  // Get cached player data
  static async getCachedPlayerData(playerId: string): Promise<any | null> {
    try {
      const cache = await caches.open(this.getCacheName('players'));
      const response = await cache.match(`/offline/player/${playerId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached player data:', error);
    }
    return null;
  }

  // Get cached analysis
  static async getCachedAnalysis(analysisId: string): Promise<any | null> {
    try {
      const cache = await caches.open(this.getCacheName('analyses'));
      const response = await cache.match(`/offline/analysis/${analysisId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached analysis:', error);
    }
    return null;
  }

  // Get cache storage usage
  static async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: Math.round((estimate.usage || 0) / (1024 * 1024)), // MB
        quota: Math.round((estimate.quota || 0) / (1024 * 1024)) // MB
      };
    }
    return { used: 0, quota: 0 };
  }

  // Clear specific cache category
  static async clearCache(category: string): Promise<void> {
    try {
      const cacheName = this.getCacheName(category);
      await caches.delete(cacheName);
      console.log(`[Cache] Cleared cache: ${cacheName}`);
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error);
    }
  }

  // Clear all offline caches
  static async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const offlineCaches = cacheNames.filter(name => name.startsWith(this.CACHE_PREFIX));
      await Promise.all(offlineCaches.map(name => caches.delete(name)));
      console.log(`[Cache] Cleared ${offlineCaches.length} offline caches`);
    } catch (error) {
      console.error('[Cache] Error clearing all caches:', error);
    }
  }

  // Get list of cached items by category
  static async getCachedItems(category: string): Promise<string[]> {
    try {
      const cache = await caches.open(this.getCacheName(category));
      const requests = await cache.keys();
      return requests.map(req => req.url);
    } catch (error) {
      console.error('[Cache] Error getting cached items:', error);
      return [];
    }
  }

  // Download content for offline use
  static async downloadForOffline(
    players: any[],
    analyses: any[],
    assets: string[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const totalItems = players.length + analyses.length + assets.length;
    let completed = 0;

    // Cache players
    for (const player of players) {
      await this.cachePlayerData(player.id, player);
      completed++;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache analyses
    for (const analysis of analyses) {
      await this.cacheAnalysis(analysis.id, analysis);
      completed++;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache assets
    for (const asset of assets) {
      await this.cacheAsset(asset);
      completed++;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    console.log('[Cache] Download for offline complete');
  }
}
