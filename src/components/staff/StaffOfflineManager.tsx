import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Trash2, HardDrive, Database, FileText, Image, Users } from "lucide-react";
import { CacheManager } from "@/lib/cacheManager";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const StaffOfflineManager = () => {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const [cachedItems, setCachedItems] = useState({
    players: 0,
    analyses: 0,
    assets: 0
  });

  useEffect(() => {
    loadStorageInfo();
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

  const handleDownloadAllPlayers = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('*');

      if (error) throw error;

      const playerImages = players
        ?.map(p => p.image_url)
        .filter(Boolean) as string[];

      await CacheManager.downloadForOffline(
        players || [],
        [],
        [],
        [],
        [],
        [],
        [],
        playerImages,
        (progress) => setDownloadProgress(progress)
      );

      toast.success("Players downloaded for offline use", {
        description: `${players?.length || 0} players cached`
      });

      await loadStorageInfo();
    } catch (error) {
      console.error('[Offline] Download error:', error);
      toast.error("Download failed", {
        description: "Could not cache players"
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadRecentReports = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: analyses, error } = await supabase
        .from('player_analysis')
        .select('*')
        .gte('analysis_date', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const reportAssets = analyses
        ?.flatMap(a => [a.pdf_url, a.video_url])
        .filter(Boolean) as string[];

      await CacheManager.downloadForOffline(
        [],
        analyses || [],
        [],
        [],
        [],
        [],
        [],
        reportAssets,
        (progress) => setDownloadProgress(progress)
      );

      toast.success("Reports downloaded for offline use", {
        description: `${analyses?.length || 0} reports cached`
      });

      await loadStorageInfo();
    } catch (error) {
      console.error('[Offline] Download error:', error);
      toast.error("Download failed", {
        description: "Could not cache reports"
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">OFFLINE CONTENT MANAGEMENT</h2>
        <p className="text-muted-foreground">
          Download content for offline access in the field or at stadiums
        </p>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Used Storage</span>
              <span className="font-mono text-muted-foreground">
                {storageUsage.used}MB / {storageUsage.quota}MB
              </span>
            </div>
            <Progress 
              value={(storageUsage.used / storageUsage.quota) * 100} 
              className="h-3"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{cachedItems.players}</div>
                <div className="text-xs text-muted-foreground">Players</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{cachedItems.analyses}</div>
                <div className="text-xs text-muted-foreground">Reports</div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{cachedItems.assets}</div>
                <div className="text-xs text-muted-foreground">Assets</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Download Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Content
          </CardTitle>
          <CardDescription>
            Cache content for offline viewing at matches and training sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDownloading && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Downloading content...</span>
                <span className="font-mono font-bold">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          <div className="grid gap-3">
            <Button
              onClick={handleDownloadAllPlayers}
              disabled={isDownloading}
              variant="default"
              className="w-full justify-start"
            >
              <Users className="mr-2 h-4 w-4" />
              Download All Players
            </Button>

            <Button
              onClick={handleDownloadRecentReports}
              disabled={isDownloading}
              variant="default"
              className="w-full justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Download Recent Reports (30 days)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Clear cached content to free up storage space
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => handleClearCache('players')}
            variant="outline"
            className="w-full justify-start"
            disabled={cachedItems.players === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Player Cache ({cachedItems.players} items)
          </Button>

          <Button
            onClick={() => handleClearCache('analyses')}
            variant="outline"
            className="w-full justify-start"
            disabled={cachedItems.analyses === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Report Cache ({cachedItems.analyses} items)
          </Button>

          <Button
            onClick={() => handleClearCache('assets')}
            variant="outline"
            className="w-full justify-start"
            disabled={cachedItems.assets === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Asset Cache ({cachedItems.assets} items)
          </Button>

          <Button
            onClick={() => handleClearCache()}
            variant="destructive"
            className="w-full justify-start"
            disabled={cachedItems.analyses + cachedItems.players + cachedItems.assets === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Offline Content
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <p className="font-medium">How Offline Mode Works:</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Download content while online for offline access</li>
              <li>• Cached content updates automatically when online</li>
              <li>• Perfect for stadium visits with poor connectivity</li>
              <li>• Cache persists across app restarts</li>
              <li>• Storage automatically managed by browser</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
