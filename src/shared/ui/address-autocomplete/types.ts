/// <reference types="@types/google.maps" />

export interface IGoogleAddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

export interface IGoogleAutocompleteItem {
  name: string
  place_id: string
  formatted_address: string
  address_components: IGoogleAddressComponent[]
  geometry: {
    location: {
      lat: () => number
      lng: () => number
    }
  }
}

export interface AddressAutocompleteProps {
  modelValue?: string
  placeholder?: string
  componentRestrictions?: google.maps.places.ComponentRestrictions
  disabled?: boolean
}

export interface AddressAutocompleteEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'placeChanged', place: IGoogleAutocompleteItem): void
}

export type AddressAutocompletePrediction = google.maps.places.AutocompletePrediction

export type AddressAutocompletePlace = google.maps.places.PlaceResult
