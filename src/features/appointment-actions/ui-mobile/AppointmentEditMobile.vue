<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  alertController,
  isPlatform,
} from '@ionic/vue'
import { checkmarkOutline, closeOutline, cutOutline, personCircleOutline } from 'ionicons/icons'
import type { Appointment, UpdateAppointmentDto } from '@entities/appointment'
import { ClientPickerModalMobile, type Client } from '@entities/client/index.mobile'
import { ServicePickerModalMobile, type Service } from '@entities/service/index.mobile'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

interface EditState {
  clientId: string
  serviceIds: string[]
  date: string
  time: string
  duration: number
  price: number | null
  notes: string
}

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  clients: Client[]
  services: Service[]
  timeZone: string
  onSave: (payload: UpdateAppointmentDto) => Promise<void>
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  saved: []
}>()

const { t } = useI18n()
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'
const isClientPickerOpen = ref(false)
const isServicePickerOpen = ref(false)
const isSubmitting = ref(false)
const allowDismiss = ref(false)
const submitted = ref(false)
const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)

const state = reactive<EditState>({
  clientId: '',
  serviceIds: [],
  date: '',
  time: '',
  duration: 0,
  price: null,
  notes: '',
})
const initialState = ref('')

const selectedClientName = computed(() => {
  const client = props.clients.find((item) => item.id === state.clientId)
  return client
    ? [client.first_name, client.last_name].filter(Boolean).join(' ')
    : t('appointments.unknownClient')
})
const selectedServicesLabel = computed(() => {
  const names = state.serviceIds
    .map((id) => props.services.find((service) => service.id === id)?.name)
    .filter(Boolean)
  return names.join(', ') || t('appointments.form.servicesPlaceholder')
})

function snapshot(): string {
  return JSON.stringify({
    clientId: state.clientId,
    serviceIds: [...state.serviceIds].sort(),
    date: state.date,
    time: state.time,
    duration: state.duration,
    price: state.price,
    notes: state.notes,
  })
}

function reset() {
  const parts = getDateTimeInputValue(props.appointment.start_at, props.timeZone)
  state.clientId = props.appointment.client_id
  state.serviceIds = [...props.appointment.service_ids]
  state.date = parts.date
  state.time = parts.time
  state.duration = props.appointment.duration
  state.price = props.appointment.price
  state.notes = props.appointment.notes ?? ''
  isClientPickerOpen.value = false
  isServicePickerOpen.value = false
  submitted.value = false
  allowDismiss.value = false
  initialState.value = snapshot()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) reset()
  },
  { immediate: true },
)

const isDirty = computed(() => snapshot() !== initialState.value)
const isValid = computed(
  () =>
    Boolean(state.clientId) &&
    state.serviceIds.length > 0 &&
    Boolean(state.date) &&
    Boolean(state.time) &&
    state.duration > 0 &&
    (state.price == null || state.price >= 0) &&
    state.notes.length <= 2000,
)
const canSave = computed(() => isDirty.value && isValid.value && !isSubmitting.value)

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
  if (isSubmitting.value) return false
  if (allowDismiss.value || !isDirty.value) return true
  return confirmDiscard()
}

async function close() {
  if (isSubmitting.value) return
  if (!allowDismiss.value && isDirty.value && !(await confirmDiscard())) return
  allowDismiss.value = true
  emit('update:isOpen', false)
}

function readNullableNumber(event: CustomEvent<{ value?: string | null }>): number | null {
  const raw = event.detail.value
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, value) : null
}

function onServicesSelect(selected: Service[]) {
  state.serviceIds = selected.map((service) => service.id)
  state.duration = selected.reduce((sum, service) => sum + service.duration, 0)
  state.price = selected.length ? selected.reduce((sum, service) => sum + service.price, 0) : null
}

