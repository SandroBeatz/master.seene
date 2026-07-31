/** Semantic color names used to tint an option's leading icon. */
export type SemanticColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'

/** Static color → text-utility map (kept explicit so Tailwind can detect the classes). */
export const semanticColorText: Record<SemanticColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-highlighted',
}

/** Behaviour of an {@link OptionsListItem}. */
export type OptionsListItemType = 'action' | 'switch'

/**
 * A single row inside an {@link OptionsList}.
 *
 * All human-readable text (`label`, `description`) must already be translated by
 * the caller — the list never touches i18n itself.
 */
export interface OptionsListItem {
  /** Stable identifier — echoed back in `select`/`toggle` so callers know which row fired. */
  id: string
  /** Primary label (already translated). */
  label: string
  /** Optional secondary line shown under the label. */
  description?: string
  /** Leading icon, e.g. `i-lucide-calendar-range`. Omit for an icon-less list. */
  icon?: string
  /**
   * Icon tint. Either a semantic {@link SemanticColor} (mapped to a `text-*` utility)
   * or any raw class string (e.g. `text-pink-500`). Defaults to the muted foreground.
   */
  iconColor?: SemanticColor | string
  /** `'action'` (clickable row) or `'switch'` (trailing USwitch). Defaults to `'action'`. */
  type?: OptionsListItemType
  /** For `type: 'switch'` — the current on/off state. */
  checked?: boolean
  /**
   * Marks the row as a single-choice selection option. When set (`true`/`false`)
   * the row renders as a selection (check when `true`, blank when `false`) instead
   * of the navigation chevron. Leave `undefined` for plain navigation/action rows.
   */
  active?: boolean
  /** Greys the row out and blocks interaction. */
  disabled?: boolean
  /**
   * Hint consumed by containers (e.g. the drawer) to close after this row is
   * activated. The list itself does not act on it.
   */
  closeOnSelect?: boolean
}

export interface OptionsListProps {
  /** The rows to render. */
  items: OptionsListItem[]
}

/** Resolves an option's `iconColor` to a Tailwind text-utility class. */
export function optionsListIconClass(color: OptionsListItem['iconColor']): string {
  if (!color) return 'text-default'
  return color in semanticColorText ? semanticColorText[color as SemanticColor] : color
}
