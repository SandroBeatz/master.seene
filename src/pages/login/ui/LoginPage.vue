<script setup lang="ts">
import { LoginForm } from '@features/auth-login'
import authBackground from '@shared/assets/auth-background.jpg'
</script>

<template>
  <UPage :ui="{ root: 'h-dvh p-28 flex! flex-col', center: 'flex flex-col flex-1 h-full' }">
    <UPageGrid :ui="{ base: 'flex-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-4xl' }">

      <!-- Left: Form -->
      <UPageCard
        :ui="{
          root: 'rounded-none',
          container: 'flex! items-center justify-center w-full ',
        }"
        variant="soft"
      >
        <LoginForm />
      </UPageCard>

      <!-- Right: Photo -->
      <div class="overflow-hidden">
        <img :src="authBackground" alt="" class="w-full h-full object-cover" />
      </div>
    </UPageGrid>
  </UPage>
</template>
