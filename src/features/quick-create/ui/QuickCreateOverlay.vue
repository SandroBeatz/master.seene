<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@shared/lib/media-query'
import QuickCreateMenu from './QuickCreateMenu.vue'
import AppointmentWizard from './AppointmentWizard.vue'
import TimeOffWizard from './TimeOffWizard.vue'
import type { AppointmentPrefill, QuickCreateMode, TimeOffPrefill } from '../model/types'

const props = defineProps<{
  mode: QuickCreateMode
  appointmentPrefill?: AppointmentPrefill
  timeOffPrefill?: TimeOffPrefill
}>()

// Lifecycle is driven by `useOverlay` via the OverlayProvider: `open` is the
// v-model and `after:leave` lets the provider unmount once the transition ends.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const { t } = useI18n()
const isMobile = useMediaQuery('(max-width: 640px)')

const view = ref<QuickCreateMode>(props.mode)

const title = computed(() => {
  if (view.value === 'appointment') return t('quickCreate.appointment.title')
  if (view.value === 'timeOff') return t('quickCreate.timeOff.title')
  return t('quickCreate.menu.title')
})

const description = computed(() =>
  view.value === 'menu' ? t('quickCreate.menu.description') : undefined,
)

function close() {
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="title"
    :description="description"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <QuickCreateMenu
        v-if="view === 'menu'"
        @appointment="view = 'appointment'"
        @time-off="view = 'timeOff'"
      />
      <AppointmentWizard
        v-else-if="view === 'appointment'"
        :prefill="props.appointmentPrefill"
        @back="view = 'menu'"
        @close="close"
      />
      <TimeOffWizard v-else :prefill="props.timeOffPrefill" @back="view = 'menu'" @close="close" />
    </template>
  </UModal>
</template>
