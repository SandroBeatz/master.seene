<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ComingSoon } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <ComingSoon
    :title="t('settings.workingHours.title')"
    :description="t('settings.workingHours.comingSoon')"
    icon="i-lucide-clock"
  />
</template>
