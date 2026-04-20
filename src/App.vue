<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { DashboardLayout } from '@widgets/dashboard-layout'

const route = useRoute()
const isDashboard = computed(() => route.meta.layout !== 'auth')
</script>

<template>
  <DashboardLayout v-if="isDashboard" />
  <RouterView v-else />
</template>
