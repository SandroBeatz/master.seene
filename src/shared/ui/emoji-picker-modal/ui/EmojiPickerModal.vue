<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import EmojiPicker, { type EmojiExt } from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'
import { useIsMobile } from '@shared/lib/viewport'

const props = defineProps<{
  open: boolean
  /** Set when this drawer opens on top of another drawer (mobile nesting). */
  nested?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  select: [emoji: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isMobile = useIsMobile()
const colorMode = useColorMode()
const theme = computed<'light' | 'dark' | 'auto'>(() =>
  colorMode.value === 'dark' ? 'dark' : colorMode.value === 'light' ? 'light' : 'auto',
)

function onSelect(emoji: EmojiExt) {
  emit('select', emoji.i)
  isOpen.value = false
}
</script>

<template>
  <!-- Mobile: bottom drawer. `nested` lets it stack on top of a parent drawer
  (e.g. the client form) without collapsing it — see Nuxt UI Drawer docs. -->
  <UDrawer
    v-if="isMobile"
    v-model:open="isOpen"
    :nested="nested"
    :title="$t('emojiPicker.title')"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div class="emoji-picker-full">
        <EmojiPicker :native="true" :theme="theme" :display-recent="true" @select="onSelect" />
      </div>
    </template>
  </UDrawer>

  <!-- Desktop: centered modal sized to the picker. -->
  <UModal
    v-else
    v-model:open="isOpen"
    :title="$t('emojiPicker.title')"
    :ui="{ content: 'w-auto max-w-fit', body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <EmojiPicker :native="true" :theme="theme" :display-recent="true" @select="onSelect" />
    </template>
  </UModal>
</template>

<style scoped>
/* The picker ships with a fixed width; stretch it edge-to-edge in the drawer. */
.emoji-picker-full :deep(.v3-emoji-picker) {
  width: 100%;
}
</style>
