import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3f4a1ae959194d5ba1711795b6399352',
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
