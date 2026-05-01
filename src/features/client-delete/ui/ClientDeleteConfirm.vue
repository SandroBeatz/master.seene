<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Client } from '@entities/client'

const props = defineProps<{
  open: boolean
  client: Client | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const clientName = computed(() =>
  props.client ? [props.client.first_name, props.client.last_name].filter(Boolean).join(' ') : '',
)
</script>

<template>
  <UModal v-model:open="isOpen" :title="$t('clients.delete.title')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <p class="text-sm text-muted">
        {{ $t('clients.delete.message', { name: clientName }) }}
      </p>
    </template>

    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        @click="
          () => {
            emit('cancel')
            close()
          }
        "
      >
        {{ $t('clients.delete.cancel') }}
      </UButton>
      <UButton color="error" :loading="loading" @click="emit('confirm')">
        {{ $t('clients.delete.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
