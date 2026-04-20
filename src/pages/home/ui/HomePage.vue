<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, status } = useQuery({
  key: ['todo'],
  query: () => fetch('https://jsonplaceholder.typicode.com/todos/1').then((r) => r.json()),
})
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="$t('home.title')"
      :description="$t('home.description')"
      :ui="{root: 'border-none'}"
    />
    <UPageBody>
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2">
          <UPageCard
            title="Tailwind CSS"
            description="Nuxt UI integrates with latest Tailwind CSS, bringing significant improvements."
            icon="i-simple-icons-tailwindcss"
            to="https://tailwindcss.com/docs/v4-beta"
            target="_blank"
            variant="soft"
          />
        </div>
        <div class="col-span-1">
          <UPageCard
            title="Tailwind CSS"
            description="Nuxt UI integrates with latest Tailwind CSS, bringing significant improvements."
            icon="i-simple-icons-tailwindcss"
            to="https://tailwindcss.com/docs/v4-beta"
            target="_blank"
            variant="soft"
          />
        </div>
      </div>

      <UButton class="mt-4">Nuxt UI works</UButton>
      <pre class="mt-4 text-sm">{{ status }} {{ data }}</pre>
    </UPageBody>
  </UPage>
</template>
