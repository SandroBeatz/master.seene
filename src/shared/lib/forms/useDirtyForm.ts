import { computed, getCurrentInstance, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export interface UseDirtyFormOptions {
  /**
   * Confirmation message shown when the user tries to leave the page with
   * unsaved changes. Pass a translated string from the call site.
   */
  message?: string
  /**
   * Whether to guard navigation / page unload while dirty. Defaults to `true`.
   */
  guard?: boolean
}

export interface UseDirtyForm<T> {
  /** True when the current state differs from the last saved snapshot. */
  isDirty: ComputedRef<boolean>
  /** Set externally to `true` while a save request is in flight. */
  isSaving: Ref<boolean>
  /** Mark the form clean. Pass new values to adopt them, otherwise the current state becomes the snapshot. */
  reset: (values?: T) => void
  /** Revert the form back to the last saved snapshot. */
  discard: () => void
}

function clone<T>(value: T): T {
  // JSON clone keeps the snapshot decoupled from the reactive proxy and stays
  // consistent with the JSON-based equality check below. Form state is plain
  // serializable data (strings, numbers, booleans, arrays).
  return JSON.parse(JSON.stringify(value))
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Tracks whether a form's reactive state has diverged from its last saved
 * snapshot, and guards against losing changes on navigation / tab close.
 *
 * The `state` ref must hold the full form object (e.g. `ref({ name: '', ... })`);
 * `discard()` replaces `state.value` with a clone of the snapshot.
 *
 * Pair with the `FormSaveBar` component: bind `:dirty="isDirty"` / `:saving="isSaving"`,
 * call `reset()` after a successful save and `discard()` on the discard action.
 */
export function useDirtyForm<T extends object>(
  state: Ref<T>,
  options: UseDirtyFormOptions = {},
): UseDirtyForm<T> {
  const { guard = true } = options

  const snapshot = ref(clone(state.value)) as Ref<T>
  const isSaving = ref(false)

  const isDirty = computed(() => !deepEqual(state.value, snapshot.value))

  function reset(values?: T): void {
    snapshot.value = clone(values ?? state.value)
  }

  function discard(): void {
    state.value = clone(snapshot.value)
  }

  if (guard) {
    // Guard SPA navigation away from the page.
    if (getCurrentInstance()) {
      onBeforeRouteLeave(() => {
        if (!isDirty.value) return true
        return window.confirm(options.message ?? 'You have unsaved changes. Leave without saving?')
      })
    }

    // Guard full page unload / tab close.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty.value) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    onScopeDispose(() => window.removeEventListener('beforeunload', onBeforeUnload))
  }

  return { isDirty, isSaving, reset, discard }
}
