import { useOverlay } from '@nuxt/ui/composables'
import AlertDialog from './AlertDialog.vue'
import type { AlertDialogProps } from './types'

/**
 * Programmatic alert dialog (single acknowledge button).
 *
 * Must be called from a component `setup`. Returns an opener that resolves once
 * the user acknowledges or dismisses the alert.
 *
 * @example
 * const alert = useAlert()
 * await alert({ title: 'Saved', description: 'Your changes were stored.', color: 'success' })
 */
export function useAlert() {
  const overlay = useOverlay()
  const dialog = overlay.create(AlertDialog)

  return async (props: AlertDialogProps): Promise<void> => {
    const instance = dialog.open(props)
    await instance.result
  }
}
