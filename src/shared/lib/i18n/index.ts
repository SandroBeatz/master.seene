import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'
import ru from './locales/ru'

// Guarded: some test/SSR runtimes expose a `localStorage` global that isn't backed
// by a real store (e.g. Node's experimental impl without --localstorage-file).
const savedLocale = (typeof localStorage !== 'undefined' ? localStorage.getItem('locale') : null) ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, fr, ru },
})
