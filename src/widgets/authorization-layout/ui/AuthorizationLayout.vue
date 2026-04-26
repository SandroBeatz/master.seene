<script setup lang="ts">
import { AppFullLogo } from '@shared/ui'
import authBackground from '@shared/assets/auth-background.jpg'
</script>
<template>
  <UPage :ui="{ root: 'min-h-dvh py-12', center: 'flex flex-col flex-1 h-full' }">
    <div class="flex justify-center mb-12">
      <AppFullLogo class="w-52 h-10" />
    </div>
    <div class="flex-1 flex flex-col">
      <UContainer>
        <UPageGrid :ui="{ base: 'flex-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-4xl' }">
          <!-- Left: Form -->
          <UPageCard
            :ui="{
              root: 'rounded-none',
              container: 'flex! items-center justify-center w-full ',
            }"
            variant="soft"
          >
            <slot></slot>
          </UPageCard>

          <!-- Right: Photo -->
          <div class="overflow-hidden relative">
            <img
              :src="authBackground"
              alt=""
              class="absolute left-0 top-0 w-full h-full object-cover"
            />
          </div>
        </UPageGrid>
      </UContainer>
    </div>
  </UPage>
</template>
