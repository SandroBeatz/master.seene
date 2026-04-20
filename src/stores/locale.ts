import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@shared/lib/i18n'

export const useLocaleStore = defineStore('locale', () => {
  const current = ref(i18n.global.locale.value)

  function setLocale(code: 'en' | 'fr' | 'ru') {
    i18n.global.locale.value = code
    current.value = code
    localStorage.setItem('locale', code)
  }

  return { current, setLocale }
})
