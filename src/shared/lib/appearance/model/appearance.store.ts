import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  PRIMARY_PRESETS,
  DEFAULT_PRIMARY,
  DEFAULT_THEME,
  type ThemeMode,
  type PrimaryPreset,
} from './presets'

const THEME_KEY = 'appearance.theme'
const PRIMARY_KEY = 'appearance.primary'

function readTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_THEME
}

function readPrimary(): string {
  const v = localStorage.getItem(PRIMARY_KEY)
  return v && PRIMARY_PRESETS.some((p) => p.key === v) ? v : DEFAULT_PRIMARY
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Dark mode toggles Ionic's class-based palette (imported in main.ts) plus our
// Tailwind `dark:` variant, which is wired to the same class in styles/main.css.
function applyTheme(mode: ThemeMode): void {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark())
  document.documentElement.classList.toggle('ion-palette-dark', isDark)
}

// Primary color is applied by overriding the `--ion-color-primary*` variables
// on the document root; every Ionic component reads its accent from these.
function applyPrimary(key: string): void {
  const preset =
    PRIMARY_PRESETS.find((p) => p.key === key) ??
    PRIMARY_PRESETS.find((p) => p.key === DEFAULT_PRIMARY)!
  const root = document.documentElement.style
  root.setProperty('--ion-color-primary', preset.base)
  root.setProperty('--ion-color-primary-rgb', preset.rgb)
  root.setProperty('--ion-color-primary-contrast', preset.contrast)
  root.setProperty('--ion-color-primary-contrast-rgb', preset.contrastRgb)
  root.setProperty('--ion-color-primary-shade', preset.shade)
  root.setProperty('--ion-color-primary-tint', preset.tint)
}

/**
 * Mobile-only appearance state: light/dark/system theme and the primary color.
 * Both persist to localStorage (read synchronously at store creation, so the
 * choice survives reloads) and apply straight to the DOM. Desktop keeps its own
 * theming via Nuxt UI — this store belongs to the Ionic build target.
 */
export const useAppearanceStore = defineStore('appearance', () => {
  const theme = ref<ThemeMode>(readTheme())
  const primary = ref<string>(readPrimary())

  const onSystemChange = () => {
    if (theme.value === 'system') applyTheme('system')
  }

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    localStorage.setItem(THEME_KEY, mode)
    applyTheme(mode)
  }

  function setPrimary(key: string): void {
    if (!PRIMARY_PRESETS.some((p) => p.key === key)) return
    primary.value = key
    localStorage.setItem(PRIMARY_KEY, key)
    applyPrimary(key)
  }

  // Apply the persisted appearance and keep `system` in sync with the OS. Call
  // once at boot (main.ts), before mount.
  function init(): void {
    applyTheme(theme.value)
    applyPrimary(primary.value)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onSystemChange)
  }

  return {
    theme,
    primary,
    presets: PRIMARY_PRESETS as readonly PrimaryPreset[],
    setTheme,
    setPrimary,
    init,
  }
})
