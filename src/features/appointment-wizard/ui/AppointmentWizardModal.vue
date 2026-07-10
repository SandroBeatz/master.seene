<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@shared/lib/media-query'
import { Typography } from '@shared/ui'
import AppointmentWizard from './AppointmentWizard.vue'
import type { AppointmentPrefill } from '../model/types'

defineProps<{ prefill?: AppointmentPrefill }>()

const { t } = useI18n()

// Lifecycle is driven by `useOverlay` via the OverlayProvider: `open` is the
// v-model and `after:leave` lets the provider unmount once the transition ends.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const isMobile = useMediaQuery('(max-width: 640px)')

// The wizard owns its step machine; the modal renders the header (step label +
// back navigation) from the values it exposes.
const wizard = ref<InstanceType<typeof AppointmentWizard> | null>(null)
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="$t('quickCreate.appointment.title')"
    @after:leave="emit('after:leave')"
  >
    <template #header="{ close }">
      <div class="flex w-full items-start justify-between">
        <div class="flex items-start gap-3">
          <UButton
            v-if="(wizard?.step ?? 1) > 1"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            :aria-label="t('quickCreate.actions.back')"
            class="mt-0.5 shrink-0"
            @click="wizard?.back()"
          />
          <div class="min-w-0">
            <Typography variant="h3" class="font-bold">
              {{ t('quickCreate.appointment.title') }}
            </Typography>
            <Typography variant="caption" class="text-muted">{{ wizard?.stepTitle }}</Typography>
          </div>
        </div>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="close" />
      </div>
    </template>
    <template #body>
      <AppointmentWizard ref="wizard" :prefill="prefill" @close="open = false" />
    </template>
  </UModal>
</template>
