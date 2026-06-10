<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  earned: number | undefined
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
</script>

<template>
  <UPageCard
    variant="subtle"
    :ui="{ root: 'shadow-none' }"
    as-child
  >
    <RouterLink to="/analytics" class="block">
      <div class="flex items-center justify-between gap-2">
        <div class="space-y-2 min-w-0">
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-banknote" class="size-4 shrink-0" />
            <span class="text-xs font-medium uppercase">{{ t('home.earnedToday') }}</span>
          </div>
          <div v-if="props.loading" class="h-7 w-24 animate-pulse rounded bg-elevated" />
          <p v-else class="text-2xl font-semibold">
            {{ formats.price(props.earned ?? 0) }}
          </p>
        </div>
        <UIcon name="i-lucide-arrow-right" class="size-5 shrink-0 text-muted" aria-hidden="true" />
      </div>
    </RouterLink>
  </UPageCard>
</template>
