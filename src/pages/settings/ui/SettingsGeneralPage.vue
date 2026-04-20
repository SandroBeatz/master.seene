<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import { useLocaleStore } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()
const { store: themePreference } = useColorMode()

const languages = [
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
]

const themes = computed(() => [
  { value: 'auto' as const, label: t('settings.general.themeSystem'), icon: 'i-lucide-monitor' },
  { value: 'light' as const, label: t('settings.general.themeLight'), icon: 'i-lucide-sun' },
  { value: 'dark' as const, label: t('settings.general.themeDark'), icon: 'i-lucide-moon' },
])
</script>

<template>
  <UTheme
    :ui="{
      page: {
        root: 'p-0',
      },
      pageHeader: {
        root: 'pt-0 pb-4 border-none',
      },
    }"
  >
    <UPage>
      <UPageHeader :title="t('settings.general.title')" />
      <UPageBody>
        <div class="flex flex-col gap-4">
          <UFormField
            :label="t('settings.general.language')"
            :description="t('settings.general.languageDescription')"
          >
            <UFieldGroup>
              <UButton
                v-for="lang in languages"
                :key="lang.code"
                :variant="localeStore.current === lang.code ? 'solid' : 'outline'"
                color="neutral"
                @click="localeStore.setLocale(lang.code)"
              >
                {{ lang.flag }} {{ lang.label }}
              </UButton>
            </UFieldGroup>
          </UFormField>

          <UFormField
            :label="t('settings.general.theme')"
            :description="t('settings.general.themeDescription')"
          >
            <UFieldGroup>
              <UButton
                v-for="theme in themes"
                :key="theme.value"
                :variant="themePreference === theme.value ? 'solid' : 'outline'"
                :leading-icon="theme.icon"
                color="neutral"
                @click="themePreference = theme.value"
              >
                {{ theme.label }}
              </UButton>
            </UFieldGroup>
          </UFormField>
        </div>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
