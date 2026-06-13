<script setup lang="ts">
import { computed, useSlots } from 'vue'

defineOptions({ name: 'AppPage' })

interface Props {
  title?: string
  description?: string
}

const props = defineProps<Props>()
const slots = useSlots()

const hasHeader = computed(
  () =>
    !!(
      props.title ||
      props.description ||
      slots['header-top'] ||
      slots['header-left'] ||
      slots['header-right'] ||
      slots['header-bottom']
    ),
)
</script>

<template>
  <div class="flex w-full flex-1 flex-col">
    <div v-if="hasHeader" class="py-6 lg:py-8">
      <UContainer>
        <slot name="header-top" />
        <div class="flex items-center justify-between gap-6">
          <div class="min-w-0">
            <slot name="header-left">
              <div v-if="title || description">
                <h1 v-if="title" class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
                <p v-if="description" class="text-muted">{{ description }}</p>
              </div>
            </slot>
          </div>
          <div class="shrink-0">
            <slot name="header-right" />
          </div>
        </div>
        <slot name="header-bottom" />
      </UContainer>
    </div>
    <div class="pb-8 lg:pb-12">
      <UContainer>
        <slot />
      </UContainer>
    </div>
  </div>
</template>
