<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { alertController, toastController } from '@ionic/vue'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useRemoveTimeBlockMutation, type TimeBlock } from '@entities/time-block'
import TimeOffDetailsMobile from './TimeOffDetailsMobile.vue'

// The time-off preview sheet plus its delete flow — the companion of
// AppointmentPreviewHostMobile. A page mounts one and calls `openDetails`.
const { t } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const removeMutation = useRemoveTimeBlockMutation(
  computed(() => sessionStore.session?.user.id ?? ''),
)

const timeBlock = ref<TimeBlock | null>(null)
const isOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)
const isDeleting = computed(() => removeMutation.isLoading.value)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2200, color, position: 'top' })
  await toast.present()
}

async function openDetails(block: TimeBlock) {
  timeBlock.value = block
  await nextTick()
  isOpen.value = true
}

async function remove() {
  const block = timeBlock.value
  if (!block || isDeleting.value) return
  const alert = await alertController.create({
    header: t('timeBlocks.delete.title'),
    message: t('timeBlocks.delete.message'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('timeBlocks.delete.confirm'), role: 'destructive' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  if (role !== 'destructive') return

  try {
    await removeMutation.mutateAsync(block.id)
    isOpen.value = false
    await showToast(t('timeBlocks.form.successDelete'), 'success')
  } catch {
    await showToast(t('timeBlocks.form.errorDelete'), 'danger')
  }
}

defineExpose({ openDetails })
</script>

<template>
  <!-- Stays mounted after dismiss: Ionic reparents inline modals to <ion-app>,
       and removing one via v-if afterwards breaks its teardown. -->
  <time-off-details-mobile
    v-if="timeBlock"
    v-model:is-open="isOpen"
    :time-block="timeBlock"
    :time-zone="masterPreferencesStore.timeZone"
    :time-format="masterPreferencesStore.timeFormat"
    :deleting="isDeleting"
    :presenting-element="presentingElement"
    @saved="timeBlock = $event"
    @delete="remove"
  />
</template>
