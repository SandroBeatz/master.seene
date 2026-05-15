<script setup lang="ts">
import type { TopService } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  services: TopService[]
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
</script>

<template>
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
    <div class="space-y-4">
      <p class="text-sm font-semibold uppercase text-muted">{{ t('analytics.topServices') }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-8 w-full animate-pulse rounded bg-elevated" />
      </div>

      <p v-else-if="!services.length" class="text-sm text-muted">
        {{ t('analytics.noTopServices') }}
      </p>

      <div v-else class="space-y-3">
        <div v-for="service in services" :key="service.name" class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium">{{ service.name }}</span>
            <span class="text-muted">{{ formats.price(service.revenue) }}</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary"
              :style="{ width: `${service.percentage}%` }"
            />
          </div>
          <p class="text-right text-xs text-muted">{{ service.percentage }}%</p>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
