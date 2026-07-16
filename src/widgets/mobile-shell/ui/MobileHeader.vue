<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ back: [] }>()
</script>

<template>
  <header
    class="flex shrink-0 items-center gap-2 border-b border-default bg-default px-2 pb-3"
    style="padding-top: calc(env(safe-area-inset-top) + 0.75rem)"
  >
    <UButton
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="ghost"
      square
      @click="emit('back')"
    />
    <span class="truncate text-base font-semibold text-highlighted">{{ title }}</span>
  </header>
</template>
