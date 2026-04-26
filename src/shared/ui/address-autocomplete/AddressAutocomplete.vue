<script setup lang="ts">
/// <reference types="@types/google.maps" />
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  IGoogleAddressComponent,
  IGoogleAutocompleteItem,
  AddressAutocompleteProps,
  AddressAutocompleteEmits,
} from './types'

const props = defineProps<AddressAutocompleteProps>()
const emit = defineEmits<AddressAutocompleteEmits>()

const { locale } = useI18n()

const languageCode = computed(() => locale.value.split('-')[0])

const containerRef = ref<HTMLDivElement | null>(null)
const isOpen = ref(false)
const predictions = ref<google.maps.places.AutocompletePrediction[]>([])
const selectedIndex = ref(-1)
const isLoading = ref(false)
const scrollContainerRef = ref<HTMLDivElement | null>(null)

let autocompleteService: google.maps.places.AutocompleteService | null = null
let placesService: google.maps.places.PlacesService | null = null
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null

const initializeServices = async () => {
  if (typeof window === 'undefined') return

  if (!window.google?.maps) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${languageCode.value}`
    script.async = true
    script.defer = true

    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  autocompleteService = new google.maps.places.AutocompleteService()
  sessionToken = new google.maps.places.AutocompleteSessionToken()

  const dummyDiv = document.createElement('div')
  placesService = new google.maps.places.PlacesService(dummyDiv)
}

onMounted(() => {
  initializeServices()

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const handleInput = (value: string) => {
  emit('update:modelValue', value)

  if (searchTimeout.value) clearTimeout(searchTimeout.value)

  if (!value || value.length < 1) {
    predictions.value = []
    isOpen.value = false
    return
  }

  isLoading.value = true
  searchTimeout.value = setTimeout(() => searchPlaces(value), 300)
}

const searchPlaces = async (input: string) => {
  if (!autocompleteService || !sessionToken) {
    await initializeServices()
  }

  if (!autocompleteService || !sessionToken) {
    isLoading.value = false
    return
  }

  const request: google.maps.places.AutocompletionRequest = {
    input,
    sessionToken,
    types: ['address'],
    language: languageCode.value,
  }

  if (props.componentRestrictions) {
    request.componentRestrictions = props.componentRestrictions
  }

  try {
    autocompleteService.getPlacePredictions(request, (result, status) => {
      isLoading.value = false

      if (status === google.maps.places.PlacesServiceStatus.OK && result) {
        predictions.value = result
        isOpen.value = true
        selectedIndex.value = -1
      } else {
        predictions.value = []
        isOpen.value = false
      }
    })
  } catch (error) {
    console.error('Error fetching predictions:', error)
    isLoading.value = false
    predictions.value = []
    isOpen.value = false
  }
}

const selectPrediction = async (prediction: google.maps.places.AutocompletePrediction) => {
  if (!placesService) return

  isLoading.value = true

  placesService.getDetails(
    {
      placeId: prediction.place_id,
      language: languageCode.value,
      sessionToken: sessionToken!,
      fields: ['address_components', 'formatted_address', 'name', 'geometry'],
    },
    (place, status) => {
      isLoading.value = false

      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        sessionToken = new google.maps.places.AutocompleteSessionToken()

        const addressComponents = place.address_components?.map((component) => ({
          long_name: component.long_name,
          short_name: component.short_name,
          types: component.types,
        })) as IGoogleAddressComponent[]

        const result: IGoogleAutocompleteItem = {
          name: place.name || '',
          place_id: prediction.place_id,
          formatted_address: place.formatted_address || '',
          address_components: addressComponents || [],
          geometry: {
            location: {
              lat: () => place.geometry?.location?.lat() || 0,
              lng: () => place.geometry?.location?.lng() || 0,
            },
          },
        }

        emit('placeChanged', result)

        isOpen.value = false
        predictions.value = []
      }
    },
  )
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || predictions.value.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, predictions.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0) {
        const prediction = predictions.value[selectedIndex.value]
        if (prediction) selectPrediction(prediction)
      }
      break
    case 'Escape':
      event.preventDefault()
      isOpen.value = false
      selectedIndex.value = -1
      break
  }
}

watch(selectedIndex, (newIndex) => {
  if (newIndex >= 0 && scrollContainerRef.value) {
    const items = scrollContainerRef.value.querySelectorAll('[data-prediction-item]')
    const selectedItem = items[newIndex] as HTMLElement

    if (selectedItem) {
      const container = scrollContainerRef.value
      const itemTop = selectedItem.offsetTop
      const itemBottom = itemTop + selectedItem.offsetHeight
      const containerScrollTop = container.scrollTop
      const containerHeight = container.clientHeight

      if (itemBottom > containerScrollTop + containerHeight) {
        container.scrollTop = itemBottom - containerHeight
      } else if (itemTop < containerScrollTop) {
        container.scrollTop = itemTop
      }
    }
  }
})
</script>

<template>
  <div ref="containerRef" class="relative">
    <UInput
      class="w-full"
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :loading="isLoading"
      autocomplete="off"
      @update:model-value="handleInput"
      @keydown="handleKeydown"
    />

    <div
      v-if="isOpen && predictions.length > 0"
      ref="scrollContainerRef"
      class="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-[300px] overflow-y-auto"
      @mousedown.prevent
    >
      <button
        v-for="(prediction, index) in predictions"
        :key="prediction.place_id"
        type="button"
        data-prediction-item
        :class="[
          'w-full text-left px-3 py-2 text-sm transition-colors',
          'hover:bg-zinc-100 dark:hover:bg-zinc-700',
          selectedIndex === index && 'bg-zinc-100 dark:bg-zinc-700',
        ]"
        @click="selectPrediction(prediction)"
        @mouseenter="selectedIndex = index"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-map-pin" class="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ prediction.structured_formatting.main_text }}
            </div>
            <div class="text-xs text-muted-foreground truncate">
              {{ prediction.structured_formatting.secondary_text }}
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
