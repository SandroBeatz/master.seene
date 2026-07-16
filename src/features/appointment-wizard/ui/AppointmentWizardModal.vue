<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@shared/lib/media-query'
import { Typography } from '@shared/ui'
import AppointmentWizard from './AppointmentWizard.vue'
import WizardStepper from './WizardStepper.vue'
import type { AppointmentPrefill } from '../model/types'

defineProps<{ prefill?: AppointmentPrefill }>()

const { t } = useI18n()

// Lifecycle is driven by `useOverlay` via the OverlayProvider: `open` is the
// v-model and `after:leave` lets the provider unmount once the transition ends.
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ close: []; 'after:leave': [] }>()

const isMobile = useMediaQuery('(max-width: 640px)')

// The wizard owns its step machine and derived summaries; the modal renders the
// chrome (header, stepper, footer) from the values it exposes.
const wizard = ref<InstanceType<typeof AppointmentWizard> | null>(null)

const step = computed(() => wizard.value?.step ?? 1)
const stepTitle = computed(
  () => wizard.value?.stepTitle ?? t('quickCreate.appointment.steps.client'),
)
const clientName = computed(() => wizard.value?.clientName ?? '')
const footerStats = computed(() => wizard.value?.footerStats ?? [])
const canAdvance = computed(() => wizard.value?.canAdvance ?? false)
const isLastStep = computed(() => wizard.value?.isLastStep ?? false)
const isCreating = computed(() => wizard.value?.isCreating ?? false)

// Step 1 selects a client and auto-advances — no footer, no back button.
const showFooter = computed(() => step.value > 1)
</script>

<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="$t('quickCreate.appointment.title')"
    :ui="{ footer: showFooter ? 'border-t border-default' : 'hidden' }"
    @after:leave="emit('after:leave')"
  >
    <template #header="{ close }">
      <div class="flex w-full items-start gap-3">
        <UButton
          v-if="step > 1"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="soft"
          size="lg"
          :aria-label="t('quickCreate.actions.back')"
          class="shrink-0 rounded-full"
          @click="wizard?.back()"
        />
        <div class="min-w-0 flex-1">
          <Typography variant="h3" class="font-bold leading-tight">{{ stepTitle }}</Typography>
          <Typography variant="body" class="text-muted">
            {{ t('quickCreate.appointment.title') }}
          </Typography>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="soft"
          size="lg"
          :aria-label="t('quickCreate.actions.close')"
          class="shrink-0 rounded-full"
          @click="close"
        />
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <WizardStepper :current="step" @navigate="wizard?.goTo($event)" />
        <p v-if="showFooter && clientName" class="text-center text-sm text-muted">
          {{ clientName }}
        </p>
        <AppointmentWizard ref="wizard" :prefill="prefill" @close="open = false" />
      </div>
    </template>

    <template #footer>
      <div v-if="showFooter" class="flex w-full items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm">
          <template v-for="(stat, index) in footerStats" :key="index">
            <span v-if="index > 0" class="h-4 w-px shrink-0 bg-accented" aria-hidden="true" />
            <span
              class="flex items-center gap-1.5"
              :class="stat.strong ? 'font-semibold text-highlighted' : 'text-muted'"
            >
              <UIcon v-if="stat.icon" :name="stat.icon" class="size-4 shrink-0" />
              {{ stat.label }}
            </span>
          </template>
        </div>

        <UButton
          v-if="!isLastStep"
          color="neutral"
          trailing-icon="i-lucide-arrow-right"
          size="lg"
          class="shrink-0 rounded-full"
          :disabled="!canAdvance"
          @click="wizard?.next()"
        >
          {{ t('quickCreate.appointment.next') }}
        </UButton>
        <UButton
          v-else
          color="neutral"
          trailing-icon="i-lucide-check"
          size="lg"
          class="shrink-0 rounded-full"
          :loading="isCreating"
          @click="wizard?.submit()"
        >
          {{ t('quickCreate.appointment.create') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
