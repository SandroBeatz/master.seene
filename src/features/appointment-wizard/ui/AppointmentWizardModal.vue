<script setup lang="ts">
import { useMediaQuery } from '@shared/lib/media-query'
import AppointmentWizard from './AppointmentWizard.vue'
import type { AppointmentPrefill } from '../model/types'

defineProps<{ prefill?: AppointmentPrefill }>()

// Lifecycle is driven by `useOverlay` via the OverlayProvider: `open` is the
// v-model and `after:leave` lets the provider unmount once the transition ends.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const isMobile = useMediaQuery('(max-width: 640px)')
</script>

<template>
  <!-- The wizard renders its own header (title + step + back), so the modal
       header is visually hidden but kept for the accessible dialog title. -->
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="$t('quickCreate.appointment.title')"
    :ui="{ header: 'sr-only' }"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <AppointmentWizard :prefill="prefill" @close="open = false" />
    </template>
  </UModal>
</template>
