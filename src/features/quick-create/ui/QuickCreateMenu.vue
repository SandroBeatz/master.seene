<script setup lang="ts">
defineEmits<{ appointment: []; timeOff: [] }>()
</script>

<template>
  <div class="grid gap-2">
    <UButton
      block
      size="lg"
      color="primary"
      variant="solid"
      leading-icon="i-lucide-calendar-plus"
      class="justify-start"
      @click="$emit('appointment')"
    >
      {{ $t('quickCreate.menu.appointment') }}
    </UButton>
    <UButton
      block
      size="lg"
      color="neutral"
      variant="soft"
      leading-icon="i-lucide-ban"
      class="justify-start"
      @click="$emit('timeOff')"
    >
      {{ $t('quickCreate.menu.timeOff') }}
    </UButton>
  </div>
</template>
