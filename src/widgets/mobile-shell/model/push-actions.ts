import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

/** A single action button rendered in the mobile push header's top-right slot. */
export interface MobilePushAction {
  icon: string
  ariaLabel: string
  onClick: () => void
  /** Nuxt UI button color; defaults to `neutral`. */
  color?: string
}

const PUSH_ACTIONS_KEY: InjectionKey<Ref<MobilePushAction[]>> = Symbol('mobile-push-actions')
// Tracks which page instance last registered actions, so a screen that unmounts
// after the next one has already registered can't wipe the newcomer's actions.
const PUSH_ACTIONS_OWNER_KEY: InjectionKey<Ref<symbol | null>> = Symbol('mobile-push-actions-owner')

/**
 * Provided once at the shell level so both the header (which renders the
 * actions) and the active pushed page (which sets them) resolve the same ref.
 * We avoid <Teleport> here — teleporting components into the header proved
 * crash-prone (null `emitsOptions`/`subTree` during patch/unmount).
 */
export function provideMobilePushActions() {
  const actions = ref<MobilePushAction[]>([])
  const owner = ref<symbol | null>(null)
  provide(PUSH_ACTIONS_KEY, actions)
  provide(PUSH_ACTIONS_OWNER_KEY, owner)
  return actions
}

/** Header-side: the live list of actions to render. */
export function useMobilePushActionsList(): Ref<MobilePushAction[]> {
  return inject(PUSH_ACTIONS_KEY, ref<MobilePushAction[]>([]))
}

/** Page-side: register/clear the header actions for the current screen. */
export function useMobilePushActions() {
  const actions = inject(PUSH_ACTIONS_KEY, null)
  const owner = inject(PUSH_ACTIONS_OWNER_KEY, null)
  // Stable identity for this page instance (one call site per page setup).
  const id = Symbol('mobile-push-actions-instance')
  return {
    setActions: (list: MobilePushAction[]) => {
      if (!actions) return
      actions.value = list
      if (owner) owner.value = id
    },
    clearActions: () => {
      if (!actions) return
      // Only clear if we're still the active owner. When navigating between two
      // screens that both register actions (e.g. clients list → client detail),
      // mount/unmount order isn't guaranteed: without this guard the outgoing
      // screen's unmount could clobber the actions the incoming screen just set.
      if (owner && owner.value !== id) return
      actions.value = []
      if (owner) owner.value = null
    },
  }
}
