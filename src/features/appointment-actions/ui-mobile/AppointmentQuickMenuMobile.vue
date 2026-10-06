<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { IonIcon, IonItem, IonLabel, IonPopover } from '@ionic/vue'
import { calendarOutline, createOutline, eyeOutline, trashOutline } from 'ionicons/icons'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { MobileAppointmentQuickAction } from '../model/action-set'

// Long-press context menu for an appointment card (home schedule, calendar).
// Anchored to the pointer event that opened it; the parent performs the action.
defineProps<{
  isOpen: boolean
  /** Event that opened the menu — the popover anchors to its target. */
  event?: Event
}>()

const emit = defineEmits<{
  select: [action: MobileAppointmentQuickAction]
  dismiss: []
}>()

const { t } = useI18n()
</script>

<template>
  <ion-popover
    class="appointment-quick-menu"
    :is-open="isOpen"
    :event="event"
    reference="event"
    side="bottom"
    alignment="start"
    @did-dismiss="emit('dismiss')"
  >
    <inset-list full-width>
      <ion-item button :detail="false" @click="emit('select', 'details')">
        <ion-icon slot="start" :icon="eyeOutline" color="medium" aria-hidden="true" />
        <ion-label>{{ t('appointments.quickMenu.details') }}</ion-label>
      </ion-item>
      <ion-item button :detail="false" @click="emit('select', 'reschedule')">
        <ion-icon slot="start" :icon="calendarOutline" color="medium" aria-hidden="true" />
        <ion-label>{{ t('appointments.quickMenu.reschedule') }}</ion-label>
      </ion-item>
      <ion-item button :detail="false" @click="emit('select', 'edit')">
        <ion-icon slot="start" :icon="createOutline" color="medium" aria-hidden="true" />
        <ion-label>{{ t('common.edit') }}</ion-label>
      </ion-item>
      <ion-item button :detail="false" @click="emit('select', 'delete')">
        <ion-icon slot="start" :icon="trashOutline" color="danger" aria-hidden="true" />
        <ion-label color="danger">{{ t('common.delete') }}</ion-label>
      </ion-item>
    </inset-list>
  </ion-popover>
</template>

<style scoped>
.appointment-quick-menu {
  --width: 232px;
  --background: var(--se-surface-card, var(--ion-card-background, #fff));
  --box-shadow: 0 10px 32px rgb(0 0 0 / 24%);
}

.appointment-quick-menu ion-item {
  font-size: 0.9rem;
}
</style>
