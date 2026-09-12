<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
  IonIcon,
  IonToggle,
  IonSkeletonText,
  IonSpinner,
  isPlatform,
  toastController,
} from '@ionic/vue'
import {
  arrowBackOutline,
  arrowUndoOutline,
  calendarNumberOutline,
  informationCircleOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { useMasterPreferencesQuery, useUpdateMasterBookingSettingsMutation } from '@entities/master'
import type { BookingDefaultStatus } from '@entities/master'
import { useBookingSettings } from '@features/booking-settings-form/index.mobile'
import { useDirtyForm } from '@shared/lib/forms'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

// Native Ionic port of BookingSettingsForm. The editable state mapper and data
// layer are shared with desktop; only the presentation is rebuilt using the
// same inset-list, picker-modal and dirty footer patterns as Profile/Contacts.
const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateMutation = useUpdateMasterBookingSettingsMutation(userId)
const { state, onlineEnabled, seed, toUpdate, toOnlineUpdate } = useBookingSettings()
const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

watch(
  preferences,
  (prefs) => {
    if (!prefs || isDirty.value) return
    seed(prefs)
    reset()
  },
  { immediate: true },
)

const BUFFER_VALUES = [0, 5, 10, 15, 20, 30, 45, 60] as const
const bufferItems = computed(() =>
  BUFFER_VALUES.map((value) => ({
    value,
    label:
      value === 0
        ? t('settings.booking.bufferNone')
        : t('settings.booking.minutesShort', { count: value }),
  })),
)

const NOTICE_OPTIONS = [
  { value: 0, key: 'noticeNone' },
  { value: 30, key: 'notice30m' },
  { value: 60, key: 'notice1h' },
  { value: 120, key: 'notice2h' },
  { value: 240, key: 'notice4h' },
  { value: 720, key: 'notice12h' },
  { value: 1440, key: 'notice1d' },
  { value: 2880, key: 'notice2d' },
] as const
const noticeItems = computed(() =>
  NOTICE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`settings.booking.${option.key}`),
  })),
)

const statusItems = computed(() => [
  { value: 'confirmed', label: t('settings.booking.statusAutoConfirmed') },
  { value: 'pending', label: t('settings.booking.statusNeedsConfirmation') },
])

const enabled = computed(() => onlineEnabled.value)
const currentStatusLabel = computed(
  () => statusItems.value.find((item) => item.value === state.value.defaultStatus)?.label ?? '',
)
const currentBufferLabel = computed(
  () => bufferItems.value.find((item) => item.value === state.value.bufferMinutes)?.label ?? '',
)
const currentNoticeLabel = computed(
  () => noticeItems.value.find((item) => item.value === state.value.minNoticeMinutes)?.label ?? '',
)

const isStatusModalOpen = ref(false)
const isBufferModalOpen = ref(false)
const isNoticeModalOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function onStatusSelected(value: string | number) {
  if (value === 'confirmed' || value === 'pending') {
    state.value.defaultStatus = value as BookingDefaultStatus
  }
}

function onBufferSelected(value: string | number) {
  const minutes = Number(value)
  if (BUFFER_VALUES.includes(minutes as (typeof BUFFER_VALUES)[number])) {
    state.value.bufferMinutes = minutes
  }
}

