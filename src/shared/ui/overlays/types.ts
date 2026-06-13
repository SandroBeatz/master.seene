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
