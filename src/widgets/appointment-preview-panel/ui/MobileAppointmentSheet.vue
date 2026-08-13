<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BadgeProps } from '@nuxt/ui'
import { getEffectiveAppointmentStatusView, type Appointment } from '@entities/appointment'
import { ClientAvatar, ClientPickerList, type Client } from '@entities/client'
import { ServicePickerList, type Service } from '@entities/service'
import type { TimeFormat } from '@entities/master'
import type { PaymentType } from '@entities/payment-type'
import type { Sale, SaleItem } from '@entities/sale'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import {
  OptionsDrawer,
  PriceInput,
  TimeField,
  type OptionsDrawerItem,
  Typography,
} from '@shared/ui'
import {
  APPOINTMENT_ACTION_CONFIG,
  type AppointmentAction,
  type AppointmentActionKey,
  type AppointmentTagKey,
} from '../config/action-config'
import type { AppointmentEditPayload } from '../model/edit-payload'

const props = defineProps<{
  appointment: Appointment
  /** All clients — used both to resolve the current one and to power the edit picker. */
  clients: Client[]
  /** All services — same dual purpose as `clients`. */
  services: Service[]
  paymentTypes?: PaymentType[]
  timeZone: string
  timeFormat: TimeFormat
  loading?: boolean
  isNew?: boolean
  sale?: (Sale & { items: SaleItem[] }) | null
  /** Persists an edit. Rejects on failure so the sheet stays in edit mode. */
  onSave?: (payload: AppointmentEditPayload) => Promise<void>
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
  complete: []
  decline: []
  no_show: []
  delete: []
  notify: []
  'after:leave': []
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const formats = useFormats()
const now = useNowMinute()

const mode = ref<'view' | 'edit'>('view')
const saving = ref(false)

// A reused sheet instance must drop back to view mode whenever a different
// appointment is opened, so it never lingers in a stale edit session.
watch(
  () => props.appointment.id,
  () => {
    mode.value = 'view'
  },
)

// --- Draft (edit mode) ---
const draft = reactive({
  client_id: '',
  service_ids: [] as string[],
  date: '',
  time: '',
  duration: 0,
  price: null as number | null,
  payment_type_id: null as string | null,
})

// Display status reflects the effective (time-derived) state; the action set
// stays keyed by the stored status (actions depend on the real state).
const statusView = computed(() => getEffectiveAppointmentStatusView(props.appointment, now.value))
const actions = computed(() => APPOINTMENT_ACTION_CONFIG[props.appointment.status])
const isEditing = computed(() => mode.value === 'edit')

// Current client/services resolve from the draft while editing, the stored
// appointment otherwise.
const activeClientId = computed(() =>
  isEditing.value ? draft.client_id : props.appointment.client_id,
)
const activeServiceIds = computed(() =>
  isEditing.value ? draft.service_ids : props.appointment.service_ids,
)

const client = computed(() => props.clients.find((c) => c.id === activeClientId.value) ?? null)
const clientName = computed(() => {
  if (!client.value) return t('appointments.unknownClient')
  return [client.value.first_name, client.value.last_name].filter(Boolean).join(' ')
})

const selectedServices = computed(() =>
  activeServiceIds.value
    .map((id) => props.services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service)),
)

// --- Date / time / duration (view) ---
const startParts = computed(() => getDateTimeInputValue(props.appointment.start_at, props.timeZone))
const endParts = computed(() => {
  const end = new Date(
    new Date(props.appointment.start_at).getTime() + props.appointment.duration * 60_000,
  )
  return getDateTimeInputValue(end, props.timeZone)
})

const formattedDate = computed(() => {
  const date = startParts.value.date
  // Parse at local midnight so the calendar day never shifts across time zones.
  return date ? formats.dateDayYear(new Date(`${date}T00:00:00`)) : '—'
})
const timeRange = computed(() => {
  const start = formats.time(startParts.value.time, props.timeFormat)
  const end = formats.time(endParts.value.time, props.timeFormat)
  return `${start} – ${end}`
})
const durationChip = computed(() =>
  formats.duration(isEditing.value ? draft.duration : props.appointment.duration),
)

// Duration dropdown: a 15-minute grid up to 8h, plus the current value if off-grid.
const durationOptions = computed(() => {
  const values = new Set<number>()
  for (let m = 15; m <= 480; m += 15) values.add(m)
  if (draft.duration > 0) values.add(draft.duration)
  return [...values]
    .sort((a, b) => a - b)
    .map((minutes) => ({ value: minutes, label: formats.duration(minutes) }))
})

