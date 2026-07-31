<script setup lang="ts">
import { type OptionsDrawerItem, type OptionsDrawerProps } from './types'
import { OptionsList } from '../options-list'

const props = withDefaults(defineProps<OptionsDrawerProps>(), {
  closeOnSelect: true,
})

const emit = defineEmits<{
  /** An `action` row was activated. */
  select: [item: OptionsDrawerItem]
  /** A `switch` row was flipped; `checked` is the new state. */
  toggle: [item: OptionsDrawerItem, checked: boolean]
}>()

const open = defineModel<boolean>('open', { default: false })

function onSelect(item: OptionsDrawerItem) {
  emit('select', item)
  maybeClose(item)
}

function onToggle(item: OptionsDrawerItem, checked: boolean) {
  emit('toggle', item, checked)
  maybeClose(item)
}

// Per-row `closeOnSelect` overrides the drawer-level default when present.
function maybeClose(item: OptionsDrawerItem) {
  if (item.closeOnSelect ?? props.closeOnSelect) {
    open.value = false
  }
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="title"
    :ui="{
      content: 'rounded-t-2xl',
      body: 'pb-[calc(0.5rem+var(--safe-area-bottom))]',
    }"
  >
    <template #body>
      <OptionsList :items="items" @select="onSelect" @toggle="onToggle" />
    </template>
  </UDrawer>
</template>
