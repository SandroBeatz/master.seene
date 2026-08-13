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

/**
 * Provided once at the shell level so both the header (which renders the
 * actions) and the active pushed page (which sets them) resolve the same ref.
 * We avoid <Teleport> here — teleporting components into the header proved
 * crash-prone (null `emitsOptions`/`subTree` during patch/unmount).
 */
export function provideMobilePushActions() {
  const actions = ref<MobilePushAction[]>([])
  provide(PUSH_ACTIONS_KEY, actions)
  return actions
}

/** Header-side: the live list of actions to render. */
export function useMobilePushActionsList(): Ref<MobilePushAction[]> {
  return inject(PUSH_ACTIONS_KEY, ref<MobilePushAction[]>([]))
}

/** Page-side: register/clear the header actions for the current screen. */
export function useMobilePushActions() {
  const actions = inject(PUSH_ACTIONS_KEY, null)
  return {
    setActions: (list: MobilePushAction[]) => {
      if (actions) actions.value = list
    },
    clearActions: () => {
      if (actions) actions.value = []
    },
  }
}
