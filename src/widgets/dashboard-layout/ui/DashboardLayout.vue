<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLogo from '@shared/ui/AppLogo.vue'
import { ref } from 'vue'

const showNotifications = ref(false)

const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'Calendar', icon: 'i-lucide-calendar', to: '/calendar' },
  { label: 'Clients', icon: 'i-lucide-users', to: '/clients' },
  { label: 'Services', icon: 'i-lucide-grid-2x2-plus', to: '/services' },
]

const addItems = [
  {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    onSelect: () => (showNotifications.value = true),
  },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
]

const footerItems = [
  {
    label: 'Logout',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      // Handle logout logic here
      console.log('User logged out')
    },
  },
  {
    label: 'Profile',
    avatar: {
      src: 'https://i.pravatar.cc/200?img=47',
      alt: 'User Avatar',
    },
    to: '/profile',
  },
]

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
          :collapsed="collapsed"
          :items="navItems"
        />
        <UNavigationMenu
          :ui="navigationUI"
          variant="pill"
          orientation="vertical"
          :collapsed="collapsed"
          :items="addItems"
        />
      </template>

      <template #footer="{ collapsed }">
        <UNavigationMenu
          :ui="navigationUI"
          variant="pill"
          :collapsed="collapsed"
          :items="footerItems"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel :ui="{ root: 'items-center' }">
      <RouterView />
    </UDashboardPanel>

    <USlideover
      v-model:open="showNotifications"
      direction="right"
      title="Notifications"
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
                <div class="text-sm text-muted">20 min ago</div>
              </div>
            </div>
          </UPageCard>
        </UPageList>
      </template>
    </USlideover>
  </UDashboardGroup>
</template>