// --- Total ---
const servicesSum = computed(() =>
  selectedServices.value.reduce((sum, service) => sum + (service.price ?? 0), 0),
)
const activePrice = computed(() => (isEditing.value ? draft.price : props.appointment.price))
const total = computed(() => activePrice.value ?? servicesSum.value)
const hasCustomPrice = computed(
  () => activePrice.value != null && activePrice.value !== servicesSum.value,
)

// PriceInput proxy: shows the effective total, writes an explicit override.
const editablePrice = computed({
  get: () => draft.price ?? servicesSum.value,
  set: (value) => {
    draft.price = value
  },
})

const isCompleted = computed(() => props.appointment.status === 'completed')

const phoneHref = computed(() => (client.value?.phone ? `tel:${client.value.phone}` : undefined))

const paymentType = computed(
  () => props.paymentTypes?.find((p) => p.id === draft.payment_type_id) ?? null,
)

// --- Tags ---
const TAG_VIEW: Record<
  AppointmentTagKey,
  { icon: string; color: NonNullable<BadgeProps['color']>; labelKey: string }
> = {
  online_booking: {
    icon: 'i-lucide-globe',
    color: 'info',
    labelKey: 'appointments.preview.tags.onlineBooking',
  },
  new_client: {
    icon: 'i-lucide-sparkles',
    color: 'primary',
    labelKey: 'appointments.preview.tags.newClient',
  },
}

function isTagVisible(tag: AppointmentTagKey): boolean {
  if (tag === 'online_booking') return props.appointment.source === 'online_booking'
  if (tag === 'new_client') return Boolean(props.isNew)
  return Boolean(props.sale)
}
const visibleTags = computed(() => actions.value.tags.filter(isTagVisible))

function tagLabel(tag: AppointmentTagKey): string {
  return t(TAG_VIEW[tag].labelKey)
}

const primary = computed(() => actions.value.primary)
const secondary = computed(() => actions.value.secondary)

// --- Header overflow ("…") → OptionsDrawer ---
const isActionsOpen = ref(false)
const actionItems = computed<OptionsDrawerItem[]>(() =>
  actions.value.menu.map((action: AppointmentAction) => ({
    id: action.key,
    label: t(action.labelKey),
    icon: action.icon,
    iconColor: action.key === 'delete' ? 'error' : undefined,
  })),
)

function onActionSelect(item: OptionsDrawerItem) {
  runAction(item.id as AppointmentActionKey)
}

function runAction(key: AppointmentActionKey) {
  switch (key) {
    case 'confirm':
      return emit('confirm')
    case 'decline':
      return emit('decline')
    case 'complete':
      return emit('complete')
    case 'cancel':
      return emit('cancel')
    case 'edit':
      return enterEdit()
    case 'no_show':
      return emit('no_show')
    case 'delete':
      return emit('delete')
  }
}

// --- Edit lifecycle ---
function enterEdit() {
  const parts = getDateTimeInputValue(props.appointment.start_at, props.timeZone)
  draft.client_id = props.appointment.client_id
  draft.service_ids = [...props.appointment.service_ids]
  draft.date = parts.date
  draft.time = parts.time
  draft.duration = props.appointment.duration
  draft.price = props.appointment.price
  draft.payment_type_id = props.sale?.payment_type_id ?? null
  mode.value = 'edit'
}

function cancelEdit() {
  mode.value = 'view'
}

// --- Field editors ---
const isClientPickerOpen = ref(false)
const isServicePickerOpen = ref(false)
const isDurationOpen = ref(false)
const isPaymentOpen = ref(false)

// Temp selections so the full-screen pickers apply only on "Done".
const tempClientId = ref<string | null>(null)
const tempServiceIds = ref<string[]>([])

function openClientPicker() {
  tempClientId.value = draft.client_id
  isClientPickerOpen.value = true
}
function applyClientPicker() {
  draft.client_id = tempClientId.value ?? draft.client_id
  isClientPickerOpen.value = false
}

