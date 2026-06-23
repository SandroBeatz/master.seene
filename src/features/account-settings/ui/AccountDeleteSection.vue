<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'

defineOptions({ name: 'AccountDeleteSection' })

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const sessionStore = useSessionStore()

const username = computed(() => sessionStore.profile?.username ?? '')

const isOpen = ref(false)
const step = ref<1 | 2>(1)
const typedUsername = ref('')
const isLoading = ref(false)

const usernameMatches = computed(
  () => typedUsername.value.trim() === username.value && username.value.length > 0,
)

watch(isOpen, (open) => {
  if (open) {
    step.value = 1
    typedUsername.value = ''
  }
})

function goToFinalStep() {
  if (usernameMatches.value) step.value = 2
}

async function onConfirmDelete() {
  const userId = sessionStore.session?.user.id
  if (!userId) return

  isLoading.value = true
  try {
    const { error } = await supabase
      .from('master_profile')
      .update({ deactivated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (error) {
      toast.add({ title: t('settings.account.delete.errorToast'), description: error.message, color: 'error' })
      return
    }

    await supabase.auth.signOut()
    isOpen.value = false
    toast.add({ title: t('settings.account.delete.deactivatedToast'), color: 'warning' })
    await router.push('/login')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="rounded-lg p-4 ring-1 ring-error/30">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-0.5">
        <span class="font-semibold text-error">{{ t('settings.account.delete.sectionTitle') }}</span>
        <span class="text-sm text-muted">{{ t('settings.account.delete.sectionDescription') }}</span>
      </div>
      <UButton
        class="shrink-0"
        color="error"
        variant="solid"
        leading-icon="i-lucide-trash-2"
        @click="isOpen = true"
      >
        {{ t('settings.account.delete.button') }}
      </UButton>
    </div>

    <UModal
      v-model:open="isOpen"
      :title="step === 1 ? t('settings.account.delete.step1Title') : t('settings.account.delete.step2Title')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <!-- Step 1: type username to confirm -->
        <div v-if="step === 1" class="space-y-4">
          <p class="text-sm text-muted">
            {{ t('settings.account.delete.step1Description', { username }) }}
          </p>
          <UFormField :label="t('settings.account.delete.usernameLabel')">
            <UInput
              v-model="typedUsername"
              :placeholder="t('settings.account.delete.usernamePlaceholder')"
              class="w-full"
              autocomplete="off"
            />
          </UFormField>
        </div>

        <!-- Step 2: final confirmation -->
        <div v-else class="flex gap-3">
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-5 shrink-0 text-error" />
          <p class="text-sm text-muted">{{ t('settings.account.delete.step2Description') }}</p>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" @click="close">
          {{ t('common.cancel') }}
        </UButton>
        <UButton v-if="step === 1" color="error" :disabled="!usernameMatches" @click="goToFinalStep">
          {{ t('settings.account.delete.continueButton') }}
        </UButton>
        <UButton v-else color="error" :loading="isLoading" @click="onConfirmDelete">
          {{ t('settings.account.delete.finalConfirmButton') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
