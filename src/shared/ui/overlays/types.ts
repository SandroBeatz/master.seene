import {
  semanticColorText,
  optionsListIconClass,
  type SemanticColor,
  type OptionsListItem,
  type OptionsListItemType,
} from '../options-list/types'

/** Semantic color names registered for Nuxt UI components. */
export type DialogColor = SemanticColor

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
export const dialogColorText: Record<DialogColor, string> = semanticColorText

/**
 * The options list moved to `shared/ui/options-list`. These aliases keep the
 * historical `OptionsDrawer*` names working for existing callers.
 */
export type OptionsDrawerItem = OptionsListItem
export type OptionsDrawerItemType = OptionsListItemType
export const optionsDrawerIconClass = optionsListIconClass

export interface OptionsDrawerProps {
  /** Heading shown in the drawer header. */
  title?: string
  /** The rows to render. */
  items: OptionsDrawerItem[]
  /** Close the drawer after a row is activated. Defaults to `true`. */
  closeOnSelect?: boolean
}
