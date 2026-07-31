/** Semantic color names registered for Nuxt UI components. */
export type DialogColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

export interface ConfirmDialogProps {
  /** Heading shown in the modal header. */
  title: string
  /** Optional explanatory body text. */
  description?: string
  /** Label for the confirming button. Defaults to `common.confirm`. */
  confirmLabel?: string
  /** Label for the dismissing button. Defaults to `common.cancel`. */
  cancelLabel?: string
  /** Color of the confirm button and the body icon. Use `error` for destructive actions. */
  color?: DialogColor
  /** Optional icon (e.g. `i-lucide-triangle-alert`) shown next to the description. */
  icon?: string
}

export interface AlertDialogProps {
  /** Heading shown in the modal header. */
  title: string
  /** Optional explanatory body text. */
  description?: string
  /** Label for the acknowledge button. Defaults to `common.ok`. */
  label?: string
  /** Color of the acknowledge button and the body icon. */
  color?: DialogColor
  /** Optional icon shown next to the description. */
  icon?: string
}

/** Static color → text-utility map (kept explicit so Tailwind can detect the classes). */
export const dialogColorText: Record<DialogColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-highlighted',
}

/** Behaviour of an {@link OptionsDrawerItem}. */
export type OptionsDrawerItemType = 'action' | 'switch'

/**
 * A single row inside an {@link OptionsDrawer}.
 *
 * All human-readable text (`label`, `description`) must already be translated by
 * the caller — the drawer never touches i18n itself.
 */
export interface OptionsDrawerItem {
  /** Stable identifier — echoed back in `select`/`toggle` so callers know which row fired. */
  id: string
  /** Primary label (already translated). */
  label: string
  /** Optional secondary line shown under the label. */
  description?: string
  /** Leading icon, e.g. `i-lucide-calendar-range`. */
  icon?: string
  /**
   * Icon tint. Either a semantic {@link DialogColor} (mapped to a `text-*` utility)
   * or any raw class string (e.g. `text-pink-500`). Defaults to the muted foreground.
   */
  iconColor?: DialogColor | string
  /** `'action'` (clickable row) or `'switch'` (trailing USwitch). Defaults to `'action'`. */
  type?: OptionsDrawerItemType
  /** For `type: 'switch'` — the current on/off state. */
  checked?: boolean
  /** Greys the row out and blocks interaction. */
  disabled?: boolean
  /**
   * Per-row override of the drawer's `closeOnSelect`. When omitted the drawer-level
   * setting applies.
   */
  closeOnSelect?: boolean
}

export interface OptionsDrawerProps {
  /** Heading shown in the drawer header. */
  title?: string
  /** The rows to render. */
  items: OptionsDrawerItem[]
  /** Close the drawer after a row is activated. Defaults to `true`. */
  closeOnSelect?: boolean
}

/** Resolves an option's `iconColor` to a Tailwind text-utility class. */
export function optionsDrawerIconClass(color: OptionsDrawerItem['iconColor']): string {
  if (!color) return 'text-muted'
  return color in dialogColorText ? dialogColorText[color as DialogColor] : color
}
