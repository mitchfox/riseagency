import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rise.riseapp',
  appName: 'riseagency',
  webDir: 'dist',
  server: {
    url: 'https://3f4a1ae9-5919-4d5b-a171-1795b6399352.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
