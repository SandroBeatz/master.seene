<script setup lang="ts">
import { ref } from 'vue'
import MobileHeader from './MobileHeader.vue'

defineProps<{ title: string }>()

const emit = defineEmits<{ back: [] }>()
const hasScrolled = ref(false)

function onScroll(event: Event) {
  hasScrolled.value = (event.currentTarget as HTMLElement).scrollTop > 24
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto" @scroll.passive="onScroll">
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
