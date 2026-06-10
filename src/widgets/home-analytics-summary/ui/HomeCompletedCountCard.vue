<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  count: number | undefined
  loading: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <UPageCard
    variant="subtle"
    :ui="{ root: 'shadow-none' }"
  >
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-calendar-check" class="size-4" />
        <span class="text-xs font-medium uppercase">{{ t('home.completedCount') }}</span>
      </div>
      <div v-if="props.loading" class="h-7 w-16 animate-pulse rounded bg-elevated" />
      <p v-else class="text-2xl font-semibold">{{ props.count ?? 0 }}</p>
    </div>
  </UPageCard>
</template>
