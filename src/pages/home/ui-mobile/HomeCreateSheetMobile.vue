<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { cafeOutline, calendarOutline, closeOutline } from 'ionicons/icons'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

// "+" menu: what to create — a client booking or a time off. Content-sized
// bottom sheet. The choice is emitted only after the sheet has fully dismissed,
// so the next modal never presents on top of a closing one.
type HomeCreateKind = 'appointment' | 'timeOff'

const emit = defineEmits<{
  select: [kind: HomeCreateKind]
}>()

const isOpen = defineModel<boolean>('isOpen', { required: true })

const OPTIONS: readonly { kind: HomeCreateKind; icon: string; tone: string }[] = [
  { kind: 'appointment', icon: calendarOutline, tone: 'primary' },
  { kind: 'timeOff', icon: cafeOutline, tone: 'warning' },
]

let pending: HomeCreateKind | null = null

function choose(kind: HomeCreateKind) {
  pending = kind
  isOpen.value = false
}

function onDidDismiss() {
  isOpen.value = false
  const kind = pending
  pending = null
  if (kind) emit('select', kind)
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="create-sheet"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    :handle="true"
    @did-dismiss="onDidDismiss"
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
        <ion-title>{{ $t('quickCreate.menu.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <div class="create-sheet__body">
      <inset-list>
        <ion-item
          v-for="option in OPTIONS"
          :key="option.kind"
          button
          :detail="true"
          @click="choose(option.kind)"
        >
          <span
            slot="start"
            class="create-sheet__icon"
            :class="`create-sheet__icon--${option.tone}`"
            aria-hidden="true"
          >
            <ion-icon :icon="option.icon" />
          </span>
          <ion-label>
            <h3>{{ $t(`quickCreate.menu.${option.kind}`) }}</h3>
            <p>{{ $t(`quickCreate.menu.${option.kind}Description`) }}</p>
          </ion-label>
        </ion-item>
      </inset-list>
    </div>
  </ion-modal>
</template>

<style scoped>
.create-sheet {
  --height: auto;
}

.create-sheet ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.create-sheet__body {
  padding: 8px 0 calc(20px + var(--safe-area-bottom, 0px));
  background: var(--se-surface-page, var(--ion-background-color));
}

.create-sheet ion-item {
  --min-height: 68px;
}

.create-sheet__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-inline-end: 14px;
  border-radius: 12px;
  font-size: 21px;
}

.create-sheet__icon--primary {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
  color: var(--ion-color-primary-shade);
}

.create-sheet__icon--warning {
  background: rgba(var(--ion-color-warning-rgb), 0.18);
  color: var(--ion-color-warning-shade);
}

.create-sheet ion-label h3 {
  margin: 0 0 2px;
  font-size: 1rem;
  font-weight: 600;
}

.create-sheet ion-label p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.82rem;
}
</style>
