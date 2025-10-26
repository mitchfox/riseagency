import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const NotificationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
    checkIfNative();
  }, []);

  const checkIfNative = async () => {
    try {
      const permissions = await PushNotifications.checkPermissions();
      setIsNative(true);
    } catch (error) {
      setIsNative(false);
    }
  };

  const checkPermissionStatus = async () => {
    try {
      const permissions = await PushNotifications.checkPermissions();
      setPermissionStatus(permissions.receive);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await PushNotifications.requestPermissions();
      setPermissionStatus(result.receive);
      
      if (result.receive === 'granted') {
        await PushNotifications.register();
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications',
        });
      } else {
        toast({
          title: 'Notifications Denied',
          description: 'Please enable notifications in your device settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permissions',
        variant: 'destructive',
      });
    }
  };

  if (!isNative) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {permissionStatus === 'granted' ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          {permissionStatus === 'granted' 
            ? 'Notifications are enabled for this app'
            : 'Enable notifications to receive updates'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissionStatus !== 'granted' && (
          <Button onClick={requestPermission} className="w-full">
            Enable Notifications
          </Button>
        )}
        {permissionStatus === 'granted' && (
          <div className="text-sm text-muted-foreground">
            You're all set! You'll receive notifications about important updates.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
