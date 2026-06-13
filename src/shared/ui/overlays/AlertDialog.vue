<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { dialogColorText, type AlertDialogProps } from './types'

const props = withDefaults(defineProps<AlertDialogProps>(), {
  color: 'primary',
})

// Resolves once the user acknowledges or dismisses the alert.
const emit = defineEmits<{ close: [acknowledged: boolean] }>()

const { t } = useI18n()

const iconClass = computed(() => dialogColorText[props.color])
</script>

<template>
  <UModal
    :title="title"
    :close="{ onClick: () => emit('close', false) }"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="flex gap-3">
        <UIcon v-if="icon" :name="icon" :class="iconClass" class="mt-0.5 size-5 shrink-0" />
        <p v-if="description" class="text-sm text-muted">{{ description }}</p>
      </div>
    </template>

    <template #footer>
      <UButton :color="color" @click="emit('close', true)">
        {{ label ?? t('common.ok') }}
      </UButton>
    </template>
  </UModal>
</template>
