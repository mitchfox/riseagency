import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Check, Smartphone, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { StaffPWAUpdate } from "./StaffPWAUpdate";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const StaffPWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    toast.success("Refreshing application...");
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      toast.success("RISE Staff app installed successfully!");
    });

    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          setUpdateAvailable(true);
          toast.info("Update available! Please refresh to get the latest version.", {
            duration: 10000,
            action: {
              label: "Refresh",
              onClick: handleManualRefresh,
            },
          });
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [handleManualRefresh]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error("Install prompt not available");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success("Installing RISE Staff app...");
        setShowInstallButton(false);
      } else {
        toast.info("Installation cancelled");
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install error:', error);
      toast.error("Failed to install app");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">PWA MANAGEMENT</h2>
        <p className="text-muted-foreground">
          Install and manage RISE Staff as a Progressive Web App
        </p>
      </div>

      {/* Quick Refresh Button - Always Visible */}
      <Card className={updateAvailable ? "border-primary bg-primary/5" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {updateAvailable ? (
                <AlertCircle className="h-5 w-5 text-primary" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <div>
                <p className="font-semibold">
                  {updateAvailable ? "Update Available" : "Manual Refresh"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {updateAvailable 
                    ? "A new version is ready to install" 
                    : "Force refresh to get the latest version"}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              variant={updateAvailable ? "default" : "outline"}
              className="shrink-0"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="install" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="install" className="gap-2">
            <Download className="h-4 w-4" />
            Installation
          </TabsTrigger>
          <TabsTrigger value="updates" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Updates
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="install" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install App
            </CardTitle>
            <CardDescription>
              Add RISE Staff to your device home screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-sm">RISE Staff is already installed</span>
              </div>
            ) : showInstallButton ? (
              <Button 
                onClick={handleInstallClick} 
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Install RISE Staff
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                <p className="mb-2">To install on your device:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Chrome/Edge:</strong> Click the install icon in the address bar</li>
                  <li><strong>iOS Safari:</strong> Tap Share → Add to Home Screen</li>
                  <li><strong>Android:</strong> Tap the menu → Install app</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benefits</CardTitle>
            <CardDescription>
              Why install RISE Staff as an app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Quick access from home screen</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Works offline for viewing cached data</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Full screen experience without browser UI</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Faster loading times</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Push notifications support (coming soon)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

          <Card>
            <CardHeader>
              <CardTitle>Service Worker Status</CardTitle>
              <CardDescription>
                Check if the service worker is registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {navigator.serviceWorker?.controller ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    Service Worker is active
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Service Worker is not yet active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="updates" className="mt-6">
          <StaffPWAUpdate />
        </TabsContent>
      </Tabs>
    </div>
  );
};
