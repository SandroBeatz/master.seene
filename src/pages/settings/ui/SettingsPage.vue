<script setup lang="ts">
const navItems = [
  { label: 'Home', icon: 'i-lucide-home', to: '/' },
  { label: 'Calendar', icon: 'i-lucide-calendar', to: '/calendar' },
  { label: 'Clients', icon: 'i-lucide-users', to: '/clients' },
  { label: 'Services', icon: 'i-lucide-grid-2x2-plus', to: '/services' },
]
</script>

<template>
  <UPage :ui="{ root: 'px-12 w-full max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      title="Settings"
      description="Welcome back to your dashboard. Here’s what’s happening with your projects today."
      :ui="{ root: 'border-none' }"
    />
    <UPageBody>
      <div class="grid grid-cols-7 gap-4">
        <div class="col-span-2">
          <UPageCard variant="subtle">
            <UNavigationMenu variant="pill" orientation="vertical" :items="navItems" />
          </UPageCard>
        </div>
        <div class="col-span-4"></div>
      </div>
    </UPageBody>
  </UPage>
</template>
