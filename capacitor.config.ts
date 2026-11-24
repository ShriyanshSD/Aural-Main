import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurel.owner',
  appName: 'AUREL Owner',
  webDir: 'dist-owner',
  server: {
    url: 'https://aurelstudios.vercel.app/owner-app/',
  },
};

export default config;
