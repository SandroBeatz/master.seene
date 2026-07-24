<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getEffectiveAppointmentStatusView, type Appointment } from '@entities/appointment'
import { ClientAvatar, type Client } from '@entities/client'
import { Typography } from '@shared/ui'
import { useNowMinute } from '@shared/lib/now'

const props = defineProps<{
  appointment: Appointment
  client: Client | null
  clientName: string
  serviceNames: string
  timeLabel: string
  dateLabel: string
  durationLabel: string
  priceLabel: string
  attentionLabel?: string
  attentionTone?: 'warning' | 'error'
  primaryLoading?: boolean
}>()

const emit = defineEmits<{
  open: []
  primary: []
  more: []
}>()

const { t } = useI18n()
const now = useNowMinute()

const statusView = computed(() => getEffectiveAppointmentStatusView(props.appointment, now.value))
const isPending = computed(() => props.appointment.status === 'pending')
const isOnline = computed(() => props.appointment.source === 'online_booking')

const primaryLabel = computed(() =>
  isPending.value ? t('home.nextUp.confirm') : t('home.nextUp.complete'),
)

const primaryIcon = computed(() =>
  isPending.value ? 'i-lucide-circle-check-big' : 'i-lucide-check-check',
)

const cardUI = {
  root: 'w-full rounded-md shadow-none ring-1 ring-default md:rounded-lg',
  body: 'flex p-4 sm:p-4',
}
</script>

<template>
  <UCard :ui="cardUI">
    <article
      class="flex w-full cursor-pointer flex-col"
      tabindex="0"
      @click="emit('open')"
      @keydown.enter="emit('open')"
    >
      <div class="flex items-center justify-between gap-3 mb-3">
        <Typography
          variant="endnote"
          class="font-medium text-muted px-2 py-0.5 rounded-md bg-elevated"
        >
          {{ dateLabel }} {{ timeLabel }}
        </Typography>

        <div class="flex shrink-0 items-center gap-1.5">
          <UTooltip :text="t(statusView.labelKey)">
            <UBadge
              :color="statusView.color"
              variant="soft"
              size="sm"
              square
              :icon="statusView.icon"
              :aria-label="t(statusView.labelKey)"
              class="rounded-full"
            />
          </UTooltip>
          <UTooltip v-if="isOnline" :text="t('home.nextUp.badgeOnline')">
            <UBadge
              color="info"
              variant="soft"
              size="sm"
              square
              icon="i-lucide-globe"
              :aria-label="t('home.nextUp.badgeOnline')"
              class="rounded-full"
            />
          </UTooltip>
        </div>
      </div>

      <div class="flex items-start gap-3">
        <ClientAvatar
          :first-name="client?.first_name"
          :last-name="client?.last_name"
          :emoji="client?.emoji"
          :seed="client?.id"
          size="md"
          class="shrink-0"
        />
        <div class="min-w-0 flex-1">
          <Typography variant="caption" class="truncate font-semibold text-highlighted">
            {{ clientName }}
          </Typography>
          <Typography variant="endnote" class="mt-0.5 line-clamp-1 text-muted">
            {{ serviceNames }}
          </Typography>
          <Typography variant="endnote" class="font-medium text-muted">
            {{ durationLabel }} / {{ priceLabel }}
          </Typography>
          <Typography
            v-if="attentionLabel"
            variant="endnote"
            class="mt-1 font-medium"
            :class="attentionTone === 'error' ? 'text-error' : 'text-warning'"
          >
            {{ attentionLabel }}
          </Typography>
        </div>
      </div>

      <div v-if="appointment.notes" class="mt-3 flex items-start gap-2" @click.stop>
        <UIcon name="i-lucide-messages-square" class="size-3.5 shrink-0 text-muted" />
        <Typography variant="endnote" class="line-clamp-2 text-muted">
          {{ appointment.notes }}
        </Typography>
      </div>

      <div class="mt-auto flex items-center gap-2 pt-3" @click.stop>
        <UButton
          size="sm"
          :leading-icon="primaryIcon"
          :loading="primaryLoading"
          @click="emit('primary')"
        >
          {{ primaryLabel }}
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-ellipsis"
          :aria-label="t('nav.actions')"
          class="shrink-0"
          @click="emit('more')"
        />
      </div>
    </article>
  </UCard>
</template>
