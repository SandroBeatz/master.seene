<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  actionSheetController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonToolbar,
  onIonViewDidEnter,
  onIonViewWillEnter,
  onIonViewWillLeave,
  toastController,
} from '@ionic/vue'
import { add, chevronBack, chevronDown } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useRemoveTimeBlockMutation, type TimeBlock } from '@entities/time-block'
import type { MobileAppointmentQuickAction } from '@features/appointment-actions/index.mobile'
import { AppointmentPreviewHostMobile } from '@widgets/appointment-preview-panel/index.mobile'
import {
  CalendarJumpSheetMobile,
  CalendarMobile,
  CalendarViewMenuMobile,
  formatMobileCalendarTitle,
  isCurrentCalendarPeriod,
  readStoredMobileCalendarView,
  storeMobileCalendarView,
  type CalendarDateRange,
  type CalendarViewType,
} from '@widgets/calendar/index.mobile'
import { QuickCreateMobile } from '@widgets/quick-create-action/index.mobile'
import { hapticImpact } from '@shared/lib/native'
import { useNowMinute } from '@shared/lib/now'
import { getDateTimeInputValue } from '@shared/lib/time-zone'

interface DrillOrigin {
  view: CalendarViewType
  /** First visible day of the view we drilled from (`YYYY-MM-DD`). */
  date: string
  /** Back button label — the title of that view («Октябрь»). */
  label: string
}

const { t, locale } = useI18n()
const masterStore = useMasterPreferencesStore()
const sessionStore = useSessionStore()
const removeTimeBlockMutation = useRemoveTimeBlockMutation(
  computed(() => sessionStore.session?.user.id ?? ''),
)
const now = useNowMinute()
const calendar = useTemplateRef('calendar')
const preview = useTemplateRef('preview')
const quickCreate = useTemplateRef('quickCreate')

const initialView = readStoredMobileCalendarView()
const range = ref<CalendarDateRange>()
const drillOrigin = ref<DrillOrigin | null>(null)
const isJumpOpen = ref(false)

const view = computed(() => range.value?.viewType ?? initialView)
const header = computed(() =>
  formatMobileCalendarTitle(range.value, locale.value, masterStore.timeZone),
)
const anchorDate = computed(() =>
  range.value
    ? getDateTimeInputValue(range.value.currentFrom, masterStore.timeZone).date
    : getDateTimeInputValue(now.value, masterStore.timeZone).date,
)
const showToday = computed(
  () => !isCurrentCalendarPeriod(range.value, masterStore.timeZone, now.value),
)

function onRangeChange(next: CalendarDateRange) {
  range.value = next
}

function changeView(next: CalendarViewType) {
  if (next === view.value && !drillOrigin.value) return
  drillOrigin.value = null
  storeMobileCalendarView(next)
  calendar.value?.show(next)
}

/** Month cell / week day header → that day, with a way back. */
function openDay(date: string) {
  hapticImpact()
  drillOrigin.value = { view: view.value, date: anchorDate.value, label: header.value.title }
  calendar.value?.show('timeGridDay', date, 'zoom-in')
}

function goBack() {
  const origin = drillOrigin.value
  if (!origin) return
  drillOrigin.value = null
  calendar.value?.show(origin.view, origin.date, 'zoom-out')
}

function goToday() {
  hapticImpact()
  calendar.value?.today()
}

function jumpTo(date: string) {
  calendar.value?.show(view.value, date)
}

function handleQuickAction(appointment: Appointment, action: MobileAppointmentQuickAction) {
  if (action === 'details') void preview.value?.openDetails(appointment)
  else if (action === 'reschedule') void preview.value?.openReschedule(appointment)
  else if (action === 'edit') void preview.value?.openEdit(appointment)
  else void preview.value?.remove(appointment)
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2200, color, position: 'top' })
  await toast.present()
}

// A failed load keeps whatever is cached on screen and offers a retry.
watch(
  () => calendar.value?.error,
  async (error) => {
    if (!error) return
    const toast = await toastController.create({
      message: t('calendar.mobile.loadError'),
      duration: 4000,
      color: 'danger',
      position: 'top',
      buttons: [
        { text: t('calendar.mobile.retry'), handler: () => void calendar.value?.refetch() },
      ],
    })
    await toast.present()
  },
)

// Time off has no detail screen on mobile: a tap offers to remove it.
async function onTimeBlockSelect(timeBlock: TimeBlock) {
  hapticImpact()
  const sheet = await actionSheetController.create({
    header: timeBlock.notes || t('timeBlocks.calendarTitle'),
    buttons: [
      { text: t('timeBlocks.form.delete'), role: 'destructive' },
      { text: t('common.cancel'), role: 'cancel' },
    ],
  })
  await sheet.present()
  const { role } = await sheet.onDidDismiss()
  if (role !== 'destructive') return

  try {
    await removeTimeBlockMutation.mutateAsync(timeBlock.id)
    await showToast(t('timeBlocks.form.successDelete'), 'success')
  } catch {
    await showToast(t('timeBlocks.form.errorDelete'), 'danger')
  }
}

