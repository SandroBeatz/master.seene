<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClientAvatar, type Client } from '@entities/client'

const props = defineProps<{ clients: Client[] }>()
const model = defineModel<string | null>()
const emit = defineEmits<{ addClient: [] }>()

const { t } = useI18n()
const search = ref('')

function clientName(client: Client) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone
}

const filteredClients = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return props.clients

  return props.clients.filter((client) =>
    `${clientName(client)} ${client.phone}`.toLocaleLowerCase().includes(query),
  )
})

const clientSections = computed(() =>
  [
    {
      key: 'favorites',
      label: t('clients.section.favorites'),
      clients: filteredClients.value.filter((client) => client.is_favorite),
    },
    {
      key: 'all',
      label: t('quickCreate.appointment.client.allClients'),
      clients: filteredClients.value.filter((client) => !client.is_favorite),
    },
  ].filter((section) => section.clients.length > 0),
)
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

    <div v-if="filteredClients.length" class="max-h-80 space-y-5 overflow-y-auto pr-1">
      <section
        v-for="section in clientSections"
        :key="section.key"
        class="space-y-2.5"
        :data-testid="`client-section-${section.key}`"
      >
        <h3 class="px-1 text-xs font-semibold uppercase tracking-wider text-dimmed">
          {{ section.label }}
        </h3>

        <div class="space-y-2">
          <UButton
            v-for="client in section.clients"
            :key="client.id"
            type="button"
            color="neutral"
            variant="outline"
            size="xl"
            block
            :ui="{ base: 'justify-start gap-3 rounded-2xl px-4 py-3 text-left' }"
            :class="model === client.id ? 'bg-elevated ring-inverted' : ''"
            :aria-pressed="model === client.id"
            @click="model = client.id"
          >
            <ClientAvatar
              :first-name="client.first_name"
              :last-name="client.last_name"
              :emoji="client.emoji"
              :seed="client.id"
              size="xl"
              class="shrink-0"
            />

            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-highlighted">
                {{ clientName(client) }}
              </span>
              <span class="mt-0.5 block truncate text-sm font-normal text-muted">
                {{ client.phone }}
              </span>
            </span>

            <UIcon
              v-if="client.is_favorite"
              data-testid="favorite-indicator"
              name="i-lucide-star"
              class="size-5 shrink-0 text-warning"
              aria-hidden="true"
            />
          </UButton>
        </div>
      </section>
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
