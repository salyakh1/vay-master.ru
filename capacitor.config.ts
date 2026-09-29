import type { CapacitorConfig } from '@capacitor/cli'

/**
 * VayMaster native shell (Capacitor).
 * WebView loads the live site so Next.js API/SSR/auth keep working.
 * Local debug: set CAP_SERVER_URL=http://10.0.2.2:3000 (Android emulator)
 * or your LAN IP, then `npx cap sync`.
 */
const serverUrl = process.env.CAP_SERVER_URL || 'https://vay-master.ru'

const config: CapacitorConfig = {
  appId: 'ru.vaymaster.app',
  appName: 'VayMaster',
  webDir: 'mobile/www',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
    allowNavigation: [
      'vay-master.ru',
      'www.vay-master.ru',
      '*.supabase.co',
      '*.supabase.in',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#F4F4F4',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F4F4F4',
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#F4F4F4',
  },
}

export default config
