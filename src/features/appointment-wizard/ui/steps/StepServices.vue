<script setup lang="ts">
import { ServicePickerList, type Service } from '@entities/service'

defineProps<{ services: Service[] }>()
const model = defineModel<string[]>({ default: () => [] })
</script>

<template>
  <ServicePickerList v-model="model" :services="services" />
</template>
