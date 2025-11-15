import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const StaffPushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
    checkSubscriptionStatus();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[Staff Push] Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error("Notification permission denied");
        return;
      }

      // Get VAPID public key
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('init-web-push');
      if (vapidError) throw vapidError;

      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      // Save subscription to database
      const { error: saveError } = await supabase.functions.invoke('subscribe-staff-push', {
        body: { subscription: subscription.toJSON() }
      });

      if (saveError) throw saveError;

      setIsSubscribed(true);
      toast.success("Push notifications enabled!", {
        description: "You'll receive notifications for important events"
      });

      // Send test notification
      new Notification("RISE Staff Notifications", {
        body: "You're now subscribed to staff notifications!",
        icon: "/lovable-uploads/icon-192x192.png",
      });
    } catch (error) {
      console.error('[Staff Push] Subscribe error:', error);
      toast.error("Failed to enable notifications", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from('staff_web_push_subscriptions')
        .delete()
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      console.error('[Staff Push] Unsubscribe error:', error);
      toast.error("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bebas mb-2">PUSH NOTIFICATIONS</h2>
        <p className="text-muted-foreground">
          Receive real-time alerts for important events
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isSubscribed ? (
                  <>
                    <Bell className="h-5 w-5 text-green-500" />
                    Notifications Enabled
                  </>
                ) : (
                  <>
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                    Notifications Disabled
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isSubscribed 
                  ? "You're receiving push notifications for staff events"
                  : "Enable notifications to stay updated on important events"
                }
              </CardDescription>
            </div>
            <Badge variant={isSubscribed ? "default" : "secondary"}>
              {isSubscribed ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {permission === 'denied' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                Notification permission denied. Please enable notifications in your browser settings.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed ? "Currently active" : "Not active"}
                </p>
              </div>
            </div>
            <Button
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={isLoading || permission === 'denied'}
              variant={isSubscribed ? "outline" : "default"}
            >
              {isLoading ? "Processing..." : isSubscribed ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            You'll receive notifications for these events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div>
              <p className="font-medium">Site Visitors</p>
              <p className="text-sm text-muted-foreground">Player portal visits</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div>
              <p className="font-medium">Form Submissions</p>
              <p className="text-sm text-muted-foreground">New contact forms, scout requests</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div>
              <p className="font-medium">Content Uploads</p>
              <p className="text-sm text-muted-foreground">New clips, playlist changes</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2">
            <p className="font-medium">How Notifications Work:</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Receive alerts even when the app is closed</li>
              <li>• Notifications work on desktop and mobile</li>
              <li>• Click notifications to open relevant section</li>
              <li>• Can be disabled at any time</li>
              <li>• Respects your browser's Do Not Disturb settings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
