<script setup lang="ts">
import { RouterView } from 'vue-router'

const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'About', icon: 'i-lucide-info', to: '/about' },
]
</script>

<template>
  <UDashboardGroup storage="local" storage-key="dashboard">
    <UDashboardSidebar resizable collapsible :min-size="15" :default-size="25">
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="font-semibold text-sm truncate">master.seene</span>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="navItems" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <div v-if="!collapsed" class="px-3 py-2 text-sm text-muted">User</div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel grow>
      <template #header>
        asfsafsa
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <RouterView />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
