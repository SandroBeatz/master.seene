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
  <div class="flex items-center justify-between">
    <div class="flex flex-col items-end mr-2">
      <Typography variant="endnote" class="text-muted">{{
        t('calendar.controls.today')
      }}</Typography>
      <Typography class="font-semibold">{{ formattedDate }}</Typography>
    </div>

    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-bell"
      :aria-label="t('nav.notifications')"
      class="rounded-full"
    />
  </div>
</template>
