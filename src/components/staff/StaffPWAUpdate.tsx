import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const StaffPWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed - new service worker active');
        if (!isRefreshing) {
          setIsRefreshing(true);
          window.location.reload();
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('[PWA] Update available:', event.data.version);
          setNewVersion(event.data.version);
          setUpdateAvailable(true);
          toast.info("Update available! Please refresh to get the latest version.", {
            duration: 10000,
            action: {
              label: "Refresh",
              onClick: handleUpdate,
            },
          });
        }
      });

      // Check for updates every 5 minutes
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
            console.log('[PWA] Checked for updates');
          }
        } catch (error) {
          console.error('[PWA] Update check failed:', error);
        }
      };

      // Initial check
      checkForUpdates();

      // Set up periodic checks
      const interval = setInterval(checkForUpdates, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isRefreshing]);

  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          // Tell the waiting service worker to take over
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          toast.success("Refreshing to latest version...");
        } else {
          // No waiting worker, just reload
          window.location.reload();
        }
      } catch (error) {
        console.error('[PWA] Update failed:', error);
        toast.error("Failed to update. Please refresh manually.");
      }
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">PWA UPDATES</h2>
        <p className="text-muted-foreground">
          Manage application updates and ensure you're running the latest version
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {updateAvailable && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <AlertCircle className="h-5 w-5" />
                Update Available
              </CardTitle>
              <CardDescription>
                A new version of RISE Staff is ready to install
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newVersion && (
                <p className="text-sm text-muted-foreground">
                  Version: <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{newVersion}</code>
                </p>
              )}
              <Button onClick={handleUpdate} className="w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Now
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Manual Refresh
            </CardTitle>
            <CardDescription>
              Force refresh to get the latest version
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you're experiencing issues or want to ensure you have the latest version, 
              you can manually refresh the application.
            </p>
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              className="w-full"
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Application'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Information</CardTitle>
            <CardDescription>
              Current caching and update strategy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Strategy:</span>
                <span className="font-medium">Network-First</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Network Timeout:</span>
                <span className="font-medium">3 seconds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Update Check:</span>
                <span className="font-medium">Every 5 minutes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cache Fallback:</span>
                <span className="font-medium">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How Updates Work</CardTitle>
            <CardDescription>
              Understanding the update mechanism
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">1.</span>
                <span>App checks for updates every 5 minutes automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">2.</span>
                <span>When an update is found, you'll see a notification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">3.</span>
                <span>Click "Update Now" to install the latest version</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">4.</span>
                <span>The app will refresh automatically with new changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">5.</span>
                <span>All data is preserved during updates</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
