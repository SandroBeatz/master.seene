<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'

// Tap on the calendar title → a date grid; picking a day jumps the calendar
// there in its current view (month view lands on that month).
defineProps<{
  /** Selected date, `YYYY-MM-DD`. */
  date: string
  firstDayOfWeek: number
}>()

const emit = defineEmits<{ select: [date: string] }>()

const isOpen = defineModel<boolean>('isOpen', { required: true })

const { locale } = useI18n()

function onChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const value = event.detail.value
  if (typeof value !== 'string') return
  isOpen.value = false
  emit('select', value.slice(0, 10))
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="jump-sheet"
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
        <ion-title>{{ $t('calendar.mobile.jumpTo') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <div class="jump-sheet__body">
      <ion-datetime
        presentation="date"
        size="cover"
        :value="date"
        :locale="locale"
        :first-day-of-week="firstDayOfWeek"
        @ion-change="onChange"
      />
    </div>
  </ion-modal>
</template>

<style scoped>
.jump-sheet {
  --height: auto;
}

.jump-sheet ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.jump-sheet__body {
  padding-bottom: calc(12px + var(--safe-area-bottom, 0px));
  background: var(--se-surface-page, var(--ion-background-color));
}

.jump-sheet ion-datetime {
  --background: transparent;
  --background-rgb: var(--se-surface-page-rgb);

  margin: 0 auto;
}
</style>
