import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'
import ru from './locales/ru'

const savedLocale = localStorage.getItem('locale') ?? 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, fr, ru },
})
