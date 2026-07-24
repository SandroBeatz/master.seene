<script setup lang="ts">
import type { TopServiceV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { AnimatedNumber } from '@shared/ui'

defineProps<{
  services: TopServiceV2[]
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
const priceParts = computed(() => formats.priceParts())
</script>

<template>
  <UCard :ui="{ root: 'shadow-panel ring-0' }">
    <div class="space-y-4">
      <div>
        <p class="text-sm font-semibold">{{ t('analytics.topServicesTitle') }}</p>
        <p class="text-xs text-muted">
          {{ t('analytics.topServicesSubtitle') }} · {{ t('analytics.windows.last30Days') }}
        </p>
      </div>

      <!-- Row-shaped placeholders: name/price line, progress bar, meta line -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-start gap-3">
          <USkeleton class="size-4 shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <USkeleton class="h-4 w-2/5" />
              <USkeleton class="h-4 w-14" />
            </div>
            <USkeleton class="h-2 w-full rounded-full" />
            <USkeleton class="h-3 w-24" />
          </div>
        </div>
      </div>

      <p v-else-if="!services.length" class="text-sm text-muted">
        {{ t('analytics.noTopServices') }}
      </p>

      <ol v-else class="space-y-4">
        <li v-for="(service, index) in services" :key="service.name" class="flex items-start gap-3">
          <span class="w-4 shrink-0 pt-0.5 text-sm font-medium text-muted">{{ index + 1 }}</span>
          <div class="flex-1 space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate font-medium">{{ service.name }}</span>
              <span class="shrink-0 font-medium">
                <AnimatedNumber
                  :value="service.revenue"
                  :format="priceParts.format"
                  :prefix="priceParts.prefix"
                  :suffix="priceParts.suffix"
                />
              </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full"
                :style="{ width: `${service.percentage}%`, backgroundColor: service.color }"
              />
            </div>
            <div class="flex items-center justify-between text-xs text-muted">
              <span>{{ service.percentage }}%</span>
              <span>{{ t('analytics.serviceAppointments', { count: service.count }) }}</span>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </UCard>
</template>
