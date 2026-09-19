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
  IonModal,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonSkeletonText,
  IonSpinner,
  isPlatform,
  useIonRouter,
  alertController,
  toastController,
} from '@ionic/vue'
import {
  arrowBackOutline,
  calendarOutline,
  callOutline,
  closeOutline,
  ellipsisHorizontal,
  logoWhatsapp,
  pencilOutline,
  trashOutline,
} from 'ionicons/icons'
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
import { InsetList } from '@shared/ui/inset-list/index.mobile'

const { t } = useI18n()
const route = useRoute()
const ionRouter = useIonRouter()
const sessionStore = useSessionStore()
const formats = useFormats()
const now = useNowMinute()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const removeClient = useRemoveClientMutation(userId)
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

// Detail is derived from the shared clients list (already cached from the list
// screen) — no extra fetch, just a lookup by the route param.
const { data: clients, isPending } = useClientsQuery(userId)
const isEditOpen = ref(false)
const isActionsOpen = ref(false)
const pendingAction = ref<'edit' | 'delete' | null>(null)
const showHeaderTitle = ref(false)

// The root router outlet is the presenting element so the edit modal uses the
// same iOS card transition as the Services and Payment Methods forms.
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

const clientId = computed(() => (route.params.id ? String(route.params.id) : ''))
const client = computed<Client | null>(
  () => clients.value?.find((item) => item.id === clientId.value) ?? null,
)

const { data: appointments, isPending: appointmentsPending } = useClientAppointmentsQuery(clientId)
const { data: services } = useServicesQuery(userId)

const fullName = computed(() =>
  client.value ? [client.value.first_name, client.value.last_name].filter(Boolean).join(' ') : '',
)
const phoneDigits = computed(() => client.value?.phone.replace(/\D/g, '') ?? '')
const whatsappHref = computed(() =>
  phoneDigits.value ? `https://wa.me/${phoneDigits.value}` : undefined,
)
const callHref = computed(() => (client.value?.phone ? `tel:${client.value.phone}` : undefined))

const HEADER_TITLE_SCROLL_THRESHOLD = 96

function onContentScroll(event: CustomEvent<{ scrollTop: number }>) {
  showHeaderTitle.value = event.detail.scrollTop >= HEADER_TITLE_SCROLL_THRESHOLD
}

function initials(value: Client): string {
  const parts = [value.first_name, value.last_name].filter(Boolean) as string[]
  return (
    parts
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  )
}

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
    const service = list.find((item: Service) => item.id === id)
    return sum + (service?.price ?? 0)
  }, 0)
}

function statusView(appointment: Appointment) {
  return getEffectiveAppointmentStatusView(appointment, now.value)
}

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

async function showToast(message: string, color: 'success' | 'danger' | 'medium') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function openBooking() {
  // The Ionic bundle doesn't have a create-appointment wizard yet. Keep this
  // entry point visible without duplicating the desktop appointment flow.
  await showToast(t('clients.details.bookingSoon'), 'medium')
}

async function openActions() {
  if (!client.value || removeClient.isLoading.value) return
  isActionsOpen.value = true
}

function selectAction(action: 'edit' | 'delete') {
  pendingAction.value = action
  isActionsOpen.value = false
}

function closeActions() {
  pendingAction.value = null
  isActionsOpen.value = false
}

function onActionsDidDismiss() {
  isActionsOpen.value = false
  const action = pendingAction.value
  pendingAction.value = null
  if (action === 'edit') isEditOpen.value = true
  if (action === 'delete') void onDelete()
}

