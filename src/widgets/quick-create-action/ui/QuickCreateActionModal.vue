<script setup lang="ts">
import type { QuickCreateChoice } from '../model/types'

// Resolves (via `useOverlay` result) with the chosen action, or `undefined`
// when the menu is dismissed without a choice.
const emit = defineEmits<{ close: [choice?: QuickCreateChoice] }>()
</script>

<template>
  <UModal
    :title="$t('quickCreate.menu.title')"
    :description="$t('quickCreate.menu.description')"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <div class="grid gap-2">
        <UButton
          block
          size="lg"
          color="primary"
          variant="solid"
          leading-icon="i-lucide-calendar-plus"
          class="justify-start"
          @click="emit('close', 'appointment')"
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
          @click="emit('close', 'timeOff')"
        >
          {{ $t('quickCreate.menu.timeOff') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
