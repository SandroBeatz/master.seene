<script setup lang="ts">
import { computed, markRaw, provide, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonNav, toastController } from '@ionic/vue'
import { useCreateAppointmentMutation, type CreateAppointmentDto } from '@entities/appointment'
import { useClientsQuery } from '@entities/client/index.mobile'
import { useMasterPreferencesStore } from '@entities/master'
import { useServicesQuery, type Service } from '@entities/service/index.mobile'
import { useSessionStore } from '@entities/session'
import { minutesToTimeInput } from '@shared/lib/scheduling'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { createAppointmentWizard, type WizardStep } from '../model/appointment-wizard'
import type { AppointmentPrefill } from '../model/types'
import {
  APPOINTMENT_WIZARD_MOBILE_KEY,
  type AppointmentWizardMobileContext,
} from '../model/wizard-mobile-context'
import WizardClientStepMobile from './steps/WizardClientStepMobile.vue'
import WizardConfirmStepMobile from './steps/WizardConfirmStepMobile.vue'
import WizardDateTimeStepMobile from './steps/WizardDateTimeStepMobile.vue'
import WizardServicesStepMobile from './steps/WizardServicesStepMobile.vue'

// Mounted fresh on every modal presentation (IonModal renders its content only
// while open), so the wizard state never leaks between two bookings.
const props = defineProps<{
  prefill?: AppointmentPrefill
  modalEl: HTMLElement | null
}>()

const emit = defineEmits<{
  close: []
  created: []
  'update:dirty': [value: boolean]
  'update:busy': [value: boolean]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const timeZone = computed(() => masterPreferencesStore.timeZone)

const wizard = createAppointmentWizard({ prefill: props.prefill, timeZone: timeZone.value })
const { state } = wizard
// Open the date step on today rather than an empty "pick a date" state.
if (!state.date) state.date = getDateTimeInputValue(new Date(), timeZone.value).date

const { data: clientsData } = useClientsQuery(userId)
const { data: servicesData } = useServicesQuery(userId)
const clients = computed(() => clientsData.value ?? [])
const services = computed(() => servicesData.value ?? [])

const selectedClient = computed(
  () => clients.value.find((client) => client.id === state.clientId) ?? null,
)
const clientName = computed(() => {
  const client = selectedClient.value
  if (!client) return ''
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone
})
const selectedServices = computed(() =>
  state.serviceIds
    .map((id) => services.value.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service)),
)
const totalDuration = computed(() =>
  selectedServices.value.reduce((sum, service) => sum + service.duration, 0),
)
const servicesTotalPrice = computed(() =>
  selectedServices.value.length === 0
    ? null
    : selectedServices.value.reduce((sum, service) => sum + service.price, 0),
)
const effectivePrice = computed(() =>
  state.priceOverridden ? state.price : servicesTotalPrice.value,
)

// Keep the (non-overridden) price in sync with the selected services.
watch(servicesTotalPrice, (total) => {
  if (!state.priceOverridden) state.price = total
})

watch(
  () => Boolean(state.clientId || state.serviceIds.length),
  (dirty) => emit('update:dirty', dirty),
  { immediate: true },
)

// --- Navigation (ion-nav stack inside the modal) ---
// ion-nav's typings describe web components; the Vue delegate renders SFCs.
type NavComponent = Parameters<HTMLIonNavElement['push']>[0]
const asNavPage = (component: Component) => markRaw(component) as unknown as NavComponent

const STEP_COMPONENTS: Record<WizardStep, NavComponent> = {
  1: asNavPage(WizardClientStepMobile),
  2: asNavPage(WizardServicesStepMobile),
  3: asNavPage(WizardDateTimeStepMobile),
  4: asNavPage(WizardConfirmStepMobile),
}

const navRef = ref<{ $el: HTMLIonNavElement } | null>(null)
/** Steps currently on the nav stack, bottom → top. */
let stack: WizardStep[] = [1]
let isNavigating = false

function isStepValid(step: WizardStep): boolean {
  if (step === 1) return wizard.isStep1Valid.value
  if (step === 2) return wizard.isStep2Valid.value
  if (step === 3) return wizard.isStep3Valid.value
  return true
}

// Back button / swipe-back pop the nav natively, so re-read its real depth
// before every navigation instead of trusting our own bookkeeping.
async function syncStack(nav: HTMLIonNavElement) {
  const length = await nav.getLength()
  if (length > 0 && length < stack.length) stack = stack.slice(0, length)
}

async function navigate(action: (nav: HTMLIonNavElement) => Promise<void>) {
  const nav = navRef.value?.$el
  if (!nav || isNavigating) return
  isNavigating = true
  try {
    await syncStack(nav)
    await action(nav)
  } finally {
    isNavigating = false
  }
}

function next(from: WizardStep) {
  if (!isStepValid(from)) return
  void navigate(async (nav) => {
    if (stack.at(-1) !== from) return
    const target: WizardStep = from === 2 && state.skipDateTime ? 4 : ((from + 1) as WizardStep)
    if (target > 4) return
    await nav.push(STEP_COMPONENTS[target])
    stack = [...stack, target]
  })
}

function goTo(step: WizardStep) {
  void navigate(async (nav) => {
    const index = stack.indexOf(step)
    if (index < 0 || index === stack.length - 1) return
    await nav.popTo(index)
    stack = stack.slice(0, index + 1)
  })
}

// --- Create ---
const createMutation = useCreateAppointmentMutation(userId)
const isCreating = computed(() => createMutation.isLoading.value)
watch(isCreating, (busy) => emit('update:busy', busy))

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2200, color, position: 'top' })
  await toast.present()
}

async function create() {
  if (state.slotMinutes == null || !state.clientId || !state.serviceIds.length) return
  const dto: CreateAppointmentDto = {
    client_id: state.clientId,
    service_ids: [...state.serviceIds],
    start_at: toUtcIsoFromZonedDateTime(
      state.date,
      minutesToTimeInput(state.slotMinutes),
      timeZone.value,
    ),
    duration: totalDuration.value,
    price: effectivePrice.value,
    notes: state.notes.trim() || null,
    source: 'manual',
    status: 'confirmed',
  }
  try {
    await createMutation.mutateAsync(dto)
    emit('update:dirty', false)
    emit('created')
    await showToast(t('appointments.form.successCreate'), 'success')
  } catch {
    await showToast(t('appointments.form.errorTitle'), 'danger')
  }
}

const context: AppointmentWizardMobileContext = {
  state,
  clients,
  services,
  selectedClient,
  clientName,
  selectedServices,
  totalDuration,
  effectivePrice,
  scheduling: {
    userId,
    timeZone,
    schedule: computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null),
    stepMinutes: computed(() => masterPreferencesStore.calendarSlotStepMinutes),
    firstDayOfWeek: computed(() => masterPreferencesStore.calendarFirstDay),
    hourCycle: computed(() => (masterPreferencesStore.timeFormat === 12 ? 'h12' : 'h23')),
  },
  totalSteps: state.skipDateTime ? 3 : 4,
  positionOf: (step) => (step === 4 && state.skipDateTime ? 3 : step),
  modalEl: computed(() => props.modalEl),
  isCreating,
  next,
  goTo,
  close: () => emit('close'),
  create,
}

provide(APPOINTMENT_WIZARD_MOBILE_KEY, context)
</script>

<template>
  <ion-nav ref="navRef" :root="STEP_COMPONENTS[1]" />
</template>
