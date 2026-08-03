<script setup lang="ts">
import { ClientPickerList, type Client } from '@entities/client'

defineProps<{ clients: Client[] }>()
const model = defineModel<string | null>()
const emit = defineEmits<{ addClient: [] }>()
</script>

<template>
  <ClientPickerList v-model="model" :clients="clients" @add-client="emit('addClient')" />
</template>
