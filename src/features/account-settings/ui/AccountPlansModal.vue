<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIsMobile } from '@shared/lib/viewport'

defineOptions({ name: 'AccountPlansModal' })

const open = defineModel<boolean>('open', { default: false })

const isMobile = useIsMobile()
const { t, tm, rt } = useI18n()
const toast = useToast()

const freeFeatures = computed(() => tm('settings.account.plans.free.features') as unknown[])
const proFeatures = computed(() => tm('settings.account.plans.pro.features') as unknown[])

function onChoosePro() {
  toast.add({ title: t('settings.account.plans.pro.comingSoonToast'), color: 'info' })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('settings.account.plans.modalTitle')"
    :description="t('settings.account.plans.modalSubtitle')"
    :fullscreen="isMobile"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Free -->
        <div class="flex flex-col gap-4 rounded-xl p-5 ring-1 ring-default">
          <div class="flex flex-col gap-1">
            <span class="font-bold text-highlighted">{{
              t('settings.account.plans.free.name')
            }}</span>
            <span class="text-sm text-muted">{{ t('settings.account.plans.free.tagline') }}</span>
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl font-bold text-highlighted">{{
              t('settings.account.plans.free.price')
            }}</span>
            <span class="text-sm text-muted">{{ t('settings.account.plans.free.priceNote') }}</span>
          </div>
          <ul class="flex flex-1 flex-col gap-2">
            <li v-for="(feature, i) in freeFeatures" :key="i" class="flex gap-2 text-sm">
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-muted" />
              <span class="text-default">{{ rt(feature as never) }}</span>
            </li>
          </ul>
          <UButton color="neutral" variant="subtle" block disabled>
            {{ t('settings.account.plans.free.currentButton') }}
          </UButton>
        </div>

        <!-- Pro -->
        <div class="relative flex flex-col gap-4 rounded-xl p-5 ring-2 ring-primary">
          <UBadge class="absolute -top-2.5 right-4" color="primary" variant="solid" size="sm">
            {{ t('settings.account.plans.pro.badge') }}
          </UBadge>
          <div class="flex flex-col gap-1">
            <span class="font-bold text-highlighted">{{
              t('settings.account.plans.pro.name')
            }}</span>
            <span class="text-sm text-muted">{{ t('settings.account.plans.pro.tagline') }}</span>
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-sm text-muted">{{ t('settings.account.plans.pro.priceNote') }}</span>
          </div>
          <ul class="flex flex-1 flex-col gap-2">
            <li v-for="(feature, i) in proFeatures" :key="i" class="flex gap-2 text-sm">
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span class="text-default">{{ rt(feature as never) }}</span>
            </li>
          </ul>
          <UButton color="primary" block @click="onChoosePro">
            {{ t('settings.account.plans.pro.selectButton') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
