<script setup lang="ts">
import { computed, markRaw, provide, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonNav, toastController } from '@ionic/vue'
import { useAppointmentAvailability } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import {
  useCreateTimeBlockMutation,
  useUpdateTimeBlockMutation,
  type TimeBlock,
} from '@entities/time-block'
import { useFormats } from '@shared/lib/formats'
import { minutesToTimeInput } from '@shared/lib/scheduling'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import { createTimeOffWizard } from '../model/time-off-wizard-mobile'
import {
  TIME_OFF_WIZARD_MOBILE_KEY,
  type TimeOffWizardMobileContext,
} from '../model/time-off-wizard-mobile-context'
import TimeOffWhenStepMobile from './steps/TimeOffWhenStepMobile.vue'
import TimeOffReasonStepMobile from './steps/TimeOffReasonStepMobile.vue'

// Mounted fresh on every modal presentation (IonModal renders its content only
// while open), so a half-filled time off never leaks into the next one. With a
// `timeBlock` the same steps edit it, prefilled.
const props = defineProps<{ timeBlock?: TimeBlock }>()

const emit = defineEmits<{
  close: []
  saved: [timeBlock: TimeBlock]
  'update:dirty': [value: boolean]
  'update:busy': [value: boolean]
}>()

const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const timeZone = computed(() => masterPreferencesStore.timeZone)
const schedule = computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null)
const stepMinutes = computed(() => masterPreferencesStore.calendarSlotStepMinutes)

// The picker loads the same bookings/time offs (shared query cache); this copy
// answers "what's busy on the day" for the all-day and overlap rules.
const wizard = createTimeOffWizard({
  date: getDateTimeInputValue(new Date(), timeZone.value).date,
  timeZone,
  dayBusy: (date) => availability.dayBusy(date),
  timeBlock: props.timeBlock,
})
const { state } = wizard
const availability = useAppointmentAvailability({
  userId,
  timeZone,
  schedule,
  stepMinutes,
  durationMinutes: computed(() => state.durationMinutes),
  anchorDate: computed(() => state.date),
  excludeTimeBlockId: computed(() => props.timeBlock?.id ?? null),
})
const isEditing = Boolean(props.timeBlock)

watch(
  () =>
    isEditing
      ? wizard.isChanged.value
      : Boolean(state.allDay || state.startMinutes != null || state.notes.trim()),
  (dirty) => emit('update:dirty', dirty),
  { immediate: true },
)

const summary = computed(() => {
  if (!state.date) return ''
  const [year = 1970, month = 1, day = 1] = state.date.split('-').map(Number)
  const date = formats.weekdayDateShort(new Date(year, month - 1, day))
  if (state.allDay) return `${date} · ${t('timeBlocks.form.allDay')}`
  const range = wizard.range.value
  if (!range) return ''
  const [start, end] = range.map((minutes) => formats.time(minutesToTimeInput(minutes % 1440)))
  return `${date} · ${start} – ${end}`
})

// --- Navigation (ion-nav stack inside the modal) ---
type NavComponent = Parameters<HTMLIonNavElement['push']>[0]
const asNavPage = (component: Component) => markRaw(component) as unknown as NavComponent
const WHEN_STEP = asNavPage(TimeOffWhenStepMobile)
const REASON_STEP = asNavPage(TimeOffReasonStepMobile)

const navRef = ref<{ $el: HTMLIonNavElement } | null>(null)
let isNavigating = false

async function next() {
  const nav = navRef.value?.$el
  if (!nav || isNavigating || !wizard.isWhenValid.value) return
  isNavigating = true
  try {
    // Back / swipe-back pop natively — only push when the "when" step is on top.
    if ((await nav.getLength()) === 1) await nav.push(REASON_STEP)
  } finally {
    isNavigating = false
  }
}

// --- Save ---
const createMutation = useCreateTimeBlockMutation(userId)
const updateMutation = useUpdateTimeBlockMutation(userId)
const isSaving = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)
watch(isSaving, (busy) => emit('update:busy', busy))

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2200, color, position: 'top' })
  await toast.present()
}

async function submit() {
  const dto = wizard.isWhenValid.value ? wizard.toDto() : null
  if (!dto) {
    await showToast(t('quickCreate.timeOff.overlap'), 'danger')
    return
  }
  try {
    const saved = props.timeBlock
      ? await updateMutation.mutateAsync({ ...dto, id: props.timeBlock.id })
      : await createMutation.mutateAsync(dto)
    emit('update:dirty', false)
    emit('saved', saved)
    await showToast(
      t(props.timeBlock ? 'timeBlocks.form.successEdit' : 'timeBlocks.form.successCreate'),
      'success',
    )
  } catch {
    await showToast(t('timeBlocks.form.errorTitle'), 'danger')
  }
}

const context: TimeOffWizardMobileContext = {
  wizard,
  isEditing,
  scheduling: {
    userId,
    timeZone,
    schedule,
    stepMinutes,
    firstDayOfWeek: computed(() => masterPreferencesStore.calendarFirstDay),
    hourCycle: computed(() => (masterPreferencesStore.timeFormat === 12 ? 'h12' : 'h23')),
    excludeTimeBlockId: props.timeBlock?.id ?? null,
  },
  summary,
  isSaving,
  next: () => void next(),
  close: () => emit('close'),
  submit,
}

provide(TIME_OFF_WIZARD_MOBILE_KEY, context)
</script>

<template>
  <ion-nav ref="navRef" :root="WHEN_STEP" />
</template>
