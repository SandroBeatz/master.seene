<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClientAvatar, type Client } from '@entities/client'
import {
  useClientAppointmentsQuery,
  lastVisitDate,
  APPOINTMENT_STATUS_VIEW,
  type Appointment,
} from '@entities/appointment'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  client: Client
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  toggleFavorite: []
  close: []
}>()

const { t } = useI18n()
const formats = useFormats()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const clientId = computed(() => props.client.id)

const { data: appointments } = useClientAppointmentsQuery(clientId)
const { data: services } = useServicesQuery(userId)

const fullName = computed(() =>
  [props.client.first_name, props.client.last_name].filter(Boolean).join(' '),
)

const sourceLabel = computed(() =>
  props.client.source === 'manual' ? t('clients.source.manual') : t('clients.source.online'),
)

const formattedCreatedAt = computed(() =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(props.client.created_at),
  ),
)

const lastVisitLabel = computed(() => {
  const date = lastVisitDate(appointments.value ?? [])
  if (!date) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date))
})

const whatsappHref = computed(() => {
  const digits = props.client.phone.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : undefined
})

function serviceNames(appointment: Appointment): string {
  const list = services.value ?? []
  const names = appointment.service_ids
    .map((id) => list.find((service: Service) => service.id === id)?.name)
    .filter(Boolean)
  return names.length ? names.join(', ') : t('clients.details.appointments')
}

function appointmentTotal(appointment: Appointment): number {
  if (appointment.price != null) return appointment.price
  const list = services.value ?? []
  return appointment.service_ids.reduce((sum, id) => {
    const service = list.find((s: Service) => s.id === id)
    return sum + (service?.price ?? 0)
  }, 0)
}

