<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { PageProps } from './types'

// eslint-disable-next-line vue/multi-word-component-names
defineOptions({ name: 'Page' })

const props = defineProps<PageProps>()
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
  <div class="flex w-full flex-1 flex-col" :class="{ 'min-h-0': fill }">
    <div v-if="hasHeader" class="py-6 lg:py-8" :class="{ 'shrink-0': fill }">
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
    <div :class="fill ? 'flex min-h-0 flex-1 flex-col pb-6 lg:pb-8' : 'pb-8 lg:pb-12'">
      <UContainer :class="{ 'flex min-h-0 flex-1 flex-col': fill }">
        <template v-if="router">
          <div class="grid grid-cols-8 gap-6">
            <div class="col-span-2">
              <slot name="sidebar" />
            </div>
            <div class="col-span-6">
              <router-view />
            </div>
          </div>
        </template>
        <slot v-else />
      </UContainer>
    </div>
  </div>
</template>
