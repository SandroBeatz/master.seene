<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@shared/ui'
import { supabase } from '@shared/lib/supabase'

defineOptions({ name: 'AccountSignOutRow' })

const { t } = useI18n()
const router = useRouter()
const confirm = useConfirm()

const isLoading = ref(false)

async function onSignOut() {
  const confirmed = await confirm({
    title: t('settings.account.signOut.confirmTitle'),
    description: t('settings.account.signOut.confirmMessage'),
    confirmLabel: t('settings.account.signOut.button'),
    icon: 'i-lucide-log-out',
  })
  if (!confirmed) return

  isLoading.value = true
  try {
    await supabase.auth.signOut()
    await router.push('/login')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-0.5">
      <span class="font-medium text-highlighted">{{ t('settings.account.signOut.label') }}</span>
      <span class="text-sm text-muted">{{ t('settings.account.signOut.description') }}</span>
    </div>
    <UButton
      class="shrink-0"
      color="neutral"
      variant="outline"
      leading-icon="i-lucide-log-out"
      :loading="isLoading"
      @click="onSignOut"
    >
      {{ t('settings.account.signOut.button') }}
    </UButton>
  </div>
</template>
