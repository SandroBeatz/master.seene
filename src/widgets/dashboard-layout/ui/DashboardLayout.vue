<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppLogo from '@shared/ui/AppLogo.vue'

const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'Calendar', icon: 'i-lucide-calendar', to: '/calendar' },
  { label: 'Clients', icon: 'i-lucide-users', to: '/clients' },
  { label: 'Services', icon: 'i-lucide-grid-2x2-plus', to: '/services' },
]

const addItems = [
  { label: 'Notifications', icon: 'i-lucide-bell', to: '/notifications' },
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
  root: 'bg-white dark:bg-gray-800 rounded-4xl w-14',
  link: 'rounded-4xl justify-center size-14 text-zinc-400 hover:text-zinc-600 before:rounded-4xl aria-[current=page]:before:bg-zinc-900',
  linkLeadingIcon: 'group-aria-[current=page]:text-amber-400',
}
</script>

<template>
  <UDashboardGroup storage="local" storage-key="dashboard">
    <UDashboardSidebar collapsed :ui="{ root: 'min-w-24 w-(--width)' }">
      <template #header>
        <AppLogo />
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
  </UDashboardGroup>
</template>
