<script lang="ts">
// Module-scoped so scroll offsets survive a screen's unmount/remount: each
// pushed screen is keyed by its route in MobileShell, so navigating away
// destroys it. We stash the offset here and restore it when the same route is
// pushed again (e.g. clients list ← client detail back-navigation).
const scrollPositions = new Map<string, number>()
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MobileHeader from './MobileHeader.vue'

defineProps<{ title: string }>()

const emit = defineEmits<{ back: [] }>()

const route = useRoute()
// This instance is created fresh per pushed route (keyed by fullPath upstream),
// so the current path at setup time is a stable cache key for its lifetime.
const scrollKey = route.fullPath

const scrollEl = ref<HTMLElement | null>(null)
const hasScrolled = ref(false)

function onScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  hasScrolled.value = el.scrollTop > 24
  scrollPositions.set(scrollKey, el.scrollTop)
}

onMounted(() => {
  const saved = scrollPositions.get(scrollKey)
  if (!saved) return
  // Cached data usually renders synchronously, but retry across a few frames in
  // case the list grows taller after mount (async images, late revalidation).
  let frames = 0
  const restore = () => {
    const el = scrollEl.value
    if (!el) return
    el.scrollTop = saved
    hasScrolled.value = saved > 24
    if (el.scrollTop < saved && frames++ < 10) requestAnimationFrame(restore)
  }
  requestAnimationFrame(restore)
})
</script>

<template>
  <div
    ref="scrollEl"
    class="flex min-h-0 flex-1 flex-col overflow-y-auto"
    @scroll.passive="onScroll"
  >
    <MobileHeader :title="title" :scrolled="hasScrolled" @back="emit('back')">
      <template #actions>
        <slot name="actions" />
      </template>
    </MobileHeader>

    <section class="flex flex-1 flex-col rounded-t-xl bg-default">
      <slot />
    </section>
  </div>
</template>
