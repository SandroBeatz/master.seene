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
  IonCheckbox,
  IonSkeletonText,
  IonSpinner,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { arrowBackOutline, arrowUndoOutline, informationCircleOutline } from 'ionicons/icons'
import {
  CLIENT_REMINDER_OFFSET_VALUES,
  useMasterPreferencesQuery,
  useUpdateMasterNotificationSettingsMutation,
} from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useNotificationSettings } from '@features/notification-settings-form/index.mobile'
import { useDirtyForm } from '@shared/lib/forms'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateMutation = useUpdateMasterNotificationSettingsMutation(userId)
const { state, seed, toUpdate, toggleOffset } = useNotificationSettings()
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

const reminderOffsetItems = computed(() => {
  const labels: Record<number, string> = {
    1440: t('settings.notifications.remind24h'),
    120: t('settings.notifications.remind2h'),
    60: t('settings.notifications.remind1h'),
  }

  return CLIENT_REMINDER_OFFSET_VALUES.map((value) => ({
    value,
    label: labels[value] ?? String(value),
  }))
})

const UPCOMING_OFFSET_OPTIONS = [
  { value: 30, key: 'notice30m' },
  { value: 60, key: 'notice1h' },
  { value: 120, key: 'notice2h' },
  { value: 240, key: 'notice4h' },
  { value: 720, key: 'notice12h' },
  { value: 1440, key: 'notice1d' },
] as const

const upcomingOffsetItems = computed(() =>
  UPCOMING_OFFSET_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`settings.booking.${option.key}`),
  })),
)
const currentUpcomingOffsetLabel = computed(
  () =>
    upcomingOffsetItems.value.find((item) => item.value === state.value.alertUpcomingOffsetMinutes)
      ?.label ?? '',
)

const isUpcomingOffsetModalOpen = ref(false)
const presentingElement = ref<HTMLElement | null>(null)

onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function onUpcomingOffsetSelected(value: string | number) {
  const minutes = Number(value)
  if (UPCOMING_OFFSET_OPTIONS.some((option) => option.value === minutes)) {
    state.value.alertUpcomingOffsetMinutes = minutes
  }
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

async function onSave() {
  if (!isDirty.value) return

  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toUpdate())
    reset()
    await showToast(t('settings.notifications.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.notifications.saveError'), 'danger')
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
        <ion-title>{{ $t('settings.notifications.title') }}</ion-title>
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
            {{ $t('settings.notifications.subtitle') }}
          </ion-label>
        </ion-item>
      </inset-list>

      <template v-if="isPending">
        <inset-list>
          <ion-item v-for="item in 4" :key="item" :lines="item === 4 ? 'none' : 'full'">
            <ion-label>
              <ion-skeleton-text animated class="skeleton-title" />
              <ion-skeleton-text animated class="skeleton-description" />
            </ion-label>
            <ion-skeleton-text slot="end" animated class="skeleton-toggle" />
          </ion-item>
        </inset-list>
      </template>

      <template v-else>
        <inset-list :header="$t('settings.notifications.sectionClientReminders')">
          <ion-item>
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.notifications.whatsappTitle') }}</h2>
              <p>{{ $t('settings.notifications.whatsappDescription') }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              v-model="state.clientWhatsappEnabled"
              :aria-label="$t('settings.notifications.whatsappTitle')"
            />
          </ion-item>

          <ion-item lines="none" :disabled="!state.clientWhatsappEnabled">
            <div class="offsets-block">
              <ion-label class="offsets-title">
                {{ $t('settings.notifications.whenToRemind') }}
              </ion-label>
              <ion-checkbox
                v-for="item in reminderOffsetItems"
                :key="item.value"
                label-placement="end"
                justify="start"
                :checked="state.clientReminderOffsets.includes(item.value)"
                :disabled="!state.clientWhatsappEnabled"
                @ion-change="toggleOffset(item.value, $event.detail.checked)"
              >
                {{ item.label }}
              </ion-checkbox>
            </div>
          </ion-item>
        </inset-list>

        <inset-list :header="$t('settings.notifications.sectionYourAlerts')">
          <ion-item>
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.notifications.alertNewBookingTitle') }}</h2>
              <p>{{ $t('settings.notifications.alertNewBookingDescription') }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              v-model="state.alertNewBooking"
              :aria-label="$t('settings.notifications.alertNewBookingTitle')"
            />
          </ion-item>

          <ion-item>
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.notifications.alertAwaitingTitle') }}</h2>
              <p>{{ $t('settings.notifications.alertAwaitingDescription') }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              v-model="state.alertAwaitingConfirmation"
              :aria-label="$t('settings.notifications.alertAwaitingTitle')"
            />
          </ion-item>

          <ion-item>
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.notifications.alertCancellationTitle') }}</h2>
              <p>{{ $t('settings.notifications.alertCancellationDescription') }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              v-model="state.alertCancellation"
              :aria-label="$t('settings.notifications.alertCancellationTitle')"
            />
          </ion-item>

          <ion-item>
            <ion-label class="ion-text-wrap setting-copy">
              <h2>{{ $t('settings.notifications.alertUpcomingTitle') }}</h2>
              <p>{{ $t('settings.notifications.alertUpcomingDescription') }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              v-model="state.alertUpcomingEnabled"
              :aria-label="$t('settings.notifications.alertUpcomingTitle')"
            />
          </ion-item>

          <ion-item
            button
            detail
            lines="none"
            :disabled="!state.alertUpcomingEnabled"
            @click="isUpcomingOffsetModalOpen = true"
          >
            <ion-label>{{ $t('settings.notifications.whenToRemind') }}</ion-label>
            <ion-label slot="end" class="value-static">
              {{ currentUpcomingOffsetLabel }}
            </ion-label>
          </ion-item>
        </inset-list>

        <list-picker-modal
          v-model:is-open="isUpcomingOffsetModalOpen"
          :title="$t('settings.notifications.alertUpcomingTitle')"
          :items="upcomingOffsetItems"
          :model-value="state.alertUpcomingOffsetMinutes"
          :presenting-element="presentingElement"
          @update:model-value="onUpcomingOffsetSelected"
        />
      </template>
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
          :disabled="isSaving"
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

.offsets-block {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 14px 0 16px;
  gap: 14px;
}

.offsets-title {
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.offsets-block ion-checkbox {
  --size: 20px;
  font-size: 0.9rem;
}

.value-static {
  flex: 0 0 auto;
  max-width: 44%;
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

.skeleton-toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
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