function statusView(appointment: Appointment) {
  return APPOINTMENT_STATUS_VIEW[appointment.status]
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
      <!-- Header -->
      <div class="flex items-start gap-3">
        <ClientAvatar
          :first-name="client.first_name"
          :last-name="client.last_name"
          :emoji="client.emoji"
          :seed="client.id"
          size="xl"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xl font-semibold text-highlighted">{{ fullName }}</p>
          <p class="mt-0.5 text-sm text-muted">
            <template v-if="lastVisitLabel">
              {{ $t('clients.card.lastVisit') }}: {{ lastVisitLabel }}
            </template>
            <template v-else>{{ $t('clients.card.noVisits') }}</template>
          </p>
        </div>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="$t('common.close')"
          @click="emit('close')"
        />
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-pencil"
          @click="emit('edit')"
        >
          {{ $t('clients.details.editButton') }}
        </UButton>
        <UButton
          color="error"
          variant="soft"
          leading-icon="i-lucide-trash-2"
          @click="emit('delete')"
        >
          {{ $t('clients.details.deleteButton') }}
        </UButton>
        <UButton
          square
          :color="client.is_favorite ? 'warning' : 'neutral'"
          variant="soft"
          :icon="client.is_favorite ? 'i-heroicons-star-solid' : 'i-lucide-star'"
          :aria-label="
            client.is_favorite ? $t('clients.card.removeFavorite') : $t('clients.card.addFavorite')
          "
          @click="emit('toggleFavorite')"
        />
        <UButton
          v-if="whatsappHref"
          square
          color="neutral"
          variant="soft"
          :to="whatsappHref"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('clients.details.whatsapp')"
        >
          <svg
            class="size-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 360 362"
          >
            <path
              fill="#25D366"
              fill-rule="evenodd"
              d="M307.546 52.566C273.709 18.684 228.706.017 180.756 0 81.951 0 1.538 80.404 1.504 179.235c-.017 31.594 8.242 62.432 23.928 89.609L0 361.736l95.024-24.925c26.179 14.285 55.659 21.805 85.655 21.814h.077c98.788 0 179.21-80.413 179.244-179.244.017-47.898-18.608-92.926-52.454-126.807v-.008Zm-126.79 275.788h-.06c-26.73-.008-52.952-7.194-75.831-20.765l-5.44-3.231-56.391 14.791 15.05-54.981-3.542-5.638c-14.912-23.721-22.793-51.139-22.776-79.286.035-82.14 66.867-148.973 149.051-148.973 39.793.017 77.198 15.53 105.328 43.695 28.131 28.157 43.61 65.596 43.593 105.398-.035 82.149-66.867 148.982-148.982 148.982v.008Zm81.719-111.577c-4.478-2.243-26.497-13.073-30.606-14.568-4.108-1.496-7.09-2.243-10.073 2.243-2.982 4.487-11.568 14.577-14.181 17.559-2.613 2.991-5.226 3.361-9.704 1.117-4.477-2.243-18.908-6.97-36.02-22.226-13.313-11.878-22.304-26.54-24.916-31.027-2.613-4.486-.275-6.91 1.959-9.136 2.011-2.011 4.478-5.234 6.721-7.847 2.244-2.613 2.983-4.486 4.478-7.469 1.496-2.991.748-5.603-.369-7.847-1.118-2.243-10.073-24.289-13.812-33.253-3.636-8.732-7.331-7.546-10.073-7.692-2.613-.13-5.595-.155-8.586-.155-2.991 0-7.839 1.118-11.947 5.604-4.108 4.486-15.677 15.324-15.677 37.361s16.047 43.344 18.29 46.335c2.243 2.991 31.585 48.225 76.51 67.632 10.684 4.615 19.029 7.374 25.535 9.437 10.727 3.412 20.49 2.931 28.208 1.779 8.604-1.289 26.498-10.838 30.228-21.298 3.73-10.46 3.73-19.433 2.613-21.298-1.117-1.865-4.108-2.991-8.586-5.234l.008-.017Z"
              clip-rule="evenodd"
            />
          </svg>
        </UButton>
      </div>

      <USeparator />

      <!-- Contacts -->
      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {{ $t('clients.details.contacts') }}
        </p>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-phone" class="shrink-0 text-muted" />
            <a :href="`tel:${client.phone}`" class="hover:text-primary">{{ client.phone }}</a>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-mail" class="shrink-0 text-muted" />
            <a v-if="client.email" :href="`mailto:${client.email}`" class="hover:text-primary">
              {{ client.email }}
            </a>
            <span v-else class="text-muted">{{ $t('clients.details.noEmail') }}</span>
          </div>
        </div>
      </div>

      <USeparator />

      <!-- Notes -->
      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {{ $t('clients.details.notes') }}
        </p>
        <p class="whitespace-pre-wrap text-sm">
          {{ client.notes || $t('clients.details.noNotes') }}
        </p>
      </div>

      <USeparator />

      <!-- Appointments -->
      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {{ $t('clients.details.appointments') }}
        </p>

        <div v-if="appointments?.length" class="space-y-2">
          <div
            v-for="appt in appointments"
            :key="appt.id"
            class="flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-default"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ serviceNames(appt) }}</p>
              <p class="mt-0.5 text-xs text-muted">{{ formats.dateTime(appt.start_at) }}</p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <UBadge :color="statusView(appt).color" variant="soft" size="sm">
                {{ $t(statusView(appt).labelKey) }}
              </UBadge>
              <p class="text-sm font-medium">{{ formats.price(appointmentTotal(appt)) }}</p>
            </div>
          </div>
        </div>

        <UEmpty
          v-else
          icon="i-lucide-calendar-clock"
          :description="$t('clients.details.noAppointments')"
        />
      </div>

      <USeparator />

      <!-- Footer meta -->
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{{ $t('clients.details.createdAt') }}: {{ formattedCreatedAt }}</span>
        <UBadge
          :color="client.source === 'manual' ? 'neutral' : 'primary'"
          variant="soft"
          size="sm"
        >
          {{ sourceLabel }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
