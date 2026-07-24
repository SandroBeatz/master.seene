<script setup lang="ts">
import { Typography } from '@shared/ui'

interface TimeOffBlock {
  id: string
  top: number
  height: number
  timeRange: string
  label: string
}

defineProps<{
  block: TimeOffBlock
  left: number
}>()
</script>

<template>
  <div
    data-testid="time-off-block"
    class="appt-card absolute overflow-hidden rounded-md bg-elevated pr-2.5 pl-3 text-left border border-default"
    :style="{
      top: block.top + 'px',
      height: block.height + 'px',
      left: left + 'px',
      right: '0px',
      paddingTop: '5px',
      paddingBottom: '5px',
      '--accent-bar': 'var(--ui-border)',
    }"
  >
    <span
      aria-hidden="true"
      class="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-[calc(100%-10px)] rounded-sm"
      :style="{ background: 'var(--accent-bar, var(--ui-border))' }"
    />

    <div class="flex items-center gap-1">
      <UIcon name="i-lucide-ban" class="size-3 shrink-0 text-muted" />
      <Typography variant="footnote" class="font-semibold">{{
        block.timeRange
      }}</Typography>
    </div>
    <Typography variant="caption" class="text-muted">{{ block.label }}</Typography>
  </div>
</template>