// Coming back to the tab refreshes the period: bookings may have arrived
// online or been changed on another device meanwhile.
let hasEntered = false
onIonViewWillEnter(() => {
  if (hasEntered) void calendar.value?.refetch()
  hasEntered = true
})

// Android hardware back returns from a drilled-in day before leaving the tab
// (priority 10: above router navigation, below open overlays).
function onHardwareBack(event: Event) {
  if (!drillOrigin.value) return
  const { register } = (event as CustomEvent<{ register: (p: number, h: () => void) => void }>)
    .detail
  register(10, goBack)
}

onIonViewDidEnter(() => document.addEventListener('ionBackButton', onHardwareBack))
onIonViewWillLeave(() => document.removeEventListener('ionBackButton', onHardwareBack))
</script>

<template>
  <ion-page>
    <ion-header class="calendar-header ion-no-border">
      <ion-toolbar>
        <div class="calendar-header__bar">
          <div class="calendar-header__heading">
            <button v-if="drillOrigin" type="button" class="calendar-header__back" @click="goBack">
              <ion-icon :icon="chevronBack" aria-hidden="true" />
              <span>{{ drillOrigin.label }}</span>
            </button>
            <transition v-else name="calendar-title" mode="out-in">
              <span :key="header.caption" class="calendar-header__caption">
                {{ header.caption }}
              </span>
            </transition>

            <button
              type="button"
              class="calendar-header__title"
              :aria-label="t('calendar.mobile.jumpTo')"
              @click="isJumpOpen = true"
            >
              <transition name="calendar-title" mode="out-in">
                <h1 :key="header.title">{{ header.title }}</h1>
              </transition>
              <ion-icon :icon="chevronDown" aria-hidden="true" />
            </button>
          </div>

          <div class="calendar-header__actions">
            <ion-button
              v-if="showToday"
              class="calendar-header__today"
              fill="clear"
              @click="goToday"
            >
              {{ t('calendar.controls.today') }}
            </ion-button>
            <calendar-view-menu-mobile :view="view" @select="changeView" />
          </div>
        </div>
      </ion-toolbar>
      <ion-progress-bar
        class="calendar-header__progress"
        :class="{ 'calendar-header__progress--active': calendar?.isLoading }"
        type="indeterminate"
      />
    </ion-header>

    <ion-content :scroll-y="false" class="calendar-content">
      <calendar-mobile
        ref="calendar"
        :initial-view="initialView"
        @range-change="onRangeChange"
        @day-select="openDay"
        @appointment-select="preview?.openDetails($event)"
        @appointment-action="handleQuickAction"
        @time-block-select="onTimeBlockSelect"
        @slot-hold="quickCreate?.openAppointment({ startAt: $event })"
      />

      <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="calendar-fab">
        <ion-fab-button :aria-label="t('quickCreate.menu.title')" @click="quickCreate?.openMenu()">
          <ion-icon :icon="add" aria-hidden="true" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <calendar-jump-sheet-mobile
      v-model:is-open="isJumpOpen"
      :date="anchorDate"
      :first-day-of-week="masterStore.calendarFirstDay"
      @select="jumpTo"
    />
    <appointment-preview-host-mobile ref="preview" />
    <quick-create-mobile ref="quickCreate" />
  </ion-page>
</template>

<style scoped>
.calendar-header ion-toolbar {
  --background: var(--se-surface-card);
  --min-height: 52px;
  --padding-start: max(16px, var(--safe-area-left, 0px));
  --padding-end: max(10px, var(--safe-area-right, 0px));
  --padding-top: 4px;
  --padding-bottom: 6px;
  --border-width: 0;
}

.calendar-header__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.calendar-header__heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.calendar-header__caption,
.calendar-header__back {
  height: 17px;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 17px;
}

.calendar-header__back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-inline-start: -6px;
  padding: 0 6px 0 2px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ion-color-primary);
  animation: calendar-header-fade-in 220ms ease;
}

.calendar-header__back ion-icon {
  font-size: 16px;
}

.calendar-header__title {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-text-color);
}

.calendar-header__title h1 {
  overflow: hidden;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.015em;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-header__title ion-icon {
  flex: 0 0 auto;
  color: var(--ion-color-medium);
  font-size: 14px;
}

.calendar-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding-bottom: 2px;
}

.calendar-header__today {
  --color: var(--ion-color-primary);
  --padding-start: 8px;
  --padding-end: 8px;

  height: 32px;
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: none;
  animation: calendar-header-fade-in 220ms ease;
}

.calendar-fab {
  margin: 0 4px 4px 0;
}

.calendar-header__progress {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 2px;
  opacity: 0;
  transition: opacity 200ms ease;
}

.calendar-header__progress--active {
  opacity: 1;
}

.calendar-content {
  --background: var(--se-surface-card);
}

.calendar-title-enter-active,
.calendar-title-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.calendar-title-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.calendar-title-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes calendar-header-fade-in {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-header__back,
  .calendar-header__today {
    animation: none;
  }

  .calendar-title-enter-active,
  .calendar-title-leave-active {
    transition: none;
  }
}
</style>
