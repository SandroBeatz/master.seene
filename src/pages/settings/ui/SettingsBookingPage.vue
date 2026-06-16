<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ComingSoon } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <ComingSoon
    :title="t('settings.booking.title')"
    :description="t('settings.booking.comingSoon')"
    icon="i-lucide-calendar-check"
  />
</template>
