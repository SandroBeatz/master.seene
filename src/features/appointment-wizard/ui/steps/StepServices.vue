<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Service, ServiceCategory } from '@entities/service'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{ services: Service[] }>()
const model = defineModel<string[]>({ default: () => [] })

const { t } = useI18n()
const formats = useFormats()
const search = ref('')
const selectedCategoryId = ref<string | null>(null)

const categories = computed(() => {
  const uniqueCategories = new Map<string, ServiceCategory>()

  for (const service of props.services) {
    if (service.category) uniqueCategories.set(service.category.id, service.category)
  }

  return [...uniqueCategories.values()]
})

const filteredServices = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()

  return props.services.filter((service) => {
    const matchesCategory =
      selectedCategoryId.value === null || service.category?.id === selectedCategoryId.value
    const matchesSearch = !query || service.name.toLocaleLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })
})

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const hoursUnit = t('quickCreate.appointment.footer.hoursUnit')
  const minutesUnit = t('quickCreate.appointment.footer.minutesUnit')

  if (hours && mins) return `${hours}${hoursUnit} ${mins}${minutesUnit}`
  if (hours) return `${hours}${hoursUnit}`
  return `${mins} ${minutesUnit}`
}

function setServiceSelected(serviceId: string, selected: boolean) {
  const isSelected = model.value.includes(serviceId)

  if (selected && !isSelected) model.value = [...model.value, serviceId]
  if (!selected && isSelected) model.value = model.value.filter((id) => id !== serviceId)
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
      v-if="services.length"
      data-testid="service-categories"
      class="flex gap-2 overflow-x-auto pb-1"
    >
      <UButton
        type="button"
        color="neutral"
        size="sm"
        :variant="selectedCategoryId === null ? 'solid' : 'soft'"
        :aria-pressed="selectedCategoryId === null"
        data-testid="service-category-all"
        @click="selectedCategoryId = null"
      >
        {{ t('quickCreate.appointment.services.all') }}
      </UButton>

      <UButton
        v-for="category in categories"
        :key="category.id"
        type="button"
        color="neutral"
        size="sm"
        :variant="selectedCategoryId === category.id ? 'solid' : 'soft'"
        :aria-pressed="selectedCategoryId === category.id"
        :data-testid="`service-category-${category.id}`"
        @click="selectedCategoryId = category.id"
      >
        {{ category.name }}
      </UButton>
    </div>

    <div v-if="filteredServices.length" class="max-h-80 space-y-2 overflow-y-auto pr-1">
      <UCheckbox
        v-for="service in filteredServices"
        :key="service.id"
        :model-value="model.includes(service.id)"
        color="neutral"
        variant="card"
        indicator="end"
        size="xl"
        data-testid="service-item"
        :aria-pressed="model.includes(service.id)"
        :ui="{
          root: 'items-center gap-3 rounded-2xl border-2 border-default px-4 py-3.5 has-data-[state=checked]:border-inverted',
          container: 'h-auto',
          base: 'size-6 rounded-lg',
          wrapper: 'me-0 min-w-0 flex-1',
          label: 'block cursor-pointer',
        }"
        @update:model-value="setServiceSelected(service.id, $event === true)"
      >
        <template #label>
          <span class="flex min-w-0 items-center gap-3">
            <span
              data-testid="service-color"
              class="size-3 shrink-0 rounded-full"
              :style="{ backgroundColor: service.color || 'var(--ui-border-accented)' }"
              aria-hidden="true"
            />

            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-highlighted">{{ service.name }}</span>
              <span class="mt-1 flex items-center gap-2">
                <UBadge
                  color="neutral"
                  variant="soft"
                  size="sm"
                  class="shrink-0 rounded-full"
                  :label="formatDuration(service.duration)"
                />
                <span class="font-semibold text-highlighted">
                  {{ formats.price(service.price) }}
                </span>
              </span>
            </span>
          </span>
        </template>
      </UCheckbox>
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
  </div>
</template>
