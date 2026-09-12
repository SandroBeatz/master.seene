import type { CapacitorConfig } from '@capacitor/cli'

// Splash/status bar colors mirror --app-canvas (light) / zinc-950 (dark) from
// src/app/styles/main.css. Actual runtime theme (light/dark/auto) is applied
// reactively by src/shared/lib/native — this is just the launch-time default.
const config: CapacitorConfig = {
  appId: 'com.seene.app',
  appName: 'Seene',
  // Native app serves the mobile (Ionic) build. Produce it with
  // `bun build:mobile` before `npx cap sync`.
  webDir: 'dist-mobile',
  plugins: {
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: false,
      backgroundColor: '#efede9',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#efede9',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
