<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTitle,
  IonContent,
  IonFooter,
  IonItem,
  IonLabel,
  IonNote,
  IonIcon,
  IonToggle,
  IonSpinner,
  isPlatform,
  toastController,
} from '@ionic/vue'
import {
  informationCircleOutline,
  addOutline,
  copyOutline,
  trashOutline,
  arrowBackOutline,
  arrowUndoOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { useMasterProfileQuery, useUpdateMasterScheduleMutation } from '@entities/master'
import type { MasterScheduleDayKey, ScheduleDayError } from '@entities/master'
import { useWorkingHours } from '@features/working-hours-form/index.mobile'
import { useDirtyForm } from '@shared/lib/forms'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { TimeField } from '@shared/ui/time-field/index.mobile'

// Native Ionic port of the desktop WorkingHoursForm (features/working-hours-form).
// Kept as a single page component — like SettingsProfilePage / SettingsContactsPage
// — because it's a one-off screen driven by a footer "Save" bar. The editing and
// validation logic is the shared useWorkingHours composable (reused verbatim from
// the desktop form); only the UI is rebuilt with native Ionic.
//
// Layout: one inset-grouped card per weekday (toggle + From/To rows + breaks),
// mirroring the iOS-Settings style of the sibling settings pages.
const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterScheduleMutation(userId)

const {
  state,
  dayViews,
  isValid,
  seed,
  setEnabled,
  setStart,
  setEnd,
  setBreak,
  addBreak,
  removeBreak,
  copyDayToAll,
  toStored,
} = useWorkingHours()

const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

watch(
  profileData,
  (profile) => {
    if (!profile || isDirty.value) return
    seed(profile.schedule)
    reset()
  },
  { immediate: true },
)

const canSave = computed(() => isDirty.value && isValid.value)
const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

function dayName(key: MasterScheduleDayKey): string {
  return t(`settings.workingHours.days.${key}`)
}

// Day-level errors carry no break index; break errors do.
function dayLevelErrors(errors: ScheduleDayError[]): ScheduleDayError[] {
  return errors.filter((error) => error.breakIndex === undefined)
}

function errorMessage(error: ScheduleDayError): string {
  return t(`settings.workingHours.errors.${error.code}`)
}

async function showToast(message: string, color: 'success' | 'danger' | 'medium' = 'success') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

function onCopyToAll(key: MasterScheduleDayKey) {
  copyDayToAll(key)
  showToast(t('settings.workingHours.copiedToAll', { day: dayName(key) }), 'success')
}

async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toStored())
    reset()
    await showToast(t('settings.workingHours.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.workingHours.saveError'), 'danger')
  } finally {
    isSaving.value = false
  }
}

