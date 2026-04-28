<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Client } from '@entities/client'

const props = defineProps<{
  client: Client
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const { t } = useI18n()

const fullName = computed(() =>
  [props.client.first_name, props.client.last_name].filter(Boolean).join(' '),
)

const formattedBirthday = computed(() => {
  if (!props.client.birthday) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
    new Date(props.client.birthday),
  )
})

const formattedCreatedAt = computed(() =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(props.client.created_at),
  ),
)
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xl font-semibold">{{ fullName }}</p>
        <p class="text-lg text-muted mt-0.5">{{ client.phone }}</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          leading-icon="i-lucide-pencil"
          @click="emit('edit')"
        >
          {{ $t('clients.details.editButton') }}
        </UButton>
        <UButton
          size="sm"
          color="error"
          variant="soft"
          leading-icon="i-lucide-trash-2"
          @click="emit('delete')"
        >
          {{ $t('clients.details.deleteButton') }}
        </UButton>
      </div>
    </div>

    <USeparator />

    <!-- Contacts -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        {{ $t('clients.details.contacts') }}
      </p>
      <div class="space-y-2 text-sm">
        <div class="flex gap-2">
          <UIcon name="i-lucide-mail" class="text-muted shrink-0 mt-0.5" />
          <span>{{ client.email || $t('clients.details.noEmail') }}</span>
        </div>
        <div v-if="formattedBirthday" class="flex gap-2">
          <UIcon name="i-lucide-cake" class="text-muted shrink-0 mt-0.5" />
          <span>{{ formattedBirthday }}</span>
        </div>
      </div>
    </div>

    <USeparator />

    <!-- Notes -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        {{ $t('clients.details.notes') }}
      </p>
      <p class="text-sm whitespace-pre-wrap">
        {{ client.notes || $t('clients.details.noNotes') }}
      </p>
    </div>

    <USeparator />

    <!-- Appointments placeholder -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        {{ $t('clients.details.appointments') }}
      </p>
      <UEmpty
        :description="$t('clients.details.appointmentsSoon')"
        icon="i-lucide-calendar-clock"
      />
    </div>

    <USeparator />

    <!-- Footer meta -->
    <div class="text-xs text-muted space-y-1">
      <p>{{ $t('clients.details.source') }}: {{ client.source }}</p>
      <p>{{ $t('clients.details.createdAt') }}: {{ formattedCreatedAt }}</p>
    </div>
  </div>
</template>
