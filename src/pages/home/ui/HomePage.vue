<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import TheWelcome from '@shared/ui/TheWelcome.vue'

const { data, status } = useQuery({
  key: ['todo'],
  query: () => fetch('https://jsonplaceholder.typicode.com/todos/1').then((r) => r.json()),
})
</script>

<template>
  <main>
    <TheWelcome />
    <UButton class="mt-4">Nuxt UI works</UButton>
    <pre class="mt-4 text-sm">{{ status }} {{ data }}</pre>
  </main>
</template>
