<script setup lang="ts">
import { computed } from 'vue'
import type { TypographyVariant } from './types'

const props = withDefaults(
  defineProps<{
    as?: keyof HTMLElementTagNameMap
    variant?: TypographyVariant
    content?: string
  }>(),
  {
    as: 'p',
    variant: 'body',
    content: '',
  },
)

defineOptions({ inheritAttrs: false })

const variantClass = computed(() => {
  switch (props.variant) {
    case 'h1':
      return 'text-5xl md:text-6xl'
    case 'h2':
      return 'text-3xl md:text-4xl'
    case 'h3':
      return 'text-3xl'
    case 'h4':
      return 'text-2xl'
    case 'h5':
      return 'text-xl'
    case 'h6':
      return 'text-base'
    case 'body':
      return 'text-base'
    case 'blockquote':
      return 'text-base italic'
    case 'caption':
      return 'text-sm'
    case 'endnote':
      return 'text-sm leading-snug'
    case 'footnote':
      return 'text-xs'
    default:
      return ''
  }
})
</script>

<template>
  <component :is="as" :class="[variantClass, $attrs.class]" v-bind="$attrs">
    <template v-if="!$slots['default']">{{ content }}</template>
    <slot />
  </component>
</template>
