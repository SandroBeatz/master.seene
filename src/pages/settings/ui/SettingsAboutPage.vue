<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Page } from '@shared/ui'

const { t } = useI18n()
</script>

<template>
  <Page :title="t('settings.about.title')" :description="t('settings.about.description')">
    <p class="text-sm text-muted">{{ t('settings.about.version') }} 1.0.0</p>
  </Page>
</template>
