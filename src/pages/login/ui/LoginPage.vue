<script setup lang="ts">
import { LoginForm } from '@features/auth-login'
import authBackground from '@shared/assets/auth-background.jpg'
</script>

<template>
  <div class="h-screen flex">
    <!-- Left: Form -->
    <div class="w-1/2 bg-white dark:bg-zinc-900 flex items-center justify-center p-12">
      <LoginForm />
    </div>

    <!-- Right: Photo + Testimonial -->
    <div class="w-1/2 relative">
      <img
        :src="authBackground"
        alt=""
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div class="absolute bottom-8 left-6 right-6 backdrop-blur-md bg-white/20 rounded-2xl p-6 text-white">
        <p class="text-lg font-medium leading-snug mb-5">
          "{{ $t('auth.testimonial.quote') }}"
        </p>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-semibold text-base">{{ $t('auth.testimonial.name') }}</p>
            <p class="text-sm opacity-80">{{ $t('auth.testimonial.role') }}</p>
            <p class="text-sm opacity-70">{{ $t('auth.testimonial.company') }}</p>
          </div>
          <div class="flex flex-col items-end gap-2 shrink-0">
            <span class="text-yellow-400 tracking-wide">★★★★★</span>
            <div class="flex gap-2">
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 transition-colors flex items-center justify-center text-sm"
                :aria-label="$t('common.previous')"
              >←</button>
              <button
                type="button"
                class="w-8 h-8 rounded-full bg-white/25 hover:bg-white/40 transition-colors flex items-center justify-center text-sm"
                :aria-label="$t('common.next')"
              >→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
