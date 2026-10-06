<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonIcon, IonItem, IonLabel, IonPopover } from '@ionic/vue'
import {
  calendarClearOutline,
  calendarNumberOutline,
  checkmark,
  gridOutline,
  todayOutline,
} from 'ionicons/icons'
import { hapticImpact } from '@shared/lib/native'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { CalendarViewType } from '../model/calendar-controls'

// "Вид" header button: a compact popover listing month / week / day with a
// checkmark on the active one. Emits the pick; the page switches the calendar.
defineProps<{ view: CalendarViewType }>()

const emit = defineEmits<{ select: [view: CalendarViewType] }>()

const { t } = useI18n()
const isOpen = ref(false)
const trigger = ref<Event | undefined>(undefined)

const OPTIONS: readonly { view: CalendarViewType; labelKey: string; icon: string }[] = [
  { view: 'dayGridMonth', labelKey: 'calendar.views.month', icon: gridOutline },
  { view: 'timeGridWeek', labelKey: 'calendar.views.week', icon: calendarNumberOutline },
  { view: 'timeGridDay', labelKey: 'calendar.views.day', icon: todayOutline },
]

function open(event: Event) {
  trigger.value = event
  isOpen.value = true
}

function choose(view: CalendarViewType) {
  isOpen.value = false
  hapticImpact()
  emit('select', view)
}
</script>

<template>
  <ion-button
    class="view-menu__trigger"
    fill="clear"
    :aria-label="t('calendar.mobile.view')"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    @click="open"
  >
    <ion-icon slot="start" :icon="calendarClearOutline" aria-hidden="true" />
    {{ t('calendar.mobile.view') }}
  </ion-button>

  <ion-popover
    class="view-menu"
    :is-open="isOpen"
    :event="trigger"
    side="bottom"
    alignment="end"
    @did-dismiss="isOpen = false"
  >
    <inset-list full-width role="menu">
      <ion-item
        v-for="option in OPTIONS"
        :key="option.view"
        button
        :detail="false"
        role="menuitemradio"
        :aria-checked="option.view === view"
        @click="choose(option.view)"
      >
        <ion-icon slot="start" :icon="option.icon" color="medium" aria-hidden="true" />
        <ion-label>{{ t(option.labelKey) }}</ion-label>
        <ion-icon
          v-if="option.view === view"
          slot="end"
          :icon="checkmark"
          color="primary"
          aria-hidden="true"
        />
      </ion-item>
    </inset-list>
  </ion-popover>
</template>

<style scoped>
.view-menu__trigger {
  --color: var(--ion-text-color);
  --padding-start: 6px;
  --padding-end: 6px;
  --border-radius: 999px;

  height: 32px;
  margin: 0;
  font-size: 0.84rem;
  font-weight: 600;
  text-transform: none;
}

.view-menu__trigger ion-icon {
  margin-inline-end: 5px;
  font-size: 17px;
}

.view-menu {
  --width: 200px;
  --background: var(--se-surface-card, var(--ion-card-background, #fff));
  --box-shadow: 0 10px 32px rgb(0 0 0 / 24%);
}

.view-menu ion-item {
  font-size: 0.92rem;
}
</style>