function openServicePicker() {
  tempServiceIds.value = [...draft.service_ids]
  isServicePickerOpen.value = true
}
function applyServicePicker() {
  // Scale a custom price proportionally to the new services subtotal.
  if (draft.price != null) {
    const oldSum = draft.service_ids.reduce(
      (sum, id) => sum + (props.services.find((s) => s.id === id)?.price ?? 0),
      0,
    )
    const newSum = tempServiceIds.value.reduce(
      (sum, id) => sum + (props.services.find((s) => s.id === id)?.price ?? 0),
      0,
    )
    draft.price = oldSum > 0 ? Math.round(draft.price * (newSum / oldSum)) : newSum || null
  }
  draft.service_ids = [...tempServiceIds.value]
  isServicePickerOpen.value = false
}

const durationItems = computed<OptionsDrawerItem[]>(() =>
  durationOptions.value.map((option) => ({
    id: String(option.value),
    label: option.label,
    active: option.value === draft.duration,
  })),
)
function onDurationSelect(item: OptionsDrawerItem) {
  draft.duration = Number(item.id)
}

const paymentItems = computed<OptionsDrawerItem[]>(() =>
  (props.paymentTypes ?? []).map((type) => ({
    id: type.id,
    label: type.name,
    icon: 'i-lucide-circle',
    iconColor: type.color,
    active: type.id === draft.payment_type_id,
  })),
)
function onPaymentSelect(item: OptionsDrawerItem) {
  draft.payment_type_id = item.id
}

async function save() {
  if (!props.onSave) return
  const normalizedPrice = editablePrice.value === servicesSum.value ? null : editablePrice.value
  const payload: AppointmentEditPayload = {
    id: props.appointment.id,
    client_id: draft.client_id,
    service_ids: draft.service_ids,
    start_at: toUtcIsoFromZonedDateTime(draft.date, draft.time, props.timeZone),
    duration: draft.duration,
    price: normalizedPrice,
  }
  if (isCompleted.value && props.sale && draft.payment_type_id) {
    payload.sale = {
      id: props.sale.id,
      payment_type_id: draft.payment_type_id,
      amount: normalizedPrice ?? servicesSum.value,
    }
  }
  saving.value = true
  try {
    await props.onSave(payload)
    mode.value = 'view'
  } finally {
    saving.value = false
  }
}

