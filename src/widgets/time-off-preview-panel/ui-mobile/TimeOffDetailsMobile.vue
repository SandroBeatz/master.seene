<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonToolbar,
} from '@ionic/vue'
import {
  banOutline,
  calendarOutline,
  chatbubbleEllipsesOutline,
  closeOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons'
import type { TimeFormat } from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import { TimeOffWizardMobile } from '@features/time-off-wizard/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { addDateInputDays, getDateTimeInputValue } from '@shared/lib/time-zone'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ButtonSpinner } from '@shared/ui/button-spinner/index.mobile'

// Preview sheet of a time off — the companion of AppointmentDetailsMobile. The
// "when" and comment rows (and the footer) reopen the time-off wizard prefilled
// with this break, presented over the sheet; the parent deletes it.
const props = defineProps<{
  isOpen: boolean
  timeBlock: TimeBlock
  timeZone: string
  timeFormat: TimeFormat
  deleting?: boolean
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'did-dismiss': []
  saved: [timeBlock: TimeBlock]
  delete: []
}>()

const { t } = useI18n()
const formats = useFormats()

const detailsModal = ref<{ $el: HTMLElement } | null>(null)
const detailsModalEl = computed(() => detailsModal.value?.$el ?? null)
const editOpen = ref(false)

/** `YYYY-MM-DD` (master's timezone) → local `Date` at midnight, for formatting only. */
function toLocalDate(date: string): Date {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const startParts = computed(() => getDateTimeInputValue(props.timeBlock.start_at, props.timeZone))
const endParts = computed(() => getDateTimeInputValue(props.timeBlock.end_at, props.timeZone))

const dateLabel = computed(() => {
  const first = formats.dateDay(toLocalDate(startParts.value.date))
  if (!props.timeBlock.all_day) return first
  // An all-day time off ends at the midnight after its last day.
  const lastDay = addDateInputDays(endParts.value.date, -1)
  return lastDay > startParts.value.date
    ? `${first} – ${formats.dateDay(toLocalDate(lastDay))}`
    : first
})

const timeLabel = computed(() => {
  if (props.timeBlock.all_day) return t('timeBlocks.form.allDay')
  const start = formats.time(startParts.value.time, props.timeFormat)
  const end = formats.time(endParts.value.time, props.timeFormat)
  const minutes = Math.round(
    (Date.parse(props.timeBlock.end_at) - Date.parse(props.timeBlock.start_at)) / 60_000,
  )
  return `${start} – ${end} · ${formats.duration(minutes)}`
})

function openEdit() {
  if (props.deleting) return
  editOpen.value = true
}

function close() {
  if (props.deleting) return
  emit('update:isOpen', false)
}

function onDidDismiss() {
  editOpen.value = false
  emit('update:isOpen', false)
  emit('did-dismiss')
}
</script>

<template>
  <ion-modal
    ref="detailsModal"
    :is-open="isOpen"
    class="time-off-details-mobile"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="!deleting"
    @did-dismiss="onDidDismiss"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="deleting"
            :aria-label="t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            size="small"
            fill="clear"
            color="danger"
            :disabled="deleting"
            :aria-label="t('common.delete')"
            @click="emit('delete')"
          >
            <button-spinner v-if="deleting" slot="icon-only" />
            <ion-icon v-else slot="icon-only" :icon="trashOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="time-off-details-mobile__content">
      <main class="time-off-details-mobile__body">
        <header class="time-off-status">
          <ion-badge class="time-off-status__badge" color="medium">
            <ion-icon :icon="banOutline" aria-hidden="true" />
            <span>{{ t('quickCreate.timeOff.title') }}</span>
          </ion-badge>
        </header>

        <inset-list
          class="time-off-group"
          :style="{ '--se-list-inset-x': '0px', '--se-group-gap': '0px' }"
        >
          <ion-item button :detail="true" lines="none" :disabled="deleting" @click="openEdit">
            <ion-icon slot="start" :icon="calendarOutline" aria-hidden="true" />
            <ion-label>
              <h2>{{ dateLabel }}</h2>
              <p>{{ timeLabel }}</p>
            </ion-label>
          </ion-item>
        </inset-list>

        <section>
          <h3 class="section-title">{{ t('quickCreate.timeOff.comment') }}</h3>
          <inset-list
            class="time-off-group"
            :style="{ '--se-list-inset-x': '0px', '--se-group-gap': '0px' }"
          >
            <ion-item button :detail="true" lines="none" :disabled="deleting" @click="openEdit">
              <ion-icon slot="start" :icon="chatbubbleEllipsesOutline" aria-hidden="true" />
              <ion-label class="ion-text-wrap">
                <h2 v-if="timeBlock.notes" class="time-off-group__notes">{{ timeBlock.notes }}</h2>
                <h2 v-else class="time-off-group__empty">
                  {{ t('timeBlocks.preview.noComment') }}
                </h2>
              </ion-label>
            </ion-item>
          </inset-list>
        </section>
      </main>

      <time-off-wizard-mobile
        v-model:is-open="editOpen"
        :time-block="timeBlock"
        :presenting-element="detailsModalEl"
        @saved="emit('saved', $event)"
      />
    </ion-content>

    <ion-footer class="time-off-action-footer ion-no-border">
      <ion-toolbar>
        <div class="time-off-action-footer__content">
          <ion-button
            class="time-off-action-footer__button"
            size="default"
            shape="round"
            :disabled="deleting"
            @click="openEdit"
          >
            <ion-icon
              slot="start"
              :icon="createOutline"
              aria-hidden="true"
              class="ion-padding-end"
            />
            {{ t('timeBlocks.preview.edit') }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.time-off-details-mobile::part(content) {
  background: var(--se-surface-page, var(--ion-background-color));
}

.time-off-details-mobile ion-toolbar {
  --background: transparent;
  --border-width: 0;
}

.time-off-details-mobile__content {
  --background: transparent;
}

.time-off-details-mobile__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 24px;
}

.time-off-status {
  display: flex;
  align-items: flex-start;
  padding: 2px 4px 4px;
}

.time-off-status__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 650;
}

.time-off-status__badge ion-icon {
  font-size: 1rem;
}

.time-off-group ion-item {
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.time-off-group ion-icon[slot='start'] {
  color: var(--ion-text-color);
}

.time-off-group ion-label h2,
.time-off-group ion-label p {
  margin: 0;
}

.time-off-group ion-label h2 {
  font-size: 0.95rem;
  font-weight: 600;
}

.time-off-group ion-label p {
  margin-top: 2px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.time-off-group .time-off-group__notes {
  font-weight: 500;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.time-off-group .time-off-group__empty {
  color: var(--ion-color-medium);
  font-weight: 500;
}

.section-title {
  margin: 4px 0 7px 6px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.time-off-action-footer ion-toolbar {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.time-off-action-footer__content {
  display: flex;
  justify-content: center;
  padding: 6px 16px calc(6px + var(--safe-area-bottom, 0px));
}

.time-off-action-footer__button {
  --border-radius: 999px;
  --padding-start: 18px;
  --padding-end: 18px;

  min-width: 136px;
  margin: 0;
  font-weight: 650;
  text-transform: none;
}
</style>
