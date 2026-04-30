<script setup lang="ts">
import { RouterView } from 'vue-router'
import { AppLogo } from '@shared/ui'
import { supabase } from '@shared/lib/supabase'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const showNotifications = ref(false)

const navItems = computed(() => [
  { label: t('nav.home'), icon: 'i-lucide-home', to: '/home' },
  {
    label: t('nav.calendar'),
    icon: 'i-lucide-calendar',
    to: '/calendar',
  },
  { label: t('nav.clients'), icon: 'i-lucide-users', to: '/clients' },
  {
    label: t('nav.services'),
    icon: 'i-lucide-grid-2x2-plus',
    to: '/services',
  },
])

const addItems = computed(() => [
  {
    label: t('nav.notifications'),
    icon: 'i-lucide-bell',
    onSelect: () => (showNotifications.value = true),
  },
  {
    label: t('nav.analytics'),
    icon: 'i-lucide-chart-area',
    to: '/analytics',
  },
  {
    label: t('nav.settings'),
    icon: 'i-lucide-settings',
    to: '/settings',
  },
])

const footerItems = computed(() => [
  {
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await supabase.auth.signOut()
      await router.push('/login')
    },
  },
  {
    label: t('nav.profile'),
    avatar: {
      src: 'https://i.pravatar.cc/200?img=47',
      alt: t('common.userAvatarAlt'),
    },
    to: '/profile',
  },
])

const navigationUI = {
  root: 'bg-white dark:bg-zinc-800 rounded-4xl w-14 shadow-md',
  link: 'cursor-pointer rounded-4xl justify-center size-14 text-zinc-400 hover:text-zinc-600 before:rounded-4xl aria-[current=page]:before:bg-zinc-900',
  linkLeadingIcon: 'group-aria-[current=page]:text-amber-400',
}

const notifications = ref([
  {
    name: 'Benjamin Canac',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Consequatur dolor ex harum inventore, nemo reiciendis!',
    icon: 'i-lucide-bell',
  },
])
</script>

<template>
  <UDashboardGroup storage="local" storage-key="dashboard">
    <UDashboardSidebar collapsed :ui="{ root: 'min-w-24 w-(--width) border-none items-center' }">
      <template #header>
        <AppLogo class="size-10" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :ui="navigationUI"
          variant="pill"
          orientation="vertical"
          tooltip
          :collapsed="collapsed"
          :items="navItems"
        />
        <UNavigationMenu
          :ui="navigationUI"
          variant="pill"
          orientation="vertical"
          tooltip
          :collapsed="collapsed"
          :items="addItems"
        />
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :ui="navigationUI"
          variant="pill"
          tooltip
          :collapsed="collapsed"
          :items="footerItems"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ root: 'items-center overflow-auto' }">
      <RouterView />
    </UDashboardPanel>

    <USlideover
      v-model:open="showNotifications"
      direction="right"
      :title="t('notifications.title')"
      :ui="{ content: 'min-w-md rounded-none' }"
    >
      <template #body>
        <UPageList>
          <UPageCard
            v-for="(notification, index) in notifications"
            :key="index"
            variant="subtle"
            :ui="{
              root: 'shadow-none rounded-2xl hover:bg-elevated/90 cursor-pointer',
            }"
          >
            <div class="flex justify-between w-full">
              <div class="flex gap-3 flex-1">
                <div
                  class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-primary/20 text-primary"
                >
                  <UIcon :name="notification.icon" class="size-5" />
                </div>
                <div class="flex flex-col">
                  <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {{ notification.name }}
                  </div>
                  <div class="text-sm text-zinc-500 dark:text-zinc-400">
                    {{ notification.description }}
                  </div>
                </div>
              </div>
              <div class="flex flex-col">
                <div class="text-sm text-muted">{{ t('notifications.timeAgo') }}</div>
              </div>
            </div>
          </UPageCard>
        </UPageList>
      </template>
    </USlideover>
  </UDashboardGroup>
</template>