const canSave = computed(
  () =>
    Boolean(draft.client_id) &&
    draft.service_ids.length > 0 &&
    Boolean(draft.date) &&
    Boolean(draft.time) &&
    draft.duration > 0,
)
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="isEditing ? $t('appointments.preview.editTitle') : $t('appointments.preview.title')"
    :dismissible="!isEditing"
    :ui="{
      content: 'rounded-t-2xl h-[95dvh] flex flex-col',
      header: 'sr-only',
      body: 'flex min-h-0 flex-1 flex-col p-0',
      footer: 'shrink-0 border-t border-default px-4 py-3',
      container: 'flex-1',
    }"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <header class="flex items-center justify-between gap-2 pb-6">
        <UButton
          color="neutral"
          variant="ghost"
          :icon="isEditing ? 'i-lucide-arrow-left' : 'i-lucide-x'"
          :aria-label="isEditing ? $t('common.cancel') : $t('common.close')"
          @click="isEditing ? cancelEdit() : (open = false)"
        />
        <div class="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
          <UBadge :color="statusView.color" :icon="statusView.icon" variant="soft" size="lg">
            {{ $t(statusView.labelKey) }}
          </UBadge>
        </div>
        <UButton
          v-if="!isEditing"
          color="neutral"
          variant="ghost"
          icon="i-lucide-more-horizontal"
          :aria-label="$t('appointments.preview.actions')"
          @click="isActionsOpen = true"
        />
        <span v-else class="size-8 shrink-0" aria-hidden="true" />
      </header>

      <div class="flex-1 space-y-5 overflow-y-auto pb-[calc(0.5rem+var(--safe-area-bottom))]">
        <!-- Client -->
        <div class="flex items-center gap-3">
          <ClientAvatar
            :first-name="client?.first_name"
            :last-name="client?.last_name"
            :emoji="client?.emoji"
            :seed="client?.id"
            size="xl"
            class="shrink-0"
          />
          <div class="min-w-0 flex-1">
            <div class="flex gap-2">
              <Typography variant="h6" class="font-semibold">{{ clientName }}</Typography>
              <UBadge
                v-for="tag in visibleTags"
                :key="tag"
                :color="TAG_VIEW[tag].color"
                :icon="TAG_VIEW[tag].icon"
                variant="soft"
                size="sm"
                :aria-label="tagLabel(tag)"
                :title="tagLabel(tag)"
              />
            </div>
            <Typography variant="caption" class="text-muted">{{
              client?.phone || $t('appointments.preview.noPhone')
            }}</Typography>
          </div>
          <div v-if="isEditing" class="shrink-0">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              square
              :aria-label="$t('appointments.preview.selectClient')"
              @click="openClientPicker"
            />
          </div>
          <div v-else class="flex shrink-0 items-center gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-message-circle"
              square
              :aria-label="$t('appointments.preview.notifyClient')"
              @click="emit('notify')"
            />
            <UButton
              :href="phoneHref"
              :disabled="!phoneHref"
              color="neutral"
              variant="ghost"
              icon="i-lucide-phone"
              square
              :aria-label="$t('appointments.preview.callClient')"
            />
          </div>
        </div>

        <!-- Date / time / duration -->
        <div v-if="!isEditing" class="space-y-2">
          <div class="flex items-center gap-2 text-sm font-medium text-highlighted">
            <UIcon name="i-lucide-calendar" class="size-4 shrink-0 text-primary" />
            <span>{{ formattedDate }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-highlighted">
            <UIcon name="i-lucide-clock" class="size-4 shrink-0 text-primary" />
            <span>{{ timeRange }}</span>
            <UBadge color="neutral" variant="soft" size="sm" class="ml-1">
              {{ durationChip }}
            </UBadge>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold uppercase text-muted">
              {{ $t('appointments.preview.date') }}
            </label>
            <UInput v-model="draft.date" type="date" icon="i-lucide-calendar" class="w-full" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold uppercase text-muted">
                {{ $t('appointments.preview.time') }}
              </label>
              <TimeField v-model="draft.time" :aria-label="$t('appointments.preview.time')" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold uppercase text-muted">
                {{ $t('appointments.preview.duration') }}
              </label>
              <UButton
                color="neutral"
                variant="outline"
                block
                trailing-icon="i-lucide-chevron-down"
                :ui="{ base: 'justify-between' }"
                @click="isDurationOpen = true"
              >
                {{ durationChip }}
              </UButton>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Services + total -->
        <section class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('appointments.preview.services') }}
            </p>
            <UButton
              v-if="isEditing"
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              size="xs"
              square
              :aria-label="$t('appointments.preview.selectServices')"
              @click="openServicePicker"
            />
          </div>
          <div v-if="selectedServices.length">
            <div
              v-for="service in selectedServices"
              :key="service.id"
              class="flex items-center justify-between gap-3 border-b border-default py-2.5"
            >
              <div class="flex min-w-0 items-center gap-2.5">
                <span
                  class="size-3 shrink-0 rounded-full"
                  :style="{ backgroundColor: service.color || 'var(--ui-border-accented)' }"
                  aria-hidden="true"
                />
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-highlighted">{{ service.name }}</p>
                  <p class="text-xs text-muted">{{ formats.duration(service.duration) }}</p>
                </div>
              </div>
              <span class="shrink-0 text-sm font-medium">{{ formats.price(service.price) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 pt-3">
              <span class="text-xs font-semibold uppercase text-muted">
                {{ $t('appointments.preview.total') }}
              </span>
              <span v-if="isEditing" class="w-32">
                <PriceInput v-model="editablePrice" />
              </span>
              <span v-else class="flex items-baseline gap-2">
                <span v-if="hasCustomPrice" class="text-sm text-dimmed line-through">
                  {{ formats.price(servicesSum) }}
                </span>
                <span class="text-lg font-semibold text-highlighted">
                  {{ formats.price(total) }}
                </span>
              </span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">{{ $t('appointments.preview.noServices') }}</p>
        </section>

        <!-- Notes for closed appointments -->
        <template v-if="appointment.notes">
          <USeparator />
          <section class="space-y-2">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('appointments.preview.notes') }}
            </p>
            <p class="whitespace-pre-wrap text-sm">{{ appointment.notes }}</p>
          </section>
        </template>

        <!-- Payment info / editor for completed appointments -->
        <template v-if="isCompleted && (sale || isEditing)">
          <USeparator />
          <section class="space-y-3">
            <p class="text-xs font-semibold uppercase text-muted">
              {{ $t('checkout.paymentInfo') }}
            </p>
            <div v-if="!isEditing && sale" class="grid grid-cols-2 gap-3">
              <div class="rounded-md bg-elevated p-3">
                <p class="text-xs text-muted">{{ $t('checkout.paidAmount') }}</p>
                <p class="mt-1 text-sm font-medium">{{ formats.price(sale.amount) }}</p>
              </div>
              <div class="rounded-md bg-elevated p-3">
                <p class="text-xs text-muted">{{ $t('checkout.paidVia') }}</p>
                <p class="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <span
                    v-if="sale.payment_type"
                    class="inline-block size-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: sale.payment_type.color }"
                  />
                  {{ sale.payment_type?.name ?? '—' }}
                </p>
              </div>
            </div>
            <div v-else-if="isEditing" class="space-y-1.5">
              <label class="text-xs font-semibold uppercase text-muted">
                {{ $t('appointments.preview.paymentMethod') }}
              </label>
              <UButton
                color="neutral"
                variant="outline"
                block
                trailing-icon="i-lucide-chevron-down"
                :ui="{ base: 'justify-between' }"
                @click="isPaymentOpen = true"
              >
                <span class="flex items-center gap-2">
                  <span
                    v-if="paymentType"
                    class="inline-block size-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: paymentType.color }"
                  />
                  {{ paymentType?.name ?? '—' }}
                </span>
              </UButton>
            </div>
          </section>
        </template>
      </div>
    </template>

    <!-- Footer: pinned to the very bottom; the body scrolls above it. -->
    <template v-if="isEditing || primary || secondary" #footer>
      <div
        v-if="isEditing"
        class="flex w-full gap-2 pt-1 pb-[calc(0.25rem+var(--safe-area-bottom))]"
      >
        <UButton color="neutral" variant="ghost" size="lg" block @click="cancelEdit">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          color="neutral"
          variant="solid"
          size="lg"
          block
          :loading="saving"
          :disabled="!canSave"
          @click="save"
        >
          {{ $t('appointments.preview.save') }}
        </UButton>
      </div>
      <div v-else class="w-full space-y-2 pt-1 pb-[calc(0.25rem+var(--safe-area-bottom))]">
        <UButton
          v-if="primary"
          :color="primary.color"
          :variant="primary.variant"
          :leading-icon="primary.icon"
          :loading="loading"
          size="lg"
          block
          @click="runAction(primary.key)"
        >
          {{ $t(primary.labelKey) }}
        </UButton>
        <UButton
          v-if="secondary"
          :color="secondary.color"
          :variant="secondary.variant"
          :leading-icon="secondary.icon"
          :loading="loading"
          block
          @click="runAction(secondary.key)"
        >
          {{ $t(secondary.labelKey) }}
        </UButton>
      </div>
    </template>
  </UDrawer>

  <!-- Header overflow actions -->
  <OptionsDrawer
    v-model:open="isActionsOpen"
    :title="$t('appointments.preview.actions')"
    :items="actionItems"
    @select="onActionSelect"
  />

  <!-- Duration dropdown -->
  <OptionsDrawer
    v-model:open="isDurationOpen"
    :title="$t('appointments.preview.duration')"
    :items="durationItems"
    @select="onDurationSelect"
  />

  <!-- Payment method dropdown -->
  <OptionsDrawer
    v-model:open="isPaymentOpen"
    :title="$t('appointments.preview.paymentMethod')"
    :items="paymentItems"
    @select="onPaymentSelect"
  />

  <!-- Full-screen client picker -->
  <UModal
    v-model:open="isClientPickerOpen"
    fullscreen
    :title="$t('appointments.preview.selectClient')"
    :ui="{ body: 'flex min-h-0 flex-1 flex-col' }"
  >
    <template #body>
      <ClientPickerList v-model="tempClientId" :clients="clients" fill />
    </template>
    <template #footer>
      <UButton color="neutral" size="lg" block @click="applyClientPicker">
        {{ $t('appointments.preview.done') }}
      </UButton>
    </template>
  </UModal>

  <!-- Full-screen service picker -->
  <UModal
    v-model:open="isServicePickerOpen"
    fullscreen
    :title="$t('appointments.preview.selectServices')"
    :ui="{ body: 'flex min-h-0 flex-1 flex-col' }"
  >
    <template #body>
      <ServicePickerList v-model="tempServiceIds" :services="services" fill />
    </template>
    <template #footer>
      <UButton color="neutral" size="lg" block @click="applyServicePicker">
        {{ $t('appointments.preview.done') }}
      </UButton>
    </template>
  </UModal>
</template>
