<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  appointment: Appointment | null
  clientName: string
  timeLabel: string
  dateLabel: string
  declining?: boolean
  markingNoShow?: boolean
}>()

const emit = defineEmits<{
  edit: [appointment: Appointment]
  decline: [appointment: Appointment]
  noShow: [appointment: Appointment]
}>()

const { t } = useI18n()
const title = computed(() => [props.timeLabel, props.dateLabel].filter(Boolean).join(' · '))

function run(action: 'edit' | 'decline' | 'noShow') {
  if (!props.appointment) return
  const appointment = props.appointment
  open.value = false

  if (action === 'edit') emit('edit', appointment)
  if (action === 'decline') emit('decline', appointment)
  if (action === 'noShow') emit('noShow', appointment)
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="title"
    :description="clientName"
    :ui="{
      content: 'rounded-t-2xl',
      body: 'space-y-2 pb-[calc(1rem+var(--safe-area-bottom))]',
    }"
  >
    <template #body>
      <UButton
        color="neutral"
        variant="soft"
        size="lg"
        block
        leading-icon="i-lucide-pencil"
        class="justify-start"
        @click="run('edit')"
      >
        {{ t('common.edit') }}
      </UButton>

      <UButton
        v-if="appointment?.status === 'pending'"
        color="error"
        variant="soft"
        size="lg"
        block
        leading-icon="i-lucide-x"
        :loading="declining"
        class="justify-start"
        @click="run('decline')"
      >
        {{ t('home.nextUp.decline') }}
      </UButton>

      <UButton
        v-if="appointment?.status === 'confirmed'"
        color="neutral"
        variant="soft"
        size="lg"
        block
        leading-icon="i-lucide-user-x"
        :loading="markingNoShow"
        class="justify-start"
        @click="run('noShow')"
      >
        {{ t('home.nextUp.noShow') }}
      </UButton>
    </template>
  </UDrawer>
</template>
