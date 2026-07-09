<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service } from '@entities/service'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  services: Service[]
  totalDuration: number
  totalPrice: number | null
}>()
const model = defineModel<string[]>({ default: () => [] })

const { t } = useI18n()
const formats = useFormats()
const search = ref('')

const filteredServices = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return props.services
  return props.services.filter((service) => service.name.toLocaleLowerCase().includes(query))
})

const hasSelection = computed(() => model.value.length > 0)

function toggleService(serviceId: string) {
  model.value = model.value.includes(serviceId)
    ? model.value.filter((id) => id !== serviceId)
    : [...model.value, serviceId]
}
</script>

<template>
  <div class="space-y-3">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('quickCreate.appointment.services.searchPlaceholder')"
      class="w-full"
    />

    <div
      v-if="filteredServices.length"
      class="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-default bg-muted/20 p-1.5"
    >
      <button
        v-for="service in filteredServices"
        :key="service.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          model.includes(service.id)
            ? 'bg-primary/10 text-highlighted'
            : 'hover:bg-elevated/80 text-default'
        "
        :style="{ borderLeftColor: service.color || 'var(--ui-border-accented)' }"
        :aria-pressed="model.includes(service.id)"
        @click="toggleService(service.id)"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium text-highlighted">{{ service.name }}</span>
          <span class="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>{{ service.duration }} {{ t('appointments.form.minShort') }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ formats.price(service.price) }}</span>
          </span>
        </span>

        <span
          class="flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors"
          :class="
            model.includes(service.id)
              ? 'border-primary bg-primary text-inverted'
              : 'border-accented bg-default'
          "
          aria-hidden="true"
        >
          <UIcon v-if="model.includes(service.id)" name="i-lucide-check" class="size-3.5" />
        </span>
      </button>
    </div>

    <div
      v-else
      class="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-default px-6 py-8 text-center"
    >
      <UIcon name="i-lucide-scissors" class="mb-2 size-6 text-dimmed" />
      <p class="text-sm font-medium text-highlighted">
        {{
          services.length
            ? t('quickCreate.appointment.services.noResults')
            : t('quickCreate.appointment.services.empty')
        }}
      </p>
    </div>

    <div
      v-if="hasSelection"
      data-testid="services-total"
      class="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm"
    >
      <span class="text-muted"> {{ totalDuration }} {{ t('appointments.form.minShort') }} </span>
      <span class="font-medium text-highlighted">{{ formats.price(totalPrice) }}</span>
    </div>
  </div>
</template>
