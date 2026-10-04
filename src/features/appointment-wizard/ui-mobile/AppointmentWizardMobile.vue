<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonModal, alertController } from '@ionic/vue'
import type { AppointmentPrefill } from '../model/types'
import AppointmentWizardFlowMobile from './AppointmentWizardFlowMobile.vue'

// Self-contained "new appointment" sheet. Its content is an ion-nav whose pages
// are the wizard steps (client → services → date & slot → confirm), so each
// step gets native push/back transitions inside the modal.
const props = defineProps<{
  isOpen: boolean
  /** Prefilled start (e.g. tapped calendar slot) — skips the date/time step. */
  prefill?: AppointmentPrefill
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const selfModal = ref<{ $el: HTMLIonModalElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)
const isDirty = ref(false)
const isBusy = ref(false)
const allowDismiss = ref(false)

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    isDirty.value = false
    isBusy.value = false
    allowDismiss.value = false
  },
)

async function confirmDiscard(): Promise<boolean> {
  const alert = await alertController.create({
    header: t('common.unsavedChanges'),
    message: t('common.unsavedChangesConfirm'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('common.discard'), role: 'destructive' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'destructive'
}

function canDismiss(): boolean | Promise<boolean> {
  if (isBusy.value) return false
  if (allowDismiss.value || !isDirty.value) return true
  return confirmDiscard()
}

async function close() {
  await selfModal.value?.$el.dismiss()
}

async function onCreated() {
  allowDismiss.value = true
  emit('created')
  await close()
}
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    class="appointment-wizard-mobile"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="canDismiss"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <appointment-wizard-flow-mobile
      :prefill="prefill"
      :modal-el="selfModalEl"
      @close="close"
      @created="onCreated"
      @update:dirty="isDirty = $event"
      @update:busy="isBusy = $event"
    />
  </ion-modal>
</template>
