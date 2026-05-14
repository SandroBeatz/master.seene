<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="$t('analytics.title')"
      :description="$t('analytics.description')"
      :ui="{ root: 'border-none' }"
    />
    <UPageBody>
      <div class="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <UIcon name="i-lucide-chart-area" class="size-16 text-zinc-300" />
        <p class="text-lg font-medium text-zinc-500">{{ t('analytics.comingSoon') }}</p>
      </div>
    </UPageBody>
  </UPage>
</template>
