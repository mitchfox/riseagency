import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = (playerId?: string) => {
  useEffect(() => {
    // Only initialize push notifications on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform() || !playerId) {
      console.log('Push notifications are only available on native platforms with player ID');
      return;
    }

    const savePushToken = async (token: string, deviceType: string) => {
      try {
        const { error } = await supabase
          .from('push_notification_tokens')
          .upsert({
            player_id: playerId,
            token: token,
            device_type: deviceType,
          }, {
            onConflict: 'token'
          });

        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved successfully');
        }
      } catch (error) {
        console.error('Failed to save push token:', error);
      }
    };

    const initPushNotifications = async () => {
      try {
        // Request permission to use push notifications
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    // Setup listeners
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      // Determine device type
      const deviceType = Capacitor.getPlatform(); // 'ios' or 'android'
      
      // Save token to database
      savePushToken(token.value, deviceType);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      toast({
        title: notification.title || 'Notification',
        description: notification.body,
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification.actionId, notification.notification);
      // Handle notification tap - could navigate to relevant screen based on notification data
      // For example: if notification.data.type === 'analysis', navigate to analysis tab
    });

    initPushNotifications();

    // Cleanup
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [playerId]);
};
