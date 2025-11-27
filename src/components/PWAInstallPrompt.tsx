import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      console.log('[PWA] App is already installed');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
      toast({
        title: "App Installed!",
        description: "RISE Portal has been added to your device.",
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker and check for updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered');

          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  toast({
                    title: "Update Available",
                    description: "A new version of the app is ready. Click 'Update Now' to refresh.",
                    duration: 10000,
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Install Not Available",
        description: "This app can be installed from your browser menu.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install');
      } else {
        console.log('[PWA] User dismissed install');
      }

      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
    }
  };

  const handleUpdateClick = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  const handleDismissUpdate = () => {
    setUpdateAvailable(false);
  };

  // Always show something - either install prompt or instructions
  if (isStandalone && !updateAvailable) {
    return (
      <Card className="bg-green-500/10 border-green-500/20 p-4">
        <div className="flex items-center gap-3">
          <Download className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-semibold text-foreground">App Installed ✓</p>
            <p className="text-sm text-muted-foreground">
              You're running RISE Portal as an installed app
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Update Available - Show for both installed and non-installed */}
      {updateAvailable && (
        <Card className="bg-primary/10 border-primary p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Update Available</p>
                <p className="text-sm text-muted-foreground">
                  A new version is ready to install
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleUpdateClick} hoverEffect className="font-bebas uppercase">
                Update Now
              </Button>
              <Button 
                onClick={handleDismissUpdate} 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Show install status if installed but no update */}
      {isStandalone && !updateAvailable && (
        <Card className="bg-green-500/10 border-green-500/20 p-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold text-foreground">App Installed ✓</p>
              <p className="text-sm text-muted-foreground">
                You're running RISE Portal as an installed app
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Browser Install Prompt */}
      {showInstallButton && deferredPrompt && (
        <Card className="bg-card border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Install RISE Portal</p>
                <p className="text-sm text-muted-foreground">
                  Add to your home screen for quick access
                </p>
              </div>
            </div>
            <Button onClick={handleInstallClick} hoverEffect className="font-bebas uppercase">
              Install App
            </Button>
          </div>
        </Card>
      )}

      {/* iOS Instructions */}
      {isIOS && !isStandalone && (
        <Card className="bg-card border-border p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Install on iOS</p>
                <p className="text-sm text-muted-foreground">
                  Add RISE Portal to your home screen
                </p>
              </div>
            </div>
            <ol className="text-sm text-muted-foreground space-y-2 pl-8 list-decimal">
              <li>Tap the Share button <span className="inline-block">⬆️</span> at the bottom of Safari</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right corner</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Chrome/Android Instructions */}
      {!isIOS && !showInstallButton && !isStandalone && (
        <Card className="bg-card border-border p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Chrome className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Install RISE Portal</p>
                <p className="text-sm text-muted-foreground">
                  Add to your device for quick access
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Chrome/Edge:</strong></p>
              <ol className="pl-6 list-decimal space-y-1">
                <li>Tap the menu (⋮) in the top right</li>
                <li>Select "Install app" or "Add to Home screen"</li>
              </ol>
              <p className="pt-2"><strong>Firefox:</strong></p>
              <ol className="pl-6 list-decimal space-y-1">
                <li>Tap the menu (⋯) at the bottom</li>
                <li>Select "Install" or "Add to Home screen"</li>
              </ol>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
