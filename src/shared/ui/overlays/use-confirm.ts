import { useOverlay } from '@nuxt/ui/composables'
import ConfirmDialog from './ConfirmDialog.vue'
import type { ConfirmDialogProps } from './types'

/**
 * Programmatic confirmation dialog.
 *
 * Must be called from a component `setup`. Returns an opener that resolves to
 * `true` when the user confirms and `false` when they cancel or dismiss.
 *
 * @example
 * const confirm = useConfirm()
 * if (await confirm({ title: 'Delete?', color: 'error' })) {
 *   // proceed
 * }
 */
export function useConfirm() {
  const overlay = useOverlay()
  const dialog = overlay.create(ConfirmDialog)

  return async (props: ConfirmDialogProps): Promise<boolean> => {
    const instance = dialog.open(props)
    return (await instance.result) ?? false
  }
}
