<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { optionsListIconClass, type OptionsListItem, type OptionsListProps } from './types'
import { Typography } from '@shared/ui'

const props = defineProps<OptionsListProps>()

const emit = defineEmits<{
  /** An `action` row was activated. */
  select: [item: OptionsListItem]
  /** A `switch` row was flipped; `checked` is the new state. */
  toggle: [item: OptionsListItem, checked: boolean]
}>()

// The NavigationMenu only needs a label + an onSelect handler; every other visual
// bit (icon colour, description, trailing switch) is rendered through the slots
// below, which read back the original option by index.
const menuItems = computed<NavigationMenuItem[]>(() =>
  props.items.map((item) => ({
    label: item.label,
    disabled: item.disabled,
    active: item.active,
    onSelect: () => onRowSelect(item),
  })),
)

function onRowSelect(item: OptionsListItem) {
  if (item.disabled) return

  if (item.type === 'switch') {
    // A trailing switch reflects state the caller owns; tapping the row is the only
    // interaction (the switch itself is pointer-events-none), so there is no double fire.
    emit('toggle', item, !item.checked)
  } else {
    emit('select', item)
  }
}
</script>

<template>
  <UNavigationMenu
    orientation="vertical"
    :items="menuItems"
    class="w-full"
    :ui="{ item: 'py-1', link: 'bg-elevated py-2 rounded-md' }"
  >
    <template #item-leading="{ index }">
      <UIcon
        v-if="items[index]?.icon"
        :name="items[index]!.icon!"
        class="size-5 shrink-0"
        :class="optionsListIconClass(items[index]!.iconColor)"
      />
    </template>

    <template #item-label="{ index }">
      <div class="text-left pl-2">
        <Typography
          class="font-medium"
          :class="items[index]?.active ? 'text-primary' : 'text-default'"
          >{{ items[index]!.label }}</Typography
        >
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
      <!-- Selection rows (`active` set) show a check when chosen; navigation rows show a chevron. -->
      <UIcon
        v-else-if="items[index]?.active"
        name="i-lucide-check"
        class="size-5 shrink-0 text-primary"
      />
      <UIcon
        v-else-if="items[index]?.active === undefined"
        name="i-lucide-chevron-right"
        class="size-4 shrink-0 text-dimmed"
      />
    </template>
  </UNavigationMenu>
</template>
