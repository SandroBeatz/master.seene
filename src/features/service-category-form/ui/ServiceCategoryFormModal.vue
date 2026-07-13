<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  type ServiceCategory,
} from '@entities/service-category'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  modelValue: boolean
  category?: ServiceCategory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const isEdit = computed(() => !!props.category)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

interface FormState {
  name: string
}

const state = reactive<FormState>({ name: '' })

function resetForm() {
  state.name = props.category?.name ?? ''
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
  }),
)

const createMutation = useCreateServiceCategoryMutation(userId)
const updateMutation = useUpdateServiceCategoryMutation(userId)

const isLoading = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)

async function onSubmit(event: FormSubmitEvent<FormState>) {
  try {
    if (isEdit.value && props.category) {
      await updateMutation.mutateAsync({ id: props.category.id, name: event.data.name })
      toast.add({ title: t('settings.serviceCategories.updateSuccess'), color: 'success' })
    } else {
      await createMutation.mutateAsync({ name: event.data.name })
      toast.add({ title: t('settings.serviceCategories.createSuccess'), color: 'success' })
    }
    isOpen.value = false
    emit('success')
  } catch {
    toast.add({ title: t('settings.serviceCategories.saveError'), color: 'error' })
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
    :title="
      isEdit
        ? $t('settings.serviceCategories.form.titleEdit')
        : $t('settings.serviceCategories.form.titleCreate')
    "
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('settings.serviceCategories.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="$t('settings.serviceCategories.form.namePlaceholder')"
            autofocus
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('settings.serviceCategories.form.cancel') }}
      </UButton>
      <UButton color="primary" :loading="isLoading" @click="submitForm">
        {{
          isEdit
            ? $t('settings.serviceCategories.form.submitEdit')
            : $t('settings.serviceCategories.form.submitCreate')
        }}
      </UButton>
    </template>
  </UModal>
</template>
