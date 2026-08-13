<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { OptionsList, type OptionsListItem } from '@shared/ui'
import type { QuickCreateChoice, QuickCreatePresentation } from '../model/types'

const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{ presentation?: QuickCreatePresentation }>(), {
  presentation: 'modal',
})

// Resolves (via `useOverlay` result) with the chosen action, or `undefined`
// when the menu is dismissed without a choice.
const emit = defineEmits<{
  close: [choice?: QuickCreateChoice]
  'after:leave': []
}>()

const actions = computed<OptionsListItem[]>(() => [
  {
    id: 'appointment',
    icon: 'i-lucide-calendar-plus',
    iconColor: 'text-primary dark:text-white',
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
  <UDrawer
    v-if="presentation === 'drawer'"
    v-model:open="open"
    :ui="{
      content: 'rounded-t-2xl',
      body: 'pb-[calc(0.5rem+var(--safe-area-bottom))]',
    }"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <OptionsList :items="actions" @select="onSelect" />
    </template>
  </UDrawer>

  <UModal
    v-else
    v-model:open="open"
    :close="false"
    :ui="{
      content:
        'data-[state=open]:animate-[slide-in-from-bottom_200ms_ease-out] data-[state=closed]:animate-[slide-out-to-bottom_200ms_ease-in]',
    }"
    @after:leave="emit('after:leave')"
  >
    <template #body>
      <OptionsList :items="actions" @select="onSelect" />
    </template>
  </UModal>
</template>
