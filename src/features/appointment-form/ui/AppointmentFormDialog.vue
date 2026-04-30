<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Appointment, AppointmentStatus, CreateAppointmentDto } from '@entities/appointment'
import {
  useCreateAppointmentMutation,
  useRemoveAppointmentMutation,
  useUpdateAppointmentMutation,
} from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useSessionStore } from '@entities/session'
import { useServicesQuery } from '@entities/service'

const props = defineProps<{
  open: boolean
  initialStartAt?: string
  appointment?: Appointment
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const isEdit = computed(() => !!props.appointment)

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

// --- Data for dropdowns ---
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

const clientItems = computed(() =>
  (clients.value ?? []).map((c) => ({
    label: [c.first_name, c.last_name].filter(Boolean).join(' '),
    value: c.id,
  })),
)

const serviceItems = computed(() =>
  (services.value ?? []).map((s) => ({
    label: `${s.name} (${s.duration} ${t('appointments.form.minShort')})`,
    value: s.id,
  })),
)

const statusItems = computed<{ label: string; value: AppointmentStatus }[]>(() => [
  { label: t('appointments.status.pending'), value: 'pending' },
  { label: t('appointments.status.confirmed'), value: 'confirmed' },
  { label: t('appointments.status.completed'), value: 'completed' },
  { label: t('appointments.status.cancelled'), value: 'cancelled' },
  { label: t('appointments.status.no_show'), value: 'no_show' },
])

// --- Form state ---
interface FormState {
  client_id: string
  date: string
  time: string
  duration: number
  price: number | null
  status: AppointmentStatus
  notes: string
}

const state = reactive<FormState>({
  client_id: '',
  date: '',
  time: '',
  duration: 0,
  price: null,
  status: 'pending',
  notes: '',
})

const selectedServiceIds = ref<string[]>([])
const isDurationOverridden = ref(false)
const isPriceOverridden = ref(false)

// Auto-calc duration and price from selected services
watch(selectedServiceIds, (ids) => {
  const selected = (services.value ?? []).filter((s) => ids.includes(s.id))
  if (!isDurationOverridden.value) {
    state.duration = selected.reduce((sum, s) => sum + s.duration, 0)
  }
  if (!isPriceOverridden.value) {
    state.price = selected.length > 0 ? selected.reduce((sum, s) => sum + s.price, 0) : null
  }
})

function onDurationInput() {
  isDurationOverridden.value = true
}

function onPriceInput() {
  isPriceOverridden.value = true
}

// --- Reset / populate form ---
function resetForm() {
  isDurationOverridden.value = false
  isPriceOverridden.value = false

  if (props.appointment && isEdit.value) {
    const appt = props.appointment
    const dt = new Date(appt.start_at)
    state.client_id = appt.client_id
    state.date = dt.toISOString().slice(0, 10)
    state.time = dt.toTimeString().slice(0, 5)
    state.duration = appt.duration
    state.price = appt.price
    state.status = appt.status
    state.notes = appt.notes ?? ''
    selectedServiceIds.value = [...appt.service_ids]
  } else {
    state.client_id = ''
    state.date = props.initialStartAt ? props.initialStartAt.slice(0, 10) : ''
    state.time = props.initialStartAt ? props.initialStartAt.slice(11, 16) : ''
    state.duration = 0
    state.price = null
    state.status = 'pending'
    state.notes = ''
    selectedServiceIds.value = []
  }
}

watch(() => props.open, (open) => {
  if (open) resetForm()
})

// --- Validation schema ---
const schema = computed(() =>
  Joi.object({
    client_id: Joi.string().required().messages({
      'string.empty': t('appointments.validation.clientRequired'),
      'any.required': t('appointments.validation.clientRequired'),
    }),
    date: Joi.string().required().messages({
      'string.empty': t('appointments.validation.dateRequired'),
      'any.required': t('appointments.validation.dateRequired'),
    }),
    time: Joi.string().required().messages({
      'string.empty': t('appointments.validation.timeRequired'),
      'any.required': t('appointments.validation.timeRequired'),
    }),
    duration: Joi.number().min(1).required().messages({
      'number.min': t('appointments.validation.durationMin'),
      'any.required': t('appointments.validation.durationRequired'),
    }),
    price: Joi.number().min(0).allow(null).optional(),
    status: Joi.string().required(),
    notes: Joi.string().max(2000).allow('', null).optional(),
  }),
)

// --- Mutations ---
const createMutation = useCreateAppointmentMutation(userId)
const updateMutation = useUpdateAppointmentMutation(userId)
const removeMutation = useRemoveAppointmentMutation(userId)

const isLoading = computed(
  () =>
    createMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    removeMutation.isLoading.value,
)

const formRef = ref<{ $el: HTMLFormElement } | null>(null)

function submitForm() {
  formRef.value?.$el?.requestSubmit()
}

async function onSubmit(event: FormSubmitEvent<FormState>) {
  if (selectedServiceIds.value.length === 0) {
    toast.add({ title: t('appointments.validation.servicesRequired'), color: 'error' })
    return
  }

  const startAt = new Date(`${event.data.date}T${event.data.time}:00`).toISOString()

  const dto: CreateAppointmentDto = {
    client_id: event.data.client_id,
    service_ids: selectedServiceIds.value,
    start_at: startAt,
    duration: event.data.duration,
    price: event.data.price,
    notes: event.data.notes || null,
    status: event.data.status,
  }

  try {
    if (isEdit.value && props.appointment) {
      await updateMutation.mutateAsync({ ...dto, id: props.appointment.id })
      toast.add({ title: t('appointments.form.successEdit'), color: 'success' })
    } else {
      await createMutation.mutateAsync(dto)
      toast.add({ title: t('appointments.form.successCreate'), color: 'success' })
    }
    isOpen.value = false
    emit('saved')
  } catch {
    toast.add({ title: t('appointments.form.errorTitle'), color: 'error' })
  }
}

// --- Delete ---
const isDeleteConfirmOpen = ref(false)

async function confirmDelete() {
  if (!props.appointment) return
  try {
    await removeMutation.mutateAsync(props.appointment.id)
    toast.add({ title: t('appointments.form.successDelete'), color: 'success' })
    isDeleteConfirmOpen.value = false
    isOpen.value = false
    emit('saved')
  } catch {
    toast.add({ title: t('appointments.form.errorDelete'), color: 'error' })
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? $t('appointments.form.titleEdit') : $t('appointments.form.titleCreate')"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <UForm
        ref="formRef"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <!-- Client -->
        <UFormField :label="$t('appointments.form.client')" name="client_id" required>
          <USelectMenu
            v-model="state.client_id"
            :items="clientItems"
            value-key="value"
            :placeholder="$t('appointments.form.clientPlaceholder')"
            searchable
            class="w-full"
          />
        </UFormField>

        <!-- Services (multiple) -->
        <UFormField :label="$t('appointments.form.services')" name="services" required>
          <USelectMenu
            v-model="selectedServiceIds"
            :items="serviceItems"
            value-key="value"
            :placeholder="$t('appointments.form.servicesPlaceholder')"
            multiple
            searchable
            class="w-full"
          />
        </UFormField>

        <!-- Date + Time -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('appointments.form.date')" name="date" required>
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="$t('appointments.form.time')" name="time" required>
            <UInput v-model="state.time" type="time" class="w-full" />
          </UFormField>
        </div>

        <!-- Duration + Price -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('appointments.form.duration')" name="duration" required>
            <UInput
              v-model.number="state.duration"
              type="number"
              :min="1"
              class="w-full"
              @input="onDurationInput"
            />
          </UFormField>
          <UFormField :label="$t('appointments.form.price')" name="price">
            <UInput
              v-model.number="state.price"
              type="number"
              :min="0"
              :placeholder="$t('appointments.form.pricePlaceholder')"
              class="w-full"
              @input="onPriceInput"
            />
          </UFormField>
        </div>

        <!-- Status -->
        <UFormField :label="$t('appointments.form.status')" name="status" required>
          <USelect
            v-model="state.status"
            :items="statusItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <!-- Notes -->
        <UFormField :label="$t('appointments.form.notes')" name="notes">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            :placeholder="$t('appointments.form.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full items-center justify-between">
        <UButton
          v-if="isEdit"
          color="error"
          variant="ghost"
          leading-icon="i-lucide-trash-2"
          :disabled="isLoading"
          @click="isDeleteConfirmOpen = true"
        >
          {{ $t('appointments.form.delete') }}
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="close">
            {{ $t('appointments.form.cancel') }}
          </UButton>
          <UButton color="primary" :loading="isLoading" @click="submitForm">
            {{ isEdit ? $t('appointments.form.submitEdit') : $t('appointments.form.submitCreate') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Delete confirmation -->
  <UModal
    v-model:open="isDeleteConfirmOpen"
    :title="$t('appointments.delete.title')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-muted">{{ $t('appointments.delete.message') }}</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="outline" @click="isDeleteConfirmOpen = false">
        {{ $t('appointments.delete.cancel') }}
      </UButton>
      <UButton color="error" :loading="removeMutation.isLoading.value" @click="confirmDelete">
        {{ $t('appointments.delete.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