function onDiscard() {
  discard()
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/settings"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <ion-title>{{ $t('settings.workingHours.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <!-- Intro hint: styled as a card with a leading info icon -->
      <inset-list>
        <ion-item lines="none" class="hint-item">
          <ion-icon
            slot="start"
            :icon="informationCircleOutline"
            color="primary"
            aria-hidden="true"
          />
          <ion-label class="ion-text-wrap hint-text">
            {{ $t('settings.workingHours.subtitle') }}
          </ion-label>
        </ion-item>
      </inset-list>

      <!-- One card per weekday -->
      <template v-for="view in dayViews" :key="view.key">
        <inset-list>
          <!-- Toggle row: weekday + open/closed switch -->
          <ion-item :lines="view.day.enabled ? 'full' : 'none'">
            <ion-label class="day-name">{{ dayName(view.key) }}</ion-label>
            <ion-note v-if="!view.day.enabled" slot="end" class="day-off">
              {{ $t('settings.workingHours.dayOff') }}
            </ion-note>
            <ion-toggle
              slot="end"
              :checked="view.day.enabled"
              :aria-label="dayName(view.key)"
              @ion-change="setEnabled(view.key, $event.detail.checked)"
            />
          </ion-item>

          <template v-if="view.day.enabled">
            <!-- Main working hours: From / To on one line -->
            <ion-item lines="full">
              <ion-label class="field-label">{{ $t('settings.workingHours.hours') }}</ion-label>
              <div slot="end" class="time-range">
                <time-field
                  :model-value="view.day.start"
                  :max="view.day.end"
                  :aria-label="$t('settings.workingHours.startAria')"
                  @update:model-value="setStart(view.key, $event)"
                />
                <span class="time-range-dash" aria-hidden="true">–</span>
                <time-field
                  :model-value="view.day.end"
                  :min="view.day.start"
                  :aria-label="$t('settings.workingHours.endAria')"
                  @update:model-value="setEnd(view.key, $event)"
                />
              </div>
            </ion-item>

            <!-- Breaks: start/end pair with a trailing delete -->
            <ion-item
              v-for="(brk, index) in view.day.breaks"
              :key="index"
              lines="full"
              class="break-item"
            >
              <ion-label class="field-label">{{ $t('settings.workingHours.break') }}</ion-label>
              <div slot="end" class="time-range">
                <time-field
                  :model-value="brk.start"
                  :min="view.day.start"
                  :max="view.day.end"
                  :aria-label="$t('settings.workingHours.breakStartAria')"
                  @update:model-value="setBreak(view.key, index, 'start', $event)"
                />
                <span class="time-range-dash" aria-hidden="true">–</span>
                <time-field
                  :model-value="brk.end"
                  :min="view.day.start"
                  :max="view.day.end"
                  :aria-label="$t('settings.workingHours.breakEndAria')"
                  @update:model-value="setBreak(view.key, index, 'end', $event)"
                />
                <ion-button
                  fill="clear"
                  color="danger"
                  class="break-remove"
                  :aria-label="$t('settings.workingHours.removeBreak')"
                  @click="removeBreak(view.key, index)"
                >
                  <ion-icon slot="icon-only" :icon="trashOutline" />
                </ion-button>
              </div>
            </ion-item>

            <!-- Add break -->
            <ion-item button :detail="false" lines="none" @click="addBreak(view.key)">
              <ion-icon slot="start" :icon="addOutline" color="primary" aria-hidden="true" />
              <ion-label color="primary" class="action-label">
                {{ $t('settings.workingHours.addBreak') }}
              </ion-label>
            </ion-item>

            <!-- Copy to all — only once the day has unsaved changes -->
            <ion-item
              v-if="view.dirty"
              button
              :detail="false"
              lines="none"
              @click="onCopyToAll(view.key)"
            >
              <ion-icon slot="start" :icon="copyOutline" color="primary" aria-hidden="true" />
              <ion-label color="primary" class="action-label">
                {{ $t('settings.workingHours.copyToAll') }}
              </ion-label>
            </ion-item>
          </template>
        </inset-list>

        <!-- Validation for this day -->
        <ion-note
          v-for="error in dayLevelErrors(view.errors)"
          :key="error.code"
          color="danger"
          class="field-hint"
        >
          {{ errorMessage(error) }}
        </ion-note>
        <ion-note
          v-for="error in view.errors.filter((e) => e.breakIndex !== undefined)"
          :key="`${error.code}-${error.breakIndex}`"
          color="danger"
          class="field-hint"
        >
          {{ errorMessage(error) }}
        </ion-note>
      </template>
    </ion-content>

    <!-- Save bar: slides in only while the form has unsaved changes. Discard on
         the left reverts to the loaded values; Save commits them. -->
    <ion-footer v-if="isDirty" :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start" class="ion-padding-end">
          <ion-button color="medium" :disabled="isSaving" @click="onDiscard">
            <ion-icon slot="icon-only" :ios="arrowUndoOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-button
          class="save-button"
          expand="block"
          :disabled="!canSave || isSaving"
          :aria-busy="isSaving"
          @click="onSave"
        >
          <span :class="{ 'save-button-label--hidden': isSaving }">
            {{ $t('common.saveChanges') }}
          </span>
          <ion-spinner v-if="isSaving" class="save-button-spinner" :name="saveSpinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

/* Intro hint card: muted body text next to a primary-colored info icon. */
.hint-item {
  --padding-top: 6px;
  --padding-bottom: 6px;
}

.hint-item ion-icon[slot='start'] {
  color: var(--ion-color-primary);
  font-size: 22px;
}

.hint-text {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.35;
}

/* Weekday name on the toggle row. */
.day-name {
  font-weight: 600;
  color: var(--ion-text-color);
}

.day-off {
  align-self: center;
  margin-inline-end: 12px;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

/* iOS Settings-style rows: label on the left, value right-aligned. Shared with
   the sibling settings pages. */
.field-label {
  flex: 0 0 auto;
  margin-inline-end: 12px;
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  white-space: nowrap;
}

.action-label {
  font-size: 0.95rem;
}

/* A start–end time pair on one line — shared by the main hours row and the
   break rows (which add a trailing delete button). */
.time-range {
  display: flex;
  align-items: center;
  gap: 2px;
}

.time-range-dash {
  color: var(--ion-color-medium);
}

.break-remove {
  margin: 0;
  --padding-start: 6px;
  --padding-end: 6px;
}

.break-remove ion-icon {
  font-size: 18px;
}

.field-hint {
  display: block;
  margin-top: -14px;
  margin-bottom: 22px;
  padding-inline: 32px;
  font-size: 0.75rem;
}

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.save-button {
  position: relative;
}

.save-button-label--hidden {
  opacity: 0;
}

.save-button-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