function onNoticeSelected(value: string | number) {
  const minutes = Number(value)
  if (NOTICE_OPTIONS.some((option) => option.value === minutes)) {
    state.value.minNoticeMinutes = minutes
  }
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

const isTogglingOnline = ref(false)

async function onToggleOnline(value: boolean) {
  if (!preferences.value || isTogglingOnline.value) return

  const previous = onlineEnabled.value
  onlineEnabled.value = value
  isTogglingOnline.value = true

  try {
    await updateMutation.mutateAsync(toOnlineUpdate(preferences.value, value))
    await showToast(t('settings.booking.saveSuccess'), 'success')
  } catch {
    onlineEnabled.value = previous
    await showToast(t('settings.booking.saveError'), 'danger')
  } finally {
    isTogglingOnline.value = false
  }
}

const canSave = computed(() => isDirty.value)
const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

async function onSave() {
  if (!canSave.value) return

  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toUpdate())
    reset()
    await showToast(t('settings.booking.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.booking.saveError'), 'danger')
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
        <ion-title>{{ $t('settings.booking.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <inset-list>
        <ion-item lines="none" class="hint-item">
          <ion-icon
            slot="start"
            :icon="informationCircleOutline"
            color="primary"
            aria-hidden="true"
          />
          <ion-label class="ion-text-wrap hint-text">
            {{ $t('settings.booking.subtitle') }}
          </ion-label>
        </ion-item>
      </inset-list>

      <inset-list>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="calendarNumberOutline" color="primary" />
          <ion-label class="ion-text-wrap setting-copy">
            <h2>
              {{ enabled ? $t('settings.booking.onlineOn') : $t('settings.booking.onlineOff') }}
            </h2>
          </ion-label>
          <div slot="end" class="toggle-control">
            <ion-spinner v-if="isTogglingOnline" :name="saveSpinnerName" />
            <ion-toggle
              :checked="onlineEnabled"
              :disabled="isPending || isTogglingOnline"
              :aria-label="$t('settings.booking.onlineToggleAria')"
              @ion-change="onToggleOnline($event.detail.checked)"
            />
          </div>
        </ion-item>
      </inset-list>

      <inset-list>
        <template v-if="isPending">
          <ion-item v-for="item in 3" :key="item" :lines="item === 3 ? 'none' : 'full'">
            <ion-label>
              <ion-skeleton-text animated class="skeleton-title" />
              <ion-skeleton-text animated class="skeleton-description" />
            </ion-label>
            <ion-skeleton-text slot="end" animated class="skeleton-value" />
          </ion-item>
        </template>

        <template v-else>
          <ion-item button detail :disabled="!enabled" @click="isStatusModalOpen = true">
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.booking.defaultStatus') }}</h2>
              <p>{{ $t('settings.booking.defaultStatusDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="value-static">{{ currentStatusLabel }}</ion-label>
          </ion-item>

          <ion-item button detail :disabled="!enabled" @click="isBufferModalOpen = true">
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.booking.buffer') }}</h2>
              <p>{{ $t('settings.booking.bufferDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="value-static">{{ currentBufferLabel }}</ion-label>
          </ion-item>

          <ion-item
            button
            detail
            lines="none"
            :disabled="!enabled"
            @click="isNoticeModalOpen = true"
          >
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.booking.minNotice') }}</h2>
              <p>{{ $t('settings.booking.minNoticeDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="value-static">{{ currentNoticeLabel }}</ion-label>
          </ion-item>
        </template>
      </inset-list>

      <list-picker-modal
        v-model:is-open="isStatusModalOpen"
        :title="$t('settings.booking.defaultStatus')"
        :items="statusItems"
        :model-value="state.defaultStatus"
        :presenting-element="presentingElement"
        @update:model-value="onStatusSelected"
      />
      <list-picker-modal
        v-model:is-open="isBufferModalOpen"
        :title="$t('settings.booking.buffer')"
        :items="bufferItems"
        :model-value="state.bufferMinutes"
        :presenting-element="presentingElement"
        @update:model-value="onBufferSelected"
      />
      <list-picker-modal
        v-model:is-open="isNoticeModalOpen"
        :title="$t('settings.booking.minNotice')"
        :items="noticeItems"
        :model-value="state.minNoticeMinutes"
        :presenting-element="presentingElement"
        @update:model-value="onNoticeSelected"
      />
    </ion-content>

    <ion-footer v-if="isDirty" :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start" class="ion-padding-end">
          <ion-button color="medium" :disabled="isSaving" @click="onDiscard">
            <ion-icon slot="icon-only" :ios="arrowUndoOutline" />
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

.hint-item {
  --padding-top: 6px;
  --padding-bottom: 6px;
}

.hint-item ion-icon[slot='start'] {
  font-size: 22px;
}

.hint-text {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.35;
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-control ion-spinner {
  width: 20px;
  height: 20px;
}

.setting-copy {
  min-width: 0;
  padding-top: 9px;
  padding-bottom: 9px;
}

.setting-copy h2 {
  color: var(--ion-text-color);
  font-size: 0.95rem;
  font-weight: 600;
}

.setting-copy p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  line-height: 1.3;
  white-space: normal;
}

.value-static {
  flex: 0 0 auto;
  max-width: 38%;
  color: var(--ion-color-medium);
  font-size: 0.86rem;
  text-align: end;
  white-space: normal;
}

.skeleton-title {
  width: 58%;
  height: 14px;
}

.skeleton-description {
  width: 76%;
  height: 11px;
  margin-top: 7px;
}

.skeleton-value {
  width: 76px;
  height: 14px;
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
