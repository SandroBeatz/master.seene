<script setup lang="ts">
import { useIsMobile } from '@shared/lib/viewport'
import { DashboardLayout } from '@widgets/dashboard-layout'
import { MobileShell } from '@widgets/mobile-shell'

// Reactive shell switch so resizing across the breakpoint (e.g. testing on
// desktop) swaps shells live, same routes either way.
const isMobile = useIsMobile()
</script>

<template>
  <MobileShell v-if="isMobile" />
  <DashboardLayout v-else />
</template>
