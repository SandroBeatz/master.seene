import { watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'

const CANVAS_LIGHT = '#efede9'
const CANVAS_DARK = '#09090b' // zinc-950, matches html.dark's --app-canvas

/**
 * Wires the native shell chrome (status bar theme, splash hide, keyboard
 * avoidance) once the app has mounted. No-ops entirely on web — only runs
 * inside the Capacitor-wrapped iOS/Android app.
 */
export function initNativeShell(): void {
  if (!Capacitor.isNativePlatform()) return

  const { state: colorMode } = useColorMode()

  watch(
    colorMode,
    (mode) => {
      const dark = mode === 'dark'
      // setBackgroundColor is Android-only (iOS rejects it) — swallow either way.
      void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
      void StatusBar.setBackgroundColor({ color: dark ? CANVAS_DARK : CANVAS_LIGHT }).catch(
        () => {},
      )
    },
    { immediate: true },
  )

  void SplashScreen.hide()

  // iOS resizes the webview natively; this just keeps a focused input from
  // ending up hidden behind the keyboard on the (rarer) cases the OS doesn't.
  void Keyboard.addListener('keyboardWillShow', () => {
    const active = document.activeElement
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
}