async function save() {
  submitted.value = true
  if (!canSave.value) return

  isSubmitting.value = true
  try {
    await props.onSave({
      id: props.appointment.id,
      client_id: state.clientId,
      service_ids: [...state.serviceIds],
      start_at: toUtcIsoFromZonedDateTime(state.date, state.time, props.timeZone),
      duration: state.duration,
      price: state.price,
      notes: state.notes.trim() || null,
    })
    initialState.value = snapshot()
    allowDismiss.value = true
    emit('saved')
    emit('update:isOpen', false)
  } catch {
    // The parent owns error feedback. Keep the modal and draft open for retry.
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    :can-dismiss="canDismiss"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="isSubmitting"
            :aria-label="t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('appointments.preview.editTitle') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-edit-mobile__content">
      <form id="appointment-edit-mobile-form" @submit.prevent="save">
        <inset-list :header="t('appointments.form.client')">
          <ion-item button :detail="true" lines="none" @click="isClientPickerOpen = true">
            <ion-icon slot="start" :icon="personCircleOutline" color="medium" aria-hidden="true" />
            <ion-label>{{ selectedClientName }}</ion-label>
          </ion-item>
        </inset-list>

        <inset-list :header="t('appointments.form.services')">
          <ion-item button :detail="true" lines="none" @click="isServicePickerOpen = true">
            <ion-icon slot="start" :icon="cutOutline" color="medium" aria-hidden="true" />
            <ion-label class="ion-text-wrap">{{ selectedServicesLabel }}</ion-label>
          </ion-item>
        </inset-list>
        <ion-note v-if="submitted && !state.serviceIds.length" color="danger" class="field-note">
          {{ t('appointments.validation.servicesRequired') }}
        </ion-note>

        <inset-list :header="t('appointments.preview.date')">
          <ion-item lines="full">
            <ion-label>{{ t('appointments.form.date') }}</ion-label>
            <ion-input
              v-model="state.date"
              slot="end"
              class="appointment-edit-mobile__input"
              type="date"
              :aria-label="t('appointments.form.date')"
            />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ t('appointments.form.time') }}</ion-label>
            <ion-input
              v-model="state.time"
              slot="end"
              class="appointment-edit-mobile__input"
              type="time"
              :aria-label="t('appointments.form.time')"
            />
          </ion-item>
        </inset-list>

        <inset-list>
          <ion-item lines="full">
            <ion-label>{{ t('appointments.form.duration') }}</ion-label>
            <ion-input
              v-model.number="state.duration"
              slot="end"
              class="appointment-edit-mobile__input"
              type="number"
              inputmode="numeric"
              min="1"
              :aria-label="t('appointments.form.duration')"
            />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ t('appointments.form.price') }}</ion-label>
            <ion-input
              slot="end"
              class="appointment-edit-mobile__input"
              type="number"
              inputmode="decimal"
              min="0"
              :value="state.price"
              :aria-label="t('appointments.form.price')"
              @ion-input="state.price = readNullableNumber($event)"
            />
          </ion-item>
        </inset-list>

        <inset-list :header="t('appointments.form.notes')">
          <ion-item lines="none">
            <ion-textarea
              v-model="state.notes"
              :maxlength="2000"
              :rows="4"
              auto-grow
              :placeholder="t('appointments.form.notesPlaceholder')"
              :aria-label="t('appointments.form.notes')"
            />
          </ion-item>
        </inset-list>
      </form>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="appointment-edit-mobile__save"
          expand="block"
          color="primary"
          :disabled="!canSave"
          :aria-busy="isSubmitting"
          @click="save"
        >
          <ion-spinner v-if="isSubmitting" slot="start" :name="spinnerName" />
          <ion-icon v-else slot="start" :icon="checkmarkOutline" aria-hidden="true" />
          {{ t('appointments.preview.save') }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <client-picker-modal-mobile
      v-model:is-open="isClientPickerOpen"
      v-model:model-value="state.clientId"
      :clients="clients"
      :presenting-element="selfModalEl"
    />

    <service-picker-modal-mobile
      v-model:is-open="isServicePickerOpen"
      v-model:model-value="state.serviceIds"
      :services="services"
      :presenting-element="selfModalEl"
      @select="onServicesSelect"
    />
  </ion-modal>
</template>

<style scoped>
.appointment-edit-mobile__content,
.appointment-edit-mobile__content ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-edit-mobile__input {
  max-width: 150px;
  text-align: end;
}

.field-note {
  display: block;
  padding: 0 30px;
}

.appointment-edit-mobile__save {
  --border-radius: 12px;

  min-height: 48px;
  margin: 8px 14px calc(8px + var(--safe-area-bottom, 0px));
  text-transform: none;
}

.appointment-edit-mobile__save ion-icon[slot='start'],
.appointment-edit-mobile__save ion-spinner[slot='start'] {
  margin-inline-end: 7px;
}
</style>
