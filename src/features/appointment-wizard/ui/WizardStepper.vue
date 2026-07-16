<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ current: number; count?: number }>(), { count: 4 })
const emit = defineEmits<{ navigate: [step: number] }>()

// Steps rendered as 1..count so the template can compare against `current`.
const steps = computed(() => Array.from({ length: props.count }, (_, i) => i + 1))
</script>

<template>
  <div class="flex items-center justify-center">
    <template v-for="step in steps" :key="step">
      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
        :class="step <= current ? 'bg-inverted text-inverted' : 'bg-elevated text-muted'"
        :disabled="step >= current"
        @click="emit('navigate', step)"
      >
        <UIcon v-if="step < current" name="i-lucide-check" class="size-4" />
        <span v-else>{{ step }}</span>
      </button>
      <span
        v-if="step < count"
        class="h-0.5 w-8 shrink-0 rounded-full transition-colors"
        :class="step < current ? 'bg-inverted' : 'bg-elevated'"
      />
    </template>
  </div>
</template>
