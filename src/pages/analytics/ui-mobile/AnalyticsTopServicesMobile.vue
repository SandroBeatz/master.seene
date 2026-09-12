<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonCard, IonSkeletonText } from '@ionic/vue'
import type { TopServiceV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'

defineProps<{
  services: TopServiceV2[]
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
const placeholders = computed(() => [0, 1, 2, 3, 4])
</script>

<template>
  <ion-card class="card">
    <div>
      <p class="title">{{ t('analytics.topServicesTitle') }}</p>
      <p class="muted text-xs">
        {{ t('analytics.topServicesSubtitle') }} · {{ t('analytics.windows.last30Days') }}
      </p>
    </div>

    <div v-if="loading" class="mt-4 space-y-4">
      <div v-for="i in placeholders" :key="i" class="space-y-1.5">
        <ion-skeleton-text :animated="true" style="width: 60%; height: 14px" />
        <ion-skeleton-text :animated="true" style="width: 100%; height: 8px" />
      </div>
    </div>

    <p v-else-if="!services.length" class="muted mt-4 text-sm">{{ t('analytics.noTopServices') }}</p>

    <ol v-else class="mt-4 space-y-4">
      <li v-for="(service, index) in services" :key="service.name" class="flex items-start gap-3">
        <span class="rank">{{ index + 1 }}</span>
        <div class="min-w-0 flex-1 space-y-1.5">
          <div class="flex items-center justify-between gap-2 text-sm">
            <span class="truncate font-medium">{{ service.name }}</span>
            <span class="shrink-0 font-medium">{{ formats.price(service.revenue) }}</span>
          </div>
          <div class="track">
            <div
              class="fill"
              :style="{ width: `${service.percentage}%`, backgroundColor: service.color }"
            />
          </div>
          <div class="muted flex items-center justify-between text-xs">
            <span>{{ service.percentage }}%</span>
            <span>{{ t('analytics.serviceAppointments', { count: service.count }) }}</span>
          </div>
        </div>
      </li>
    </ol>
  </ion-card>
</template>

<style scoped>
.card {
  --background: var(--se-surface-card);
  margin: 0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.title {
  font-size: 0.85rem;
  font-weight: 600;
}

.muted {
  color: var(--ion-color-medium);
}

.rank {
  width: 16px;
  flex-shrink: 0;
  padding-top: 1px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ion-color-medium);
}

.track {
  height: 8px;
  width: 100%;
  overflow: hidden;
  border-radius: 9999px;
  background: var(--se-surface-page);
}

.fill {
  height: 100%;
  border-radius: 9999px;
}
</style>
