<script setup lang="ts">
import { computed } from 'vue'
import type { AvatarProps } from '@nuxt/ui'

const props = withDefaults(
  defineProps<{
    firstName?: string | null
    lastName?: string | null
    emoji?: string | null
    /** Stable seed for the initials color (e.g. client id). Falls back to the name. */
    seed?: string
    size?: AvatarProps['size']
  }>(),
  { size: 'md' },
)

/** Fixed palette (bg + matching text) so every class is present in source (Tailwind-safe). */
const palette = [
  { bg: 'bg-rose-100', text: 'text-rose-900' },
  { bg: 'bg-orange-100', text: 'text-orange-900' },
  { bg: 'bg-amber-100', text: 'text-amber-900' },
  { bg: 'bg-emerald-100', text: 'text-emerald-900' },
  { bg: 'bg-teal-100', text: 'text-teal-900' },
  { bg: 'bg-sky-100', text: 'text-sky-900' },
  { bg: 'bg-indigo-100', text: 'text-indigo-900' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-900' },
]

const initials = computed(() => {
  const parts = [props.firstName, props.lastName].filter(Boolean) as string[]
  if (!parts.length) return '?'
  return parts
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
})

const fullName = computed(
  () => [props.firstName, props.lastName].filter(Boolean).join(' ') || undefined,
)

const colorEntry = computed(() => {
  const seed = props.seed || fullName.value || '?'
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  // Modulo guarantees a valid index into the non-empty palette.
  return palette[Math.abs(hash) % palette.length]!
})

const display = computed(() => props.emoji || initials.value)
// Background goes on the root; text color must target the `fallback` slot (where
// the `text` prop renders) — styling it via `root` does not cascade reliably.
const rootClass = computed(() => (props.emoji ? 'bg-elevated' : colorEntry.value.bg))
const fallbackClass = computed(() => (props.emoji ? 'text-default' : colorEntry.value.text))
</script>

<template>
  <UAvatar
    :text="display"
    :alt="fullName"
    :size="size"
    :ui="{ root: rootClass + ' text-sm', fallback: fallbackClass }"
  />
</template>
