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
      // Cache by both ID and email for flexible retrieval
      await cache.put(`/offline/player/${playerId}`, response);
      if (data.email) {
        const emailResponse = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(`/offline/player/email/${data.email}`, emailResponse);
      }
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

  // Cache programs data
  static async cachePrograms(playerId: string, data: any[]): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('programs'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/programs/${playerId}`, response);
      console.log(`[Cache] Cached programs for ${playerId}`);
    } catch (error) {
      console.error('[Cache] Error caching programs:', error);
    }
  }

  // Cache concepts data
  static async cacheConcepts(playerId: string, data: any[]): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('concepts'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/concepts/${playerId}`, response);
      console.log(`[Cache] Cached concepts for ${playerId}`);
    } catch (error) {
      console.error('[Cache] Error caching concepts:', error);
    }
  }

  // Cache updates
  static async cacheUpdates(data: any[]): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('updates'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/updates`, response);
      console.log(`[Cache] Cached updates`);
    } catch (error) {
      console.error('[Cache] Error caching updates:', error);
    }
  }

  // Cache invoices
  static async cacheInvoices(playerId: string, data: any[]): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('invoices'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/invoices/${playerId}`, response);
      console.log(`[Cache] Cached invoices for ${playerId}`);
    } catch (error) {
      console.error('[Cache] Error caching invoices:', error);
    }
  }

  // Cache aphorisms
  static async cacheAphorisms(data: any[]): Promise<void> {
    try {
      const cache = await caches.open(this.getCacheName('aphorisms'));
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(`/offline/aphorisms`, response);
      console.log(`[Cache] Cached aphorisms`);
    } catch (error) {
      console.error('[Cache] Error caching aphorisms:', error);
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
  static async getCachedPlayerData(playerIdOrEmail: string): Promise<any | null> {
    try {
      const cache = await caches.open(this.getCacheName('players'));
      
      // Try by ID first
      let response = await cache.match(`/offline/player/${playerIdOrEmail}`);
      
      // If not found, try by email
      if (!response) {
        response = await cache.match(`/offline/player/email/${playerIdOrEmail}`);
      }
      
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

  // Get cached programs
  static async getCachedPrograms(playerId: string): Promise<any[] | null> {
    try {
      const cache = await caches.open(this.getCacheName('programs'));
      const response = await cache.match(`/offline/programs/${playerId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached programs:', error);
    }
    return null;
  }

  // Get cached concepts
  static async getCachedConcepts(playerId: string): Promise<any[] | null> {
    try {
      const cache = await caches.open(this.getCacheName('concepts'));
      const response = await cache.match(`/offline/concepts/${playerId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached concepts:', error);
    }
    return null;
  }

  // Get cached updates
  static async getCachedUpdates(): Promise<any[] | null> {
    try {
      const cache = await caches.open(this.getCacheName('updates'));
      const response = await cache.match(`/offline/updates`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached updates:', error);
    }
    return null;
  }

  // Get cached invoices
  static async getCachedInvoices(playerId: string): Promise<any[] | null> {
    try {
      const cache = await caches.open(this.getCacheName('invoices'));
      const response = await cache.match(`/offline/invoices/${playerId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached invoices:', error);
    }
    return null;
  }

  // Get cached aphorisms
  static async getCachedAphorisms(): Promise<any[] | null> {
    try {
      const cache = await caches.open(this.getCacheName('aphorisms'));
      const response = await cache.match(`/offline/aphorisms`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('[Cache] Error getting cached aphorisms:', error);
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
    programs: any[],
    concepts: any[],
    updates: any[],
    invoices: any[],
    aphorisms: any[],
    assets: string[],
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const totalItems = players.length + analyses.length + programs.length + 
                       concepts.length + updates.length + invoices.length + 
                       aphorisms.length + assets.length;
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

    // Cache programs
    if (programs.length > 0 && players.length > 0) {
      await this.cachePrograms(players[0].id, programs);
      completed += programs.length;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache concepts
    if (concepts.length > 0 && players.length > 0) {
      await this.cacheConcepts(players[0].id, concepts);
      completed += concepts.length;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache updates
    if (updates.length > 0) {
      await this.cacheUpdates(updates);
      completed += updates.length;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache invoices
    if (invoices.length > 0 && players.length > 0) {
      await this.cacheInvoices(players[0].id, invoices);
      completed += invoices.length;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache aphorisms
    if (aphorisms.length > 0) {
      await this.cacheAphorisms(aphorisms);
      completed += aphorisms.length;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    // Cache assets (excluding videos)
    for (const asset of assets) {
      if (!asset.includes('video') && !asset.includes('.mp4') && !asset.includes('.webm')) {
        await this.cacheAsset(asset);
      }
      completed++;
      onProgress?.(Math.round((completed / totalItems) * 100));
    }

    console.log('[Cache] Download for offline complete');
  }
}
