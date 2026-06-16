<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ComingSoon } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <ComingSoon
    :title="t('settings.account.title')"
    :description="t('settings.account.comingSoon')"
    icon="i-lucide-user-cog"
  />
</template>
