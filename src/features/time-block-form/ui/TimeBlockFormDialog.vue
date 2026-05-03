<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import { DEFAULT_TIME_ZONE } from '@entities/master'
import {
  useCreateTimeBlockMutation,
  useRemoveTimeBlockMutation,
  useUpdateTimeBlockMutation,
  type CreateTimeBlockDto,
  type TimeBlock,
} from '@entities/time-block'
import { useSessionStore } from '@entities/session'
import {
  addDateInputDays,
  getDateTimeInputValue,
  toUtcIsoFromZonedDateTime,
} from '@shared/lib/time-zone'

const props = withDefaults(
  defineProps<{
    open: boolean
    initialStartAt?: string
    timeBlock?: TimeBlock
    timeZone?: string
  }>(),
  {
    timeZone: DEFAULT_TIME_ZONE,
  },
)

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const isEdit = computed(() => !!props.timeBlock)

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

interface FormState {
  all_day: boolean
  date: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  notes: string
}

const state = reactive<FormState>({
  all_day: false,
  date: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  notes: '',
})

function resetForm() {
  if (props.timeBlock) {
    const start = getDateTimeInputValue(props.timeBlock.start_at, props.timeZone)
    const end = getDateTimeInputValue(props.timeBlock.end_at, props.timeZone)
    state.all_day = props.timeBlock.all_day
    state.date = start.date
    state.startDate = start.date
    state.endDate = props.timeBlock.all_day
      ? addDateInputDays(end.date, -1)
      : end.date
    state.startTime = start.time
    state.endTime = end.time
    state.notes = props.timeBlock.notes ?? ''
    return
  }

  const initial = getDateTimeInputValue(props.initialStartAt ?? new Date(), props.timeZone)
  const initialStartAt =
    props.initialStartAt ??
    toUtcIsoFromZonedDateTime(initial.date, initial.time, props.timeZone)
  const defaultEnd = getDateTimeInputValue(
    new Date(new Date(initialStartAt).getTime() + 60 * 60 * 1000),
    props.timeZone,
  )

  state.all_day = false
  state.date = initial.date
  state.startDate = initial.date
  state.endDate = initial.date
  state.startTime = initial.time
  state.endTime = defaultEnd.time
  state.notes = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

const schema = computed(() =>
  Joi.object({
    all_day: Joi.boolean().required(),
    date: Joi.string().allow('').optional(),
    startDate: Joi.string().allow('').optional(),
    endDate: Joi.string().allow('').optional(),
    startTime: Joi.string().allow('').optional(),
    endTime: Joi.string().allow('').optional(),
    notes: Joi.string().max(2000).allow('', null).optional(),
  }),
)

const createMutation = useCreateTimeBlockMutation(userId)
const updateMutation = useUpdateTimeBlockMutation(userId)
const removeMutation = useRemoveTimeBlockMutation(userId)

const isLoading = computed(
  () =>
    createMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    removeMutation.isLoading.value,
)

const formRef = ref<{ $el: HTMLFormElement } | null>(null)
const isDeleteConfirmOpen = ref(false)

function submitForm() {
  formRef.value?.$el?.requestSubmit()
}

async function onSubmit(event: FormSubmitEvent<FormState>) {
  const range = buildDateRange(event.data)

  if (!range) {
    toast.add({ title: t('timeBlocks.validation.rangeInvalid'), color: 'error' })
    return
  }

  const dto: CreateTimeBlockDto = {
    start_at: range.startAt,
    end_at: range.endAt,
    all_day: event.data.all_day,
    notes: event.data.notes || null,
  }

  try {
    if (isEdit.value && props.timeBlock) {
      await updateMutation.mutateAsync({ ...dto, id: props.timeBlock.id })
      toast.add({ title: t('timeBlocks.form.successEdit'), color: 'success' })
    } else {
      await createMutation.mutateAsync(dto)
      toast.add({ title: t('timeBlocks.form.successCreate'), color: 'success' })
    }
    isOpen.value = false
    emit('saved')
  } catch {
    toast.add({ title: t('timeBlocks.form.errorTitle'), color: 'error' })
  }
}

async function confirmDelete() {
  if (!props.timeBlock) return

  try {
    await removeMutation.mutateAsync(props.timeBlock.id)
    toast.add({ title: t('timeBlocks.form.successDelete'), color: 'success' })
    isDeleteConfirmOpen.value = false
    isOpen.value = false
    emit('saved')
  } catch {
    toast.add({ title: t('timeBlocks.form.errorDelete'), color: 'error' })
  }
}

function buildDateRange(form: FormState): { startAt: string; endAt: string } | null {
  if (form.all_day) {
    const start = toUtcIsoFromZonedDateTime(form.startDate, '00:00', props.timeZone)
    const end = toUtcIsoFromZonedDateTime(addDateInputDays(form.endDate, 1), '00:00', props.timeZone)

    if (!isValidRange(start, end)) return null

    return {
      startAt: start,
      endAt: end,
    }
  }

  const start = toUtcIsoFromZonedDateTime(form.date, form.startTime, props.timeZone)
  const end = toUtcIsoFromZonedDateTime(form.date, form.endTime, props.timeZone)

  if (!isValidRange(start, end)) return null

  return {
    startAt: start,
    endAt: end,
  }
}

function isValidRange(start: string, end: string): boolean {
  const startDate = new Date(start)
  const endDate = new Date(end)

  return (
    Number.isFinite(startDate.getTime()) &&
    Number.isFinite(endDate.getTime()) &&
    endDate > startDate
  )
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? $t('timeBlocks.form.titleEdit') : $t('timeBlocks.form.titleCreate')"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="all_day">
          <USwitch v-model="state.all_day" :label="$t('timeBlocks.form.allDay')" />
        </UFormField>

        <div v-if="state.all_day" class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('timeBlocks.form.startDate')" name="startDate" required>
            <UInput v-model="state.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="$t('timeBlocks.form.endDate')" name="endDate" required>
            <UInput v-model="state.endDate" type="date" class="w-full" />
          </UFormField>
        </div>

        <template v-else>
          <UFormField :label="$t('timeBlocks.form.date')" name="date" required>
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('timeBlocks.form.startTime')" name="startTime" required>
              <UInput v-model="state.startTime" type="time" class="w-full" />
            </UFormField>
            <UFormField :label="$t('timeBlocks.form.endTime')" name="endTime" required>
              <UInput v-model="state.endTime" type="time" class="w-full" />
            </UFormField>
          </div>
        </template>

        <UFormField :label="$t('timeBlocks.form.notes')" name="notes">
          <UTextarea
            v-model="state.notes"
            :rows="3"
            :placeholder="$t('timeBlocks.form.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex w-full items-center justify-between">
        <UButton
          v-if="isEdit"
          color="error"
          variant="ghost"
          leading-icon="i-lucide-trash-2"
          :disabled="isLoading"
          @click="isDeleteConfirmOpen = true"
        >
          {{ $t('timeBlocks.form.delete') }}
        </UButton>
        <div v-else />

        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" @click="close">
            {{ $t('timeBlocks.form.cancel') }}
          </UButton>
          <UButton color="primary" :loading="isLoading" @click="submitForm">
            {{ isEdit ? $t('timeBlocks.form.submitEdit') : $t('timeBlocks.form.submitCreate') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isDeleteConfirmOpen"
    :title="$t('timeBlocks.delete.title')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <p class="text-muted">{{ $t('timeBlocks.delete.message') }}</p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="outline" @click="isDeleteConfirmOpen = false">
        {{ $t('timeBlocks.delete.cancel') }}
      </UButton>
      <UButton color="error" :loading="removeMutation.isLoading.value" @click="confirmDelete">
        {{ $t('timeBlocks.delete.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
