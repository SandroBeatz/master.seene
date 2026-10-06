export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * A selectable primary color. Ionic derives component styling from the full
 * `--ion-color-primary*` set, so each preset carries the six values Ionic needs
 * (base + rgb, the contrast text color + rgb, and the shade/tint used for
 * pressed/hover states).
 */
export interface PrimaryPreset {
  key: string
  base: string
  rgb: string
  contrast: string
  contrastRgb: string
  shade: string
  tint: string
}

// Tailwind-500 hues, with shade ≈ -12% lightness and tint ≈ +10% toward white.
// `amber` is the brand primary and the default.
export const PRIMARY_PRESETS: PrimaryPreset[] = [
  {
    key: 'amber',
    base: '#f59e0b',
    rgb: '245,158,11',
    contrast: '#000000',
    contrastRgb: '0,0,0',
    shade: '#d78b0a',
    tint: '#f6a823',
  },
  {
    key: 'blue',
    base: '#3b82f6',
    rgb: '59,130,246',
    contrast: '#ffffff',
    contrastRgb: '255,255,255',
    shade: '#3472d8',
    tint: '#4f8ff7',
  },
  {
    key: 'emerald',
    base: '#10b981',
    rgb: '16,185,129',
    contrast: '#ffffff',
    contrastRgb: '255,255,255',
    shade: '#0ea372',
    tint: '#28c08e',
  },
  {
    key: 'violet',
    base: '#8b5cf6',
    rgb: '139,92,246',
    contrast: '#ffffff',
    contrastRgb: '255,255,255',
    shade: '#7a51d8',
    tint: '#976cf7',
  },
  {
    key: 'rose',
    base: '#f43f5e',
    rgb: '244,63,94',
    contrast: '#ffffff',
    contrastRgb: '255,255,255',
    shade: '#d73753',
    tint: '#f5526e',
  },
]

export const DEFAULT_PRIMARY = 'amber'
export const DEFAULT_THEME: ThemeMode = 'system'
