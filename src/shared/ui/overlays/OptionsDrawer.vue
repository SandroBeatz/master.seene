<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { optionsDrawerIconClass, type OptionsDrawerItem, type OptionsDrawerProps } from './types'
import { Typography } from '@shared/ui'

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

// The NavigationMenu only needs a label + an onSelect handler; every other visual
// bit (icon colour, description, trailing switch) is rendered through the slots
// below, which read back the original option by index.
const menuItems = computed<NavigationMenuItem[]>(() =>
  props.items.map((item) => ({
    label: item.label,
    disabled: item.disabled,
    onSelect: () => onRowSelect(item),
  })),
)

function onRowSelect(item: OptionsDrawerItem) {
  if (item.disabled) return

  if (item.type === 'switch') {
    emit('toggle', item, !item.checked)
  } else {
    emit('select', item)
  }

  // A trailing switch reflects state the caller owns; tapping the row is the only
  // interaction (the switch itself is pointer-events-none), so there is no double fire.
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
      <UNavigationMenu
        orientation="vertical"
        :items="menuItems"
        class="w-full"
        :ui="{ link: 'py-3' }"
      >
        <template #item-leading="{ index }">
          <UIcon
            v-if="items[index]?.icon"
            :name="items[index]!.icon!"
            class="size-5 shrink-0"
            :class="optionsDrawerIconClass(items[index]!.iconColor)"
          />
        </template>

        <template #item-label="{ index }">
          <div class="text-left pl-2">
            <Typography class="font-medium text-default">{{ items[index]!.label }}</Typography>
            <Typography variant="footnote" class="text-muted">{{
              items[index]!.description
            }}</Typography>
          </div>
        </template>

        <template #item-trailing="{ index }">
          <USwitch
            v-if="items[index]?.type === 'switch'"
            :model-value="items[index]!.checked"
            class="pointer-events-none"
            tabindex="-1"
            aria-hidden="true"
          />
          <UIcon v-else name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed" />
        </template>
      </UNavigationMenu>
    </template>
  </UDrawer>
</template>
