<script setup lang="ts">
import { AppFullLogo } from '@shared/ui'
import { reactive } from 'vue'

const step = reactive({
  first: 100,
  second: 0,
  third: 0,
  forth: 0,
  fifth: 0,
})
</script>
<template>
  <UPage :ui="{ root: 'min-h-dvh py-12', center: 'flex flex-col flex-1 h-full' }">
    <div class="flex flex-col items-center justify-center mb-12">
      <AppFullLogo class="w-52 h-10 mb-10" />

      <div class="w-full max-w-sm grid grid-cols-5 gap-3">
        <UProgress v-model="step.first" />
        <UProgress v-model="step.second" />
        <UProgress v-model="step.third" />
        <UProgress v-model="step.forth" />
        <UProgress v-model="step.fifth" />
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
