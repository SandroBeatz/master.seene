<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useIsMobile } from '@shared/lib/viewport'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const sessionStore = useSessionStore()
const isMobile = useIsMobile()

const userName = computed(() => {
  const profile = sessionStore.profile
  if (profile) return `${profile.first_name} ${profile.last_name}`.trim()
  return sessionStore.session?.user?.email ?? 'User'
})

const avatarSrc = computed(
  () =>
    sessionStore.profile?.avatar_url ??
    sessionStore.session?.user?.user_metadata?.avatar_url ??
    undefined,
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return t('home.greeting.morning')
  if (h >= 12 && h < 18) return t('home.greeting.afternoon')
  if (h >= 18 && h < 22) return t('home.greeting.evening')
  return t('home.greeting.night')
})
</script>

<template>
  <div class="flex min-w-0 items-center" :class="isMobile ? 'gap-3' : 'gap-4'">
    <UAvatar
      :src="avatarSrc"
      :alt="userName"
      :size="isMobile ? '2xl' : '3xl'"
      class="ring-4 ring-default shadow-sm"
    />
    <div class="flex min-w-0 flex-col gap-0.5">
      <Typography variant="caption" class="text-muted">
        {{ greeting }}
      </Typography>
      <Typography variant="h5" class="truncate font-bold text-highlighted">{{
        userName
      }}</Typography>
    </div>
  </div>
</template>
