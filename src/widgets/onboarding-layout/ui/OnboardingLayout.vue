<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AppFullLogo } from '@shared/ui'

const route = useRoute()

const currentStep = computed(() => {
  const name = route.name as string | undefined
  const match = name ? name.match(/^onboarding-step(\d)$/) : null
  return match ? Number(match[1]) : 1
})

const stepValues = computed(() =>
  [1, 2, 3, 4, 5].map((n) => (n <= currentStep.value ? 100 : 0)),
)
</script>

<template>
  <UPage :ui="{ root: 'min-h-dvh py-12', center: 'flex flex-col flex-1 h-full' }">
    <div class="flex flex-col items-center justify-center mb-12">
      <AppFullLogo class="w-52 h-10 mb-10" />

      <div class="w-full max-w-sm grid grid-cols-5 gap-3">
        <UProgress v-for="(val, i) in stepValues" :key="i" :model-value="val" />
      </div>
    </div>
    <div class="flex-1 flex flex-col">
      <UContainer :ui="{ base: 'max-w-lg' }">
        <UPageCard
          :ui="{
            container: 'flex! items-center justify-center w-full ',
          }"
          variant="soft"
        >
          <RouterView />
        </UPageCard>
      </UContainer>
    </div>
  </UPage>
</template>
