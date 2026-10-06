import { Haptics, ImpactStyle } from '@capacitor/haptics'

/**
 * Short tactile tick for gestures (long press, view switch). Capacitor's web
 * implementation falls back to `navigator.vibrate`, so this is safe to call
 * from the browser build too; failures are ignored — haptics are cosmetic.
 */
export function hapticImpact(style: 'light' | 'medium' = 'light'): void {
  void Haptics.impact({
    style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
  }).catch(() => undefined)
}
