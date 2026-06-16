<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ComingSoon } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <ComingSoon
    :title="t('settings.contacts.title')"
    :description="t('settings.contacts.comingSoon')"
    icon="i-lucide-at-sign"
  />
</template>
