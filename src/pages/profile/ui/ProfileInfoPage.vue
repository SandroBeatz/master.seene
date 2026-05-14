<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 gap-4 text-center">
    <UIcon name="i-lucide-user-round" class="size-12 text-zinc-300" />
    <p class="text-lg font-medium text-zinc-500">{{ t('profile.info.comingSoon') }}</p>
  </div>
</template>
