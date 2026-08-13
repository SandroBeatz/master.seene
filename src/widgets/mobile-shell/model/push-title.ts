import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

const PUSH_TITLE_KEY: InjectionKey<Ref<string>> = Symbol('mobile-push-title')

export function provideMobilePushTitle() {
  const title = ref('')
  provide(PUSH_TITLE_KEY, title)
  return title
}

// Lets a pushed screen (e.g. a client's detail page) supply its own back-header
// title at runtime, for routes whose title can't be a static i18n key.
export function useMobilePushTitle() {
  const title = inject(PUSH_TITLE_KEY, null)
  return {
    setTitle: (value: string) => {
      if (title) title.value = value
    },
  }
}
