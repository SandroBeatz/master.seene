<script setup lang="ts">
defineOptions({ name: 'ComingSoon' })

defineProps<{ title: string; description?: string; icon?: string }>()

const hostUI = { root: 'rounded-xl shadow-panel ring-0 divide-y-0' }
</script>

<template>
  <UCard :ui="hostUI">
    <div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <UIcon :name="icon ?? 'i-lucide-construction'" class="size-12 text-dimmed" />
      <div class="flex flex-col gap-1">
        <p class="text-lg font-medium text-muted">{{ title }}</p>
        <p v-if="description" class="text-sm text-dimmed">{{ description }}</p>
      </div>
    </div>
  </UCard>
</template>
