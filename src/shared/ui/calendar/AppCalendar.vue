<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore } from '@shared/lib/locale'

// Thin wrapper over Nuxt UI's `UCalendar`. It supplies app-wide defaults —
// the active locale and a locale-aware first day of week — while forwarding
// every attribute, event, and slot (single value, `range`, `#day`, …)
// straight through to the underlying calendar.
defineOptions({ inheritAttrs: false })

const localeStore = useLocaleStore()

// App locale code → BCP-47 tag understood by `@internationalized/date`.
const BCP47: Record<string, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ru: 'ru-RU',
}

// Reka/UCalendar does not derive the first day of week from `locale`; its
// `week-starts-on` defaults to Sunday. Drive it from the locale explicitly:
// `0` = Sunday (en), `1` = Monday (fr, ru).
const locale = computed(() => BCP47[localeStore.current] ?? 'en-US')
const weekStartsOn = computed<0 | 1>(() => (localeStore.current === 'en' ? 0 : 1))
</script>

<template>
  <UCalendar :locale="locale" :year-controls="false" :week-starts-on="weekStartsOn" v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </UCalendar>
</template>
