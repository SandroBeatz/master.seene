import { computed, ref, watch, type Ref } from 'vue'
import type { Service, ServiceCategory } from './types'

export const ALL_SERVICE_CATEGORIES = 'all'

export interface ServiceCategoryChip {
  id: string
  label: string
  count: number
}

/**
 * Search + category filter for multi-select service lists (picker modal and
 * in-flow pages). Inactive services stay hidden unless already selected, so an
 * existing booking with an archived service still renders it.
 */
export function useServiceSelectFilter(
  services: Ref<Service[]>,
  selectedIds: Ref<string[]>,
  allLabel: Ref<string>,
) {
  const query = ref('')
  const activeCategory = ref(ALL_SERVICE_CATEGORIES)

  const availableServices = computed(() =>
    services.value.filter((service) => service.is_active || selectedIds.value.includes(service.id)),
  )

  const categories = computed(() => {
    const uniqueCategories = new Map<string, ServiceCategory>()
    for (const service of availableServices.value) {
      if (service.category) uniqueCategories.set(service.category.id, service.category)
    }
    return [...uniqueCategories.values()].sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }),
    )
  })

  const categoryChips = computed<ServiceCategoryChip[]>(() => [
    { id: ALL_SERVICE_CATEGORIES, label: allLabel.value, count: availableServices.value.length },
    ...categories.value.map((category) => ({
      id: category.id,
      label: category.name,
      count: availableServices.value.filter((service) => service.category_id === category.id)
        .length,
    })),
  ])

  const filteredServices = computed(() => {
    const search = query.value.trim().toLocaleLowerCase()
    return availableServices.value.filter((service) => {
      const matchesCategory =
        activeCategory.value === ALL_SERVICE_CATEGORIES ||
        service.category_id === activeCategory.value
      const matchesSearch =
        !search ||
        `${service.name} ${service.category?.name ?? ''}`.toLocaleLowerCase().includes(search)
      return matchesCategory && matchesSearch
    })
  })

  watch(categoryChips, (chips) => {
    if (!chips.some((chip) => chip.id === activeCategory.value)) {
      activeCategory.value = ALL_SERVICE_CATEGORIES
    }
  })

  function reset() {
    query.value = ''
    activeCategory.value = ALL_SERVICE_CATEGORIES
  }

  return { query, activeCategory, categoryChips, filteredServices, reset }
}
