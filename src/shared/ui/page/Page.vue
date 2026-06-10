<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  title?: string
  description?: string
}

const props = defineProps<Props>()
const slots = useSlots()

const hasHeader = computed(() =>
  !!(
    props.title ||
    props.description ||
    slots['header-top'] ||
    slots['header-left'] ||
    slots['header-right'] ||
    slots['header-bottom']
  )
)
</script>

<template>
  <div class="flex-1 flex flex-col w-full">
    <div v-if="hasHeader" class="py-8">
      <UContainer>
        <slot name="header-top" />
        <div class="flex justify-between items-center">
          <div>
            <slot name="header-left">
              <div v-if="title || description">
                <h1 v-if="title" class="text-2xl font-semibold">{{ title }}</h1>
                <p v-if="description" class="text-muted">{{ description }}</p>
              </div>
            </slot>
          </div>
          <div>
            <slot name="header-right" />
          </div>
        </div>
        <slot name="header-bottom" />
      </UContainer>
    </div>
    <div>
      <UContainer>
        <slot />
      </UContainer>
    </div>
  </div>
</template>
