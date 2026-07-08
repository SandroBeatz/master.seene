<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Client } from '@entities/client'

const props = defineProps<{ clients: Client[] }>()
const model = defineModel<string | null>()
const emit = defineEmits<{ addClient: [] }>()

const { t } = useI18n()

const items = computed(() =>
  props.clients.map((client) => ({
    label: [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone,
    value: client.id,
  })),
)
</script>

<template>
  <div class="space-y-3">
    <USelectMenu
      :model-value="model ?? undefined"
      :items="items"
      value-key="value"
      searchable
      :placeholder="t('quickCreate.appointment.client.placeholder')"
      class="w-full"
      @update:model-value="model = $event"
    />
    <UButton
      block
      color="neutral"
      variant="soft"
      leading-icon="i-lucide-user-plus"
      @click="emit('addClient')"
    >
      {{ t('quickCreate.appointment.client.add') }}
    </UButton>
  </div>
</template>