async function onDelete() {
  if (!client.value || removeClient.isLoading.value) return
  const target = client.value
  const alert = await alertController.create({
    header: t('clients.delete.title'),
    message: t('clients.delete.message', { name: fullName.value }),
    buttons: [
      { text: t('clients.delete.cancel'), role: 'cancel' },
      { text: t('clients.delete.confirm'), role: 'destructive' },
    ],
  })
  await alert.present()
  if ((await alert.onDidDismiss()).role !== 'destructive') return

  try {
    await removeClient.mutateAsync(target.id)
    await showToast(t('clients.deleteSuccess'), 'success')
    ionRouter.navigate('/tabs/clients', 'back', 'pop')
  } catch {
    await showToast(t('clients.deleteError'), 'danger')
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/clients"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <Transition name="client-toolbar-title">
          <ion-title v-if="showHeaderTitle">{{ fullName }}</ion-title>
        </Transition>
        <ion-buttons v-if="client" slot="end">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="removeClient.isLoading.value"
            :aria-busy="removeClient.isLoading.value"
            :aria-label="$t('clients.details.moreActions')"
            @click="openActions"
          >
            <ion-spinner v-if="removeClient.isLoading.value" :name="spinnerName" />
            <ion-icon v-else slot="icon-only" :icon="ellipsisHorizontal" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      :scroll-events="true"
      class="client-detail-content ion-padding-bottom"
      @ion-scroll="onContentScroll"
    >
      <div v-if="isPending" class="loading-state" aria-live="polite">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="!client" class="empty-page-state">
        <p>{{ $t('clients.details.notFoundTitle') }}</p>
      </div>

      <template v-else>
        <section class="client-hero">
          <div class="client-avatar" aria-hidden="true">
            <span v-if="client.emoji" class="client-avatar__emoji">{{ client.emoji }}</span>
            <span v-else>{{ initials(client) }}</span>
          </div>

          <h1 class="client-name">{{ fullName }}</h1>

          <div class="client-actions">
            <ion-button
              class="client-action"
              fill="clear"
              :href="whatsappHref"
              target="_blank"
              rel="noopener noreferrer"
              :disabled="!whatsappHref"
              :aria-label="$t('clients.details.whatsapp')"
            >
              <ion-icon slot="icon-only" :icon="logoWhatsapp" aria-hidden="true" />
            </ion-button>
            <ion-button
              class="client-action"
              fill="clear"
              :href="callHref"
              :disabled="!callHref"
              :aria-label="$t('clients.details.call')"
            >
              <ion-icon slot="icon-only" :icon="callOutline" aria-hidden="true" />
            </ion-button>
            <ion-button
              class="client-action"
              fill="clear"
              :aria-label="$t('clients.details.booking')"
              @click="openBooking"
            >
              <ion-icon slot="icon-only" :icon="calendarOutline" aria-hidden="true" />
            </ion-button>
          </div>
        </section>

        <inset-list :header="$t('clients.details.notes')">
          <ion-item lines="none" class="notes-item">
            <ion-label class="ion-text-wrap">
              <p :class="{ 'notes-empty': !client.notes }">
                {{ client.notes || $t('clients.details.noNotes') }}
              </p>
            </ion-label>
          </ion-item>
        </inset-list>

        <inset-list :header="$t('clients.details.appointments')">
          <template v-if="appointmentsPending">
            <ion-item v-for="n in 3" :key="`skeleton-${n}`" class="appointment-item">
              <ion-label>
                <h2><ion-skeleton-text :animated="true" style="width: 60%" /></h2>
                <p><ion-skeleton-text :animated="true" style="width: 42%" /></p>
              </ion-label>
              <div slot="end" class="appointment-meta">
                <ion-skeleton-text :animated="true" style="width: 58px; height: 18px" />
                <ion-skeleton-text :animated="true" style="width: 46px" />
              </div>
            </ion-item>
          </template>

          <template v-else>
            <ion-item
              v-for="appointment in appointments"
              :key="appointment.id"
              class="appointment-item"
            >
              <ion-label class="appointment-copy">
                <h2>{{ serviceNames(appointment) }}</h2>
                <p>{{ formats.dateTime(appointment.start_at) }}</p>
              </ion-label>
              <div slot="end" class="appointment-meta">
                <span
                  class="appointment-status"
                  :class="`appointment-status--${statusColor(appointment)}`"
                >
                  {{ $t(statusView(appointment).labelKey) }}
                </span>
                <span>{{ formats.price(appointmentTotal(appointment)) }}</span>
              </div>
            </ion-item>

            <ion-item v-if="!appointments?.length" lines="none" class="appointments-empty">
              <ion-label class="ion-text-center ion-text-wrap">
                <p>{{ $t('clients.details.noAppointments') }}</p>
              </ion-label>
            </ion-item>
          </template>
        </inset-list>
      </template>

      <client-form-mobile
        v-if="client"
        v-model:is-open="isEditOpen"
        mode="edit"
        :client="client"
        :presenting-element="presentingElement"
      />

      <ion-modal
        :is-open="isActionsOpen"
        class="client-actions-modal"
        :breakpoints="[0, 1]"
        :initial-breakpoint="1"
        :handle="true"
        @did-dismiss="onActionsDidDismiss"
      >
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button
                fill="clear"
                color="dark"
                :aria-label="$t('common.close')"
                @click="closeActions"
              >
                <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ $t('clients.details.actionsTitle') }}</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content class="client-actions-modal__content">
          <inset-list class="client-actions-modal__list">
            <ion-item button :detail="false" @click="selectAction('edit')">
              <ion-icon slot="start" :icon="pencilOutline" aria-hidden="true" />
              <ion-label>{{ $t('clients.details.editButton') }}</ion-label>
            </ion-item>
            <ion-item
              button
              :detail="false"
              lines="none"
              class="client-actions-modal__delete"
              @click="selectAction('delete')"
            >
              <ion-icon slot="start" :icon="trashOutline" aria-hidden="true" />
              <ion-label>{{ $t('clients.details.deleteButton') }}</ion-label>
            </ion-item>
          </inset-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 8px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.client-toolbar-title-enter-active,
