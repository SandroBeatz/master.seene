<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  useCreatePaymentTypeMutation,
  useUpdatePaymentTypeMutation,
  type CreatePaymentTypeDto,
  type PaymentType,
} from '@entities/payment-type'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  modelValue: boolean
  paymentType?: PaymentType | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const isEdit = computed(() => !!props.paymentType)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const COLOR_PALETTE = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#34d399',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#f472b6',
  '#94a3b8',
]

interface FormState {
  name: string
  color: string
}

const state = reactive<FormState>({
  name: '',
  color: COLOR_PALETTE[0],
})

function resetForm() {
  if (props.paymentType) {
    state.name = props.paymentType.name
    state.color = props.paymentType.color
  } else {
    state.name = ''
    state.color = COLOR_PALETTE[0]
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

const schema = computed(() =>
  Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.empty': t('common.validation.required'),
        'any.required': t('common.validation.required'),
        'string.max': t('common.validation.tooLong'),
      }),
    color: Joi.string().required(),
  }),
)

const createMutation = useCreatePaymentTypeMutation(userId)
const updateMutation = useUpdatePaymentTypeMutation(userId)

const isLoading = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)

async function onSubmit(event: FormSubmitEvent<FormState>) {
  try {
    const dto: CreatePaymentTypeDto = {
      name: event.data.name,
      color: state.color,
      is_default: false,
      sort_order: props.paymentType?.sort_order ?? 0,
    }

    if (isEdit.value && props.paymentType) {
      await updateMutation.mutateAsync({ ...dto, id: props.paymentType.id })
    } else {
      await createMutation.mutateAsync(dto)
    }

    isOpen.value = false
    emit('success')
  } catch {
    toast.add({
      title: isEdit.value
        ? t('settings.paymentTypes.deleteError')
        : t('settings.paymentTypes.deleteError'),
      color: 'error',
    })
  }
}

const formRef = ref<{ $el: HTMLFormElement } | null>(null)

function submitForm() {
  formRef.value?.$el?.requestSubmit()
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? $t('settings.paymentTypes.form.titleEdit') : $t('settings.paymentTypes.form.titleCreate')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('settings.paymentTypes.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('settings.paymentTypes.form.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('settings.paymentTypes.form.color')" name="color">
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              v-for="c in COLOR_PALETTE"
              :key="c"
              type="button"
              class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
              :style="{
                backgroundColor: c,
                boxShadow: state.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
              }"
              @click="state.color = c"
            />
          </div>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('settings.paymentTypes.form.cancel') }}
      </UButton>
      <UButton color="primary" :loading="isLoading" @click="submitForm">
        {{ isEdit ? $t('settings.paymentTypes.form.submitEdit') : $t('settings.paymentTypes.form.submitCreate') }}
      </UButton>
    </template>
  </UModal>
</template>
