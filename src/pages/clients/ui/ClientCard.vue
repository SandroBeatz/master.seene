<script setup lang="ts">
import { computed } from 'vue'
import { ClientAvatar, type Client } from '@entities/client'

const props = defineProps<{
  client: Client
  lastVisit: string | null
}>()

const emit = defineEmits<{
  select: []
  edit: []
  toggleFavorite: []
}>()

const fullName = computed(() =>
  [props.client.first_name, props.client.last_name].filter(Boolean).join(' '),
)

const isOnline = computed(() => props.client.source !== 'manual')

const lastVisitLabel = computed(() => {
  if (!props.lastVisit) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(props.lastVisit),
  )
})
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="group flex items-start gap-3 rounded-lg p-3 ring-1 ring-default bg-default transition-colors hover:bg-elevated hover:ring-accented focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
    @click="emit('select')"
    @keydown.enter="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <ClientAvatar
      :first-name="client.first_name"
      :last-name="client.last_name"
      :emoji="client.emoji"
      :seed="client.id"
      size="xl"
    />

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <p class="truncate font-semibold text-highlighted">{{ fullName }}</p>

        <div class="-mt-1 -mr-1 flex shrink-0 items-center" @click.stop>
          <UButton
            :icon="client.is_favorite ? 'i-heroicons-star-solid' : 'i-lucide-star'"
            :color="client.is_favorite ? 'warning' : 'neutral'"
            variant="ghost"
            size="sm"
            :aria-label="
              client.is_favorite
                ? $t('clients.card.removeFavorite')
                : $t('clients.card.addFavorite')
            "
            @click="emit('toggleFavorite')"
          />
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="$t('common.edit')"
            @click="emit('edit')"
          />
        </div>
      </div>

      <p class="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
        <UIcon name="i-lucide-phone" class="size-3.5 shrink-0" />
        <span class="truncate">{{ client.phone }}</span>
      </p>

      <div class="mt-2 flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5 text-xs text-dimmed">
          <UIcon name="i-lucide-calendar-clock" class="size-3.5 shrink-0" />
          <span class="truncate">
            {{ lastVisitLabel ?? $t('clients.card.noVisits') }}
          </span>
        </span>

        <UBadge :color="isOnline ? 'primary' : 'neutral'" variant="soft" size="sm" class="shrink-0">
          {{ isOnline ? $t('clients.source.online') : $t('clients.source.manual') }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
