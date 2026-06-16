<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ComingSoon } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <ComingSoon
    :title="t('settings.notifications.title')"
    :description="t('settings.notifications.comingSoon')"
    icon="i-lucide-bell"
  />
</template>
