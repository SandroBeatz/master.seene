<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const sessionStore = useSessionStore()

const userName = computed(() => {
  const profile = sessionStore.profile
  if (profile) return `${profile.first_name} ${profile.last_name}`.trim()
  return sessionStore.session?.user?.email ?? 'User'
})

const avatarSrc = computed(() => sessionStore.session?.user?.user_metadata?.avatar_url ?? undefined)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return t('home.greeting.morning')
  if (h >= 12 && h < 18) return t('home.greeting.afternoon')
  if (h >= 18 && h < 22) return t('home.greeting.evening')
  return t('home.greeting.night')
})
</script>

<template>
  <div class="flex items-center gap-4">
    <UAvatar :src="avatarSrc" :alt="userName" size="3xl" />
    <div class="flex flex-col gap-0.5">
      <Typography variant="caption" class="text-muted">{{ greeting }}</Typography>
      <Typography variant="h5" class="font-bold">{{ userName }}</Typography>
    </div>
  </div>
</template>
