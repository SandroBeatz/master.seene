<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import EmojiPicker, { type EmojiExt } from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  select: [emoji: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

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
  <UModal
    v-model:open="isOpen"
    :title="$t('emojiPicker.title')"
    :ui="{ content: 'w-auto max-w-fit', body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <EmojiPicker
        :native="true"
        :theme="theme"
        :display-recent="true"
        @select="onSelect"
      />
    </template>
  </UModal>
</template>