.client-toolbar-title-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.client-toolbar-title-enter-from,
.client-toolbar-title-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.client-detail-content {
  --padding-bottom: 24px;
}

.loading-state,
.empty-page-state {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-page-state p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.client-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px 30px;
}

.client-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: inset 0 0 0 1px var(--se-separator, rgb(0 0 0 / 11%));
}

.client-avatar__emoji {
  font-size: 2.4rem;
}

.client-name {
  width: 100%;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--ion-text-color);
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

.client-actions {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  gap: 14px;
  margin-top: 8px;
}

.client-action {
  width: 56px;
  height: 56px;
  margin: 0;
  color: var(--ion-color-primary);
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 14px;
  --background: var(--se-surface-card, #fff);
  --background-activated: var(--ion-color-step-150, #dedede);
  --box-shadow: none;
}

.client-action::part(native) {
  border: 1px solid var(--se-separator, rgb(0 0 0 / 11%));
}

.client-action ion-icon {
  font-size: 24px;
}

.notes-item {
  --padding-top: 11px;
  --padding-bottom: 11px;
}

.notes-item p {
  margin: 0;
  color: var(--ion-text-color);
  font-size: 0.94rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.notes-item .notes-empty,
.appointments-empty p {
  color: var(--ion-color-medium);
}

.appointment-item {
  --min-height: 74px;
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.appointment-copy {
  min-width: 0;
}

.appointment-copy h2,
.appointment-copy p {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-copy h2 {
  font-size: 0.94rem;
  font-weight: 600;
}

.appointment-copy p {
  margin-top: 4px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.appointment-meta {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  max-width: 42%;
  margin-inline-start: 12px;
  font-size: 0.84rem;
  font-weight: 500;
}

.appointment-status {
  --status-color: var(--ion-color-medium);

  max-width: 100%;
  padding: 5px 9px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--status-color) 14%, transparent);
  color: var(--status-color);
  font-size: 0.68rem;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-status--primary {
  --status-color: var(--ion-color-primary);
}

.appointment-status--success {
  --status-color: var(--ion-color-success);
}

.appointment-status--warning {
  --status-color: var(--ion-color-warning-shade, var(--ion-color-warning));
}

.appointment-status--danger {
  --status-color: var(--ion-color-danger);
}

.appointments-empty {
  --padding-top: 18px;
  --padding-bottom: 18px;
}

.client-actions-modal {
  --height: 238px;
  --border-radius: 20px 20px 0 0;
}

.client-actions-modal ion-toolbar,
.client-actions-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.client-actions-modal__list {
  margin-top: 8px;
}

.client-actions-modal__delete {
  --color: var(--ion-color-danger);
}

.client-actions-modal__delete ion-icon {
  color: var(--ion-color-danger);
}

@media (prefers-reduced-motion: reduce) {
  .client-toolbar-title-enter-active,
  .client-toolbar-title-leave-active {
    transition: none;
  }
}
</style>
