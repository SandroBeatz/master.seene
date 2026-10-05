<script setup lang="ts">
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
} from '@ionic/vue'
import {
  calendarClearOutline,
  calendarNumberOutline,
  calendarOutline,
  checkmark,
  closeOutline,
  gitCompareOutline,
  todayOutline,
} from 'ionicons/icons'
import type { AnalyticsAnchoredKind } from '@entities/analytics'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

// Analytics "⋯" options as a content-sized bottom sheet: period granularity and
// the compare-with-previous toggle, both as inset grouped lists like the rest
// of the app's settings-style screens.
defineProps<{
  kind: AnalyticsAnchoredKind
}>()

const emit = defineEmits<{
  select: [kind: AnalyticsAnchoredKind]
}>()

const isOpen = defineModel<boolean>('isOpen', { required: true })
const compare = defineModel<boolean>('compare', { required: true })

const KIND_ITEMS: readonly { kind: AnalyticsAnchoredKind; icon: string }[] = [
  { kind: 'day', icon: todayOutline },
  { kind: 'week', icon: calendarClearOutline },
  { kind: 'month', icon: calendarOutline },
  { kind: 'year', icon: calendarNumberOutline },
]

/** Picking a granularity is a one-shot choice — apply it and close. */
function select(kind: AnalyticsAnchoredKind) {
  emit('select', kind)
  isOpen.value = false
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="options-sheet"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    :handle="true"
    @did-dismiss="isOpen = false"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :aria-label="$t('common.close')"
            @click="isOpen = false"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ $t('analytics.options.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <div class="options-sheet__body">
      <inset-list :header="$t('analytics.period.title')">
        <ion-item
          v-for="item in KIND_ITEMS"
          :key="item.kind"
          button
          :detail="false"
          @click="select(item.kind)"
        >
          <ion-icon slot="start" :icon="item.icon" aria-hidden="true" />
          <ion-label>{{ $t(`analytics.period.${item.kind}`) }}</ion-label>
          <ion-icon
            v-if="item.kind === kind"
            slot="end"
            :icon="checkmark"
            color="primary"
            aria-hidden="true"
          />
        </ion-item>
      </inset-list>

      <inset-list>
        <ion-item>
          <ion-icon slot="start" :icon="gitCompareOutline" aria-hidden="true" />
          <ion-toggle v-model="compare" justify="space-between">
            <span class="options-sheet__toggle-label">{{ $t('analytics.options.compare') }}</span>
            <span class="options-sheet__toggle-note">
              {{ $t('analytics.options.compareDescription') }}
            </span>
          </ion-toggle>
        </ion-item>
      </inset-list>
    </div>
  </ion-modal>
</template>

<style scoped>
.options-sheet {
  --height: auto;
  --border-radius: 20px 20px 0 0;
}

.options-sheet ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.options-sheet__body {
  padding: 8px 0 calc(20px + var(--safe-area-bottom, 0px));
  background: var(--se-surface-page, var(--ion-background-color));
}

.options-sheet ion-item ion-icon[slot='start'] {
  color: var(--ion-color-medium);
}

.options-sheet ion-toggle {
  padding-block: 10px;
}

.options-sheet__toggle-label,
.options-sheet__toggle-note {
  display: block;
}

.options-sheet__toggle-note {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 13px;
  white-space: normal;
}
</style>
