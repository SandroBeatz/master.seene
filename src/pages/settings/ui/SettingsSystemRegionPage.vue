<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import { useLocaleStore } from '@shared/lib/locale'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const localeStore = useLocaleStore()
const { store: themePreference } = useColorMode()

const languages = [
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'ru' as const, label: 'Русский', flag: '🇷🇺' },
]

const themes = computed(() => [
  { value: 'auto' as const, label: t('settings.systemRegion.themeSystem'), icon: 'i-lucide-monitor' },
  { value: 'light' as const, label: t('settings.systemRegion.themeLight'), icon: 'i-lucide-sun' },
  { value: 'dark' as const, label: t('settings.systemRegion.themeDark'), icon: 'i-lucide-moon' },
])

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h5" class="text-highlighted font-bold">{{
          t('settings.systemRegion.title')
        }}</Typography>
      </div>
    </template>
    <div class="flex flex-col gap-4">
      <UFormField
        :label="t('settings.systemRegion.language')"
        :description="t('settings.systemRegion.languageDescription')"
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
        :label="t('settings.systemRegion.theme')"
        :description="t('settings.systemRegion.themeDescription')"
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
  </UCard>
</template>
