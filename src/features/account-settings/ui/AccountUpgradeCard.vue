<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AccountPlansModal from './AccountPlansModal.vue'

defineOptions({ name: 'AccountUpgradeCard' })

const { t } = useI18n()

const plansOpen = ref(false)
</script>

<template>
  <div class="relative overflow-hidden rounded-xl bg-zinc-900 p-5 text-white dark:bg-zinc-950">
    <!-- warm amber glow on the right -->
    <div
      class="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-amber-500/20 blur-3xl"
    />

    <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-col gap-2">
        <UBadge
          class="w-fit bg-white/10 text-amber-300 ring-1 ring-white/15"
          variant="solid"
          size="sm"
          icon="i-lucide-sparkles"
        >
          {{ t('settings.account.upgrade.planBadge') }}
        </UBadge>
        <span class="text-lg font-bold">{{ t('settings.account.upgrade.title') }}</span>
        <p class="max-w-md text-sm text-zinc-400">
          {{ t('settings.account.upgrade.description') }}
        </p>
      </div>

      <UButton
        class="shrink-0 rounded-full"
        color="primary"
        trailing-icon="i-lucide-arrow-up-right"
        @click="plansOpen = true"
      >
        {{ t('settings.account.upgrade.button') }}
      </UButton>
    </div>

    <AccountPlansModal v-model:open="plansOpen" />
  </div>
</template>
