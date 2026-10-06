<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonModal, alertController } from '@ionic/vue'
import type { TimeBlock } from '@entities/time-block'
import TimeOffWizardFlowMobile from './TimeOffWizardFlowMobile.vue'

// Self-contained "new time off" sheet. Its content is an ion-nav whose pages
// are the two steps (when → reason), so each gets native push/back transitions
// inside the modal — same shell as the appointment wizard. Passing `timeBlock`
// reuses the same steps to edit an existing time off.
const props = defineProps<{
  isOpen: boolean
  timeBlock?: TimeBlock
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  saved: [timeBlock: TimeBlock]
}>()

const { t } = useI18n()
const selfModal = ref<{ $el: HTMLIonModalElement } | null>(null)
const isDirty = ref(false)
const isBusy = ref(false)
const allowDismiss = ref(false)
const presenting = computed(() => props.presentingElement ?? undefined)

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

async function onSaved(timeBlock: TimeBlock) {
  allowDismiss.value = true
  emit('saved', timeBlock)
  await close()
}
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    class="time-off-wizard-mobile se-modal-rounded"
    :presenting-element="presenting"
    :can-dismiss="canDismiss"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <time-off-wizard-flow-mobile
      :time-block="timeBlock"
      @close="close"
      @saved="onSaved"
      @update:dirty="isDirty = $event"
      @update:busy="isBusy = $event"
    />
  </ion-modal>
</template>

<style scoped>
/* Rounded sheet top in every mode (shared radius, see .se-modal-rounded in
   app-mobile/styles/main.css): iOS already presents a card, Material renders a
   full-screen modal — inset it under the status bar instead. */
.time-off-wizard-mobile.md {
  --height: calc(100% - var(--ion-safe-area-top, 0px) - 12px);

  align-items: flex-end;
}
</style>
