<script setup lang="ts">
import { useIsMobile } from '@shared/lib/viewport'
import EntryPage from './_EntryPage.vue'
import MobileEntryPage from './_MobileEntryPage.vue'

// The desktop-only redirect (bare /settings -> /settings/profile) is handled by
// a router beforeEnter guard (src/app/router/index.ts) so there's no render
// flash. Mobile shows the hub list at bare /settings — see _MobileEntryPage.vue.
const isMobile = useIsMobile()
</script>

<template>
  <MobileEntryPage v-if="isMobile" />
  <EntryPage v-else />
</template>
