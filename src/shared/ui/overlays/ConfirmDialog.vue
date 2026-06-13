<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { dialogColorText, type ConfirmDialogProps } from './types'

const props = withDefaults(defineProps<ConfirmDialogProps>(), {
  color: 'primary',
})

// Resolves with `true` when confirmed, `false` when cancelled or dismissed.
const emit = defineEmits<{ close: [confirmed: boolean] }>()

const { t } = useI18n()

const iconClass = computed(() => dialogColorText[props.color])
</script>

<template>
  <UModal
    :title="title"
    :close="{ onClick: () => emit('close', false) }"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <div class="flex gap-3">
        <UIcon v-if="icon" :name="icon" :class="iconClass" class="mt-0.5 size-5 shrink-0" />
        <p v-if="description" class="text-sm text-muted">{{ description }}</p>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="outline" @click="emit('close', false)">
        {{ cancelLabel ?? t('common.cancel') }}
      </UButton>
      <UButton :color="color" @click="emit('close', true)">
        {{ confirmLabel ?? t('common.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
