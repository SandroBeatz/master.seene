<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
  type CreateServiceDto,
  type Service,
} from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  modelValue: boolean
  service?: Service | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: categories } = useServiceCategoriesQuery(userId)

const isEdit = computed(() => !!props.service)

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
  description: string
  duration: number | undefined
  price: number | null
  category_id: string | null
  is_active: boolean
  color: string
}

const state = reactive<FormState>({
  name: '',
  description: '',
  duration: undefined,
  price: null,
  category_id: null,
  is_active: true,
  color: '#a78bfa',
})

function resetForm() {
  if (props.service) {
    state.name = props.service.name
    state.description = props.service.description ?? ''
    state.duration = props.service.duration
    state.price = props.service.price
    state.category_id = props.service.category_id
    state.is_active = props.service.is_active
    state.color = props.service.color
  } else {
    state.name = ''
    state.description = ''
    state.duration = undefined
    state.price = null
    state.category_id = null
    state.is_active = true
    state.color = '#a78bfa'
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
      .max(100)
      .required()
      .messages({
        'string.empty': t('services.validation.nameRequired'),
        'any.required': t('services.validation.nameRequired'),
        'string.max': t('services.validation.nameMax'),
      }),
    description: Joi.string()
      .max(500)
      .allow('', null)
      .messages({
        'string.max': t('services.validation.descriptionMax'),
      }),
    duration: Joi.number()
      .valid(15, 30, 45, 60, 90, 120)
      .required()
      .messages({
        'any.only': t('services.validation.durationRequired'),
        'any.required': t('services.validation.durationRequired'),
        'number.base': t('services.validation.durationRequired'),
      }),
    price: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': t('services.validation.priceRequired'),
        'any.required': t('services.validation.priceRequired'),
        'number.min': t('services.validation.priceMin'),
      }),
    category_id: Joi.string().uuid().allow(null).optional(),
    is_active: Joi.boolean().required(),
    color: Joi.string().required(),
  }),
)

const createMutation = useCreateServiceMutation(userId)
const updateMutation = useUpdateServiceMutation(userId)

const isLoading = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)

async function onSubmit(event: FormSubmitEvent<FormState>) {
  try {
    const dto: CreateServiceDto = {
      name: event.data.name,
      description: event.data.description || null,
      duration: event.data.duration!,
      price: event.data.price!,
      category_id: event.data.category_id,
      is_active: event.data.is_active,
      color: state.color,
      sort_order: props.service?.sort_order ?? 0,
    }

    if (isEdit.value && props.service) {
      await updateMutation.mutateAsync({ ...dto, id: props.service.id })
    } else {
      await createMutation.mutateAsync(dto)
    }

    isOpen.value = false
    emit('success')
  } catch {
    toast.add({
      title: t('services.form.errorTitle'),
      color: 'error',
    })
  }
}

const formRef = ref<{ $el: HTMLFormElement } | null>(null)

function submitForm() {
  formRef.value?.$el?.requestSubmit()
}

const durationItems = computed(() =>
  [15, 30, 45, 60, 90, 120].map((n) => ({
    label: t('services.form.minutesLabel', { n }),
    value: n,
  })),
)

const categoryItems = computed(() => [
  { label: t('services.form.allServices'), value: null },
  ...(categories.value ?? []).map((c) => ({ label: c.name, value: c.id })),
])
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? $t('services.form.editTitle') : $t('services.form.createTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('services.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('services.form.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('services.form.description')" name="description">
          <UTextarea
            v-model="state.description"
            :placeholder="$t('services.form.descriptionPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="$t('services.form.duration')" name="duration" required>
            <USelect
              v-model="state.duration"
              :items="durationItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('services.form.price')" name="price" required>
            <UInput
              v-model.number="state.price"
              type="number"
              :placeholder="$t('services.form.pricePlaceholder')"
              :min="0"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="$t('services.form.category')" name="category_id">
          <USelect
            v-model="state.category_id"
            :items="categoryItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('services.form.color')" name="color">
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

        <UFormField name="is_active">
          <div class="flex items-center gap-3">
            <USwitch v-model="state.is_active" />
            <span class="text-sm">{{ $t('services.form.isActive') }}</span>
          </div>
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('services.form.cancel') }}
      </UButton>
      <UButton color="primary" :loading="isLoading" @click="submitForm">
        {{ $t('services.form.save') }}
      </UButton>
    </template>
  </UModal>
</template>
