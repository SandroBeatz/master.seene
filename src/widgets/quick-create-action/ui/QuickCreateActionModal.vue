<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OptionsList, type OptionsListItem } from '@shared/ui'
import type { QuickCreateChoice } from '../model/types'

const { t } = useI18n()

// Resolves (via `useOverlay` result) with the chosen action, or `undefined`
// when the menu is dismissed without a choice.
const emit = defineEmits<{ close: [choice?: QuickCreateChoice] }>()

const actions = computed<OptionsListItem[]>(() => [
  {
    id: 'appointment',
    icon: 'i-lucide-calendar-plus',
    iconColor: 'primary',
    label: t('quickCreate.menu.appointment'),
    description: t('quickCreate.menu.appointmentDescription'),
  },
  {
    id: 'timeOff',
    icon: 'i-lucide-ban',
    label: t('quickCreate.menu.timeOff'),
    description: t('quickCreate.menu.timeOffDescription'),
  },
])

function onSelect(item: OptionsListItem) {
  emit('close', item.id as QuickCreateChoice)
}
</script>

<template>
  <UModal
    :close="false"
    :ui="{
      content:
        'data-[state=open]:animate-[slide-in-from-bottom_200ms_ease-out] data-[state=closed]:animate-[slide-out-to-bottom_200ms_ease-in]',
    }"
  >
    <template #body>
      <OptionsList :items="actions" @select="onSelect" />
    </template>
  </UModal>
</template>
