<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonTitle,
  IonIcon,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBadge,
  IonSkeletonText,
  IonSpinner,
  useIonRouter,
  alertController,
  toastController,
} from '@ionic/vue'
import { create, trash } from 'ionicons/icons'
import { useClientsQuery, useRemoveClientMutation, type Client } from '@entities/client'
import {
  useClientAppointmentsQuery,
  getEffectiveAppointmentStatusView,
  type Appointment,
} from '@entities/appointment'
import { useServicesQuery, type Service } from '@entities/service'
import { ClientFormMobile } from '@features/client-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'

const { t } = useI18n()
const route = useRoute()
const ionRouter = useIonRouter()
const sessionStore = useSessionStore()
const formats = useFormats()
const now = useNowMinute()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const removeClient = useRemoveClientMutation(userId)

// Detail is derived from the shared clients list (already cached from the list
// screen) — no extra fetch, just a lookup by the route param.
const { data: clients, isPending } = useClientsQuery(userId)

const isEditOpen = ref(false)

// The tab's router outlet is the "presenting element" so the edit sheet renders
// as an iOS card (page scaled behind it) — same pattern as the list screen.
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

// Guard against `route.params.id` being absent while navigating away: coercing
// `undefined` with String() yields the truthy string "undefined", which would
// keep the appointments query enabled and refetch with client_id=undefined.
const clientId = computed(() => (route.params.id ? String(route.params.id) : ''))
const client = computed<Client | null>(
  () => clients.value?.find((c) => c.id === clientId.value) ?? null,
)

// Appointment history — same queries the web ClientDetailsPanel uses; the API
// already returns them newest-first. Services resolve the service names/prices.
const { data: appointments, isPending: appointmentsPending } =
  useClientAppointmentsQuery(clientId)
const { data: services } = useServicesQuery(userId)

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
  return getEffectiveAppointmentStatusView(appointment, now.value)
}

// The shared status config uses Nuxt UI color names; map them to Ionic's badge
// palette so the mobile bundle stays free of Nuxt UI.
const STATUS_ION_COLOR: Record<string, string> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  neutral: 'medium',
}

function statusColor(appointment: Appointment): string {
  return STATUS_ION_COLOR[String(statusView(appointment).color)] ?? 'medium'
}

const fullName = computed(() =>
  client.value ? [client.value.first_name, client.value.last_name].filter(Boolean).join(' ') : '',
)

function initials(c: Client): string {
  const parts = [c.first_name, c.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function onDelete() {
  if (!client.value) return
  const target = client.value
  const alert = await alertController.create({
    header: t('clients.delete.title'),
    message: t('clients.delete.message', { name: fullName.value }),
    buttons: [
      { text: t('clients.delete.cancel'), role: 'cancel' },
      {
        text: t('clients.delete.confirm'),
        role: 'destructive',
        handler: () => {
          void deleteAndLeave(target)
        },
      },
    ],
  })
  await alert.present()
}

async function deleteAndLeave(target: Client) {
  try {
    await removeClient.mutateAsync(target.id)
    await showToast(t('clients.deleteSuccess'), 'success')
    // Client is gone — return to the list rather than a stale detail view.
    ionRouter.navigate('/tabs/clients', 'back', 'pop')
  } catch {
    await showToast(t('clients.deleteError'), 'danger')
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/clients" />
        </ion-buttons>
        <ion-title>{{ fullName }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="client"
            :aria-label="$t('clients.details.editButton')"
            @click="isEditOpen = true"
          >
            <ion-icon slot="icon-only" :icon="create" />
          </ion-button>
          <ion-button
            v-if="client"
            color="danger"
            :aria-label="$t('clients.details.deleteButton')"
            @click="onDelete"
          >
            <ion-icon slot="icon-only" :icon="trash" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <div v-else-if="!client" class="px-6 py-16 text-center">
        <p class="text-lg font-semibold">{{ $t('clients.details.notFoundTitle') }}</p>
      </div>

      <template v-else>
        <div class="flex flex-col items-center gap-3 py-6">
          <div
            class="flex size-20 items-center justify-center rounded-full bg-gray-100 text-2xl font-semibold text-gray-700"
          >
            <span v-if="client.emoji">{{ client.emoji }}</span>
            <span v-else>{{ initials(client) }}</span>
          </div>
          <h1 class="text-xl font-bold">{{ fullName }}</h1>
        </div>

        <ion-list inset>
          <ion-item>
            <ion-label>
              <p>{{ $t('clients.form.phoneLabel') }}</p>
              <h3>{{ client.phone }}</h3>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>{{ $t('clients.form.emailLabel') }}</p>
              <h3>{{ client.email || $t('clients.details.noEmail') }}</h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item>
            <ion-label class="ion-text-wrap">
              <p>{{ $t('clients.details.notes') }}</p>
              <h3>{{ client.notes || $t('clients.details.noNotes') }}</h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('clients.details.appointments') }}</ion-label>
          </ion-list-header>

          <template v-if="appointmentsPending">
            <ion-item v-for="n in 3" :key="`skeleton-${n}`" lines="full">
              <ion-label>
                <h3><ion-skeleton-text :animated="true" style="width: 60%" /></h3>
                <p><ion-skeleton-text :animated="true" style="width: 40%" /></p>
              </ion-label>
              <div slot="end" class="flex flex-col items-end gap-1">
                <ion-skeleton-text :animated="true" style="width: 56px; height: 18px" />
                <ion-skeleton-text :animated="true" style="width: 44px" />
              </div>
            </ion-item>
          </template>

          <template v-else>
            <ion-item v-for="appt in appointments" :key="appt.id" lines="full">
              <ion-label class="ion-text-wrap">
                <h3>{{ serviceNames(appt) }}</h3>
                <p>{{ formats.dateTime(appt.start_at) }}</p>
              </ion-label>
              <div slot="end" class="flex flex-col items-end gap-1">
                <ion-badge :color="statusColor(appt)">
                  {{ $t(statusView(appt).labelKey) }}
                </ion-badge>
                <span class="text-sm font-medium">{{ formats.price(appointmentTotal(appt)) }}</span>
              </div>
            </ion-item>

            <ion-item v-if="!appointments?.length" lines="none">
              <ion-label class="ion-text-center ion-text-wrap">
                <p>{{ $t('clients.details.noAppointments') }}</p>
              </ion-label>
            </ion-item>
          </template>
        </ion-list>
      </template>

      <client-form-mobile
        v-if="client"
        v-model:is-open="isEditOpen"
        mode="edit"
        :client="client"
        :presenting-element="presentingElement"
      />
    </ion-content>
  </ion-page>
</template>
