import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Trash2, HardDrive, Wifi, WifiOff } from "lucide-react";
import { CacheManager } from "@/lib/cacheManager";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface OfflineContentManagerProps {
  playerData?: any;
  analyses?: any[];
  programs?: any[];
  concepts?: any[];
  updates?: any[];
  invoices?: any[];
  aphorisms?: any[];
  assets?: string[];
}

export const OfflineContentManager = ({ 
  playerData, 
  analyses = [],
  programs = [],
  concepts = [],
  updates = [],
  invoices = [],
  aphorisms = [],
  assets = [] 
}: OfflineContentManagerProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const [cachedItems, setCachedItems] = useState({
    players: 0,
    analyses: 0,
    assets: 0
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadStorageInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStorageInfo = async () => {
    const usage = await CacheManager.getStorageUsage();
    setStorageUsage(usage);

    const playerCache = await CacheManager.getCachedItems('players');
    const analysisCache = await CacheManager.getCachedItems('analyses');
    const assetCache = await CacheManager.getCachedItems('assets');

    setCachedItems({
      players: playerCache.length,
      analyses: analysisCache.length,
      assets: assetCache.length
    });
  };

  const handleDownloadForOffline = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const playersToCache = playerData ? [playerData] : [];
      const analysesToCache = analyses || [];
      const programsToCache = programs || [];
      const conceptsToCache = concepts || [];
      const updatesToCache = updates || [];
      const invoicesToCache = invoices || [];
      const aphorismsToCache = aphorisms || [];
      const assetsToCache = [...(assets || [])];

      // Add player images to assets
      if (playerData?.image_url) {
        assetsToCache.push(playerData.image_url);
      }

      // Add analysis PDFs (excluding videos)
      analysesToCache.forEach(analysis => {
        if (analysis.pdf_url) assetsToCache.push(analysis.pdf_url);
      });

      // Add program images
      programsToCache.forEach(program => {
        if (program.phase_image_url) assetsToCache.push(program.phase_image_url);
        if (program.player_image_url) assetsToCache.push(program.player_image_url);
      });

      // Add concept images
      conceptsToCache.forEach(concept => {
        if (concept.match_image_url) assetsToCache.push(concept.match_image_url);
        if (concept.scheme_image_url) assetsToCache.push(concept.scheme_image_url);
        if (concept.player_image_url) assetsToCache.push(concept.player_image_url);
      });

      await CacheManager.downloadForOffline(
        playersToCache,
        analysesToCache,
        programsToCache,
        conceptsToCache,
        updatesToCache,
        invoicesToCache,
        aphorismsToCache,
        assetsToCache,
        (progress) => setDownloadProgress(progress)
      );

      toast.success("Content downloaded for offline use", {
        description: "Everything except videos is now available offline"
      });

      await loadStorageInfo();
    } catch (error) {
      console.error('[Offline] Download error:', error);
      toast.error("Download failed", {
        description: "Could not cache content for offline use"
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleClearCache = async (category?: string) => {
    try {
      if (category) {
        await CacheManager.clearCache(category);
        toast.success(`${category} cache cleared`);
      } else {
        await CacheManager.clearAllCaches();
        toast.success("All offline content cleared");
      }
      await loadStorageInfo();
    } catch (error) {
      console.error('[Offline] Clear cache error:', error);
      toast.error("Failed to clear cache");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              Offline Access
            </CardTitle>
            <CardDescription>
              Download content to view without internet connection
            </CardDescription>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span>Storage Used</span>
            </div>
            <span className="font-mono text-muted-foreground">
              {storageUsage.used}MB / {storageUsage.quota}MB
            </span>
          </div>
          <Progress 
            value={(storageUsage.used / storageUsage.quota) * 100} 
            className="h-2"
          />
        </div>

        {/* Cached Content Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{cachedItems.analyses}</div>
            <div className="text-xs text-muted-foreground">Reports</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{cachedItems.players}</div>
            <div className="text-xs text-muted-foreground">Players</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{cachedItems.assets}</div>
            <div className="text-xs text-muted-foreground">Assets</div>
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Downloading content...</span>
              <span className="font-mono">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleDownloadForOffline}
            disabled={isDownloading || !isOnline}
            className="w-full"
            variant="default"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download for Offline"}
          </Button>

          <Button
            onClick={() => handleClearCache()}
            variant="outline"
            className="w-full"
            disabled={cachedItems.analyses + cachedItems.players + cachedItems.assets === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Offline Content
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/20 rounded-md">
          <p>• Downloaded content is available offline</p>
          <p>• Updates require internet connection</p>
          <p>• Cache cleared on app update</p>
          <p>• Storage shared across all tabs</p>
        </div>
      </CardContent>
    </Card>
  );
};
