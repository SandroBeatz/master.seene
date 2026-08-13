<script setup lang="ts">
import { useIsMobile } from '@shared/lib/viewport'
import TimeOffWizard from './TimeOffWizard.vue'
import type { TimeOffPrefill } from '../model/types'

defineProps<{ prefill?: TimeOffPrefill }>()

// Lifecycle is driven by `useOverlay` via the OverlayProvider: `open` is the
// v-model and `after:leave` lets the provider unmount once the transition ends.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const isMobile = useIsMobile()
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="$t('quickCreate.timeOff.title')"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <TimeOffWizard :prefill="prefill" @close="open = false" />
    </template>
  </UModal>
</template>
