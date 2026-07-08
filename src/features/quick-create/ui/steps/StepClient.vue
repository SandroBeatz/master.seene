<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Client } from '@entities/client'

const props = defineProps<{ clients: Client[] }>()
const model = defineModel<string | null>()
const emit = defineEmits<{ addClient: [] }>()

const { t } = useI18n()
const search = ref('')

function clientName(client: Client) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone
}

function clientInitials(client: Client) {
  const initials = [client.first_name, client.last_name]
    .filter(Boolean)
    .map((part) => part!.trim().charAt(0))
    .join('')

  return initials.slice(0, 2).toLocaleUpperCase()
}

const filteredClients = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return props.clients

  return props.clients.filter((client) =>
    `${clientName(client)} ${client.phone}`.toLocaleLowerCase().includes(query),
  )
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('quickCreate.appointment.client.searchPlaceholder')"
        class="min-w-0 flex-1"
        autofocus
      />
      <UButton
        icon="i-lucide-plus"
        color="primary"
        square
        :aria-label="t('quickCreate.appointment.client.add')"
        @click="emit('addClient')"
      />
    </div>

    <div
      v-if="filteredClients.length"
      class="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-default bg-muted/20 p-1.5"
    >
      <button
        v-for="client in filteredClients"
        :key="client.id"
        type="button"
        class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          model === client.id
            ? 'bg-primary/10 text-highlighted'
            : 'hover:bg-elevated/80 text-default'
        "
        :aria-pressed="model === client.id"
        @click="model = client.id"
      >
        <UAvatar
          :text="clientInitials(client)"
          :alt="clientName(client)"
          size="lg"
          :color="model === client.id ? 'primary' : 'neutral'"
          class="shrink-0"
        />

        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium text-highlighted">
            {{ clientName(client) }}
          </span>
          <span class="mt-0.5 block truncate text-sm text-muted">
            {{ client.phone }}
          </span>
        </span>

        <UIcon
          v-if="model === client.id"
          name="i-lucide-check"
          class="size-5 shrink-0 text-primary"
        />
      </button>
    </div>

    <div
      v-else
      class="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-default px-6 py-8 text-center"
    >
      <UIcon name="i-lucide-users" class="mb-2 size-6 text-dimmed" />
      <p class="text-sm font-medium text-highlighted">
        {{
          clients.length
            ? t('quickCreate.appointment.client.noResults')
            : t('quickCreate.appointment.client.empty')
        }}
      </p>
    </div>
  </div>
</template>
