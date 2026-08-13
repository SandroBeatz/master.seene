<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Typography } from '@shared/ui'

const { t, locale } = useI18n()

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date())
})
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="hidden flex-col items-end sm:flex">
      <Typography variant="endnote" class="text-muted">{{
        t('calendar.controls.today')
      }}</Typography>
      <Typography class="font-semibold text-highlighted">{{ formattedDate }}</Typography>
    </div>

    <UButton
      color="neutral"
      size="xl"
      variant="ghost"
      icon="i-lucide-bell"
      :aria-label="t('nav.notifications')"
    />
  </div>
</template>
