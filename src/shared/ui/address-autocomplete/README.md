# AddressAutocomplete Component

Custom address autocomplete component using Google Places API with fully customizable UI.

## Features

- 🎨 **Fully customizable UI** - Complete control over dropdown styling
- 🌍 **Multi-language support** - Automatically uses current locale from i18n
- ⌨️ **Keyboard navigation** - Arrow keys, Enter, Escape support
- 🎯 **Country restrictions** - Filter results by country
- ⚡ **Debounced search** - Optimized API calls
- 🔄 **Session tokens** - Proper billing optimization
- ♿ **Accessible** - Proper ARIA attributes and focus management

## Usage

```vue
<template>
  <AddressAutocomplete
    v-model="address"
    placeholder="Enter your address"
    :component-restrictions="{ country: 'AT' }"
    @place_changed="handlePlaceChange"
  />
</template>

<script setup>
const address = ref('')

const handlePlaceChange = (place) => {
  console.log('Selected place:', place)
  // place contains: name, place_id, formatted_address, address_components, geometry
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | Current input value (v-model) |
| `placeholder` | `string` | `undefined` | Input placeholder text |
| `componentRestrictions` | `{ country: string }` | `undefined` | Restrict results to specific country (ISO 3166-1 Alpha-2 code) |
| `disabled` | `boolean` | `false` | Disable the input |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when input value changes |
| `place_changed` | `IGoogleAutocompleteItem` | Emitted when a place is selected from dropdown |

## Place Object Structure

```typescript
interface IGoogleAutocompleteItem {
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
```

## Customization

### Styling

The component uses Tailwind classes and inherits theme colors from your design system:

- `bg-popover` - Dropdown background
- `bg-muted/50` - Hover and selected item background (subtle gray)
- `text-muted-foreground` - Secondary text and icons

You can customize these in your Tailwind config or by wrapping the component in a custom class scope.

### Dropdown Behavior

- Opens immediately when typing (from 1st character)
- Closes on selection, click outside, or Escape key
- Supports keyboard navigation (Arrow Up/Down, Enter)
- Auto-scrolls selected item into view
- Subtle gray highlight on hover and selection

## Advanced Example

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="space-y-4">
      <div>
        <label>Street Address</label>
        <AddressAutocomplete
          v-model="form.street"
          placeholder="Start typing address..."
          :component-restrictions="{ country: countryCode }"
          @place_changed="handleAddressSelect"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label>City</label>
          <input v-model="form.city" />
        </div>
        <div>
          <label>Postal Code</label>
          <input v-model="form.zip" />
        </div>
      </div>
    </div>
  </form>
</template>

<script setup>
const form = reactive({
  street: '',
  city: '',
  zip: '',
})

const countryCode = ref('AT')

const handleAddressSelect = (place) => {
  // Extract city
  const city = place.address_components.find(
    c => c.types.includes('locality') || c.types.includes('postal_town')
  )

  // Extract postal code
  const zip = place.address_components.find(
    c => c.types.includes('postal_code')
  )

  // Extract street
  const street = place.address_components.find(
    c => c.types.includes('route')
  )

  // Update form
  form.street = street?.long_name || ''
  form.city = city?.long_name || ''
  form.zip = zip?.long_name || ''
}
</script>
```

## Notes

- Requires Google Maps API key configured in `nuxt.config.ts`
- Uses session tokens for cost optimization
- Language is automatically extracted from i18n locale (e.g., 'en' from 'en-US')
- Autocomplete suggestions and `formatted_address` are localized
- **Note**: `address_components` may contain native language names due to Google Places API limitations
- Search starts from the first character typed
- 300ms debounce on input to reduce API calls
- Subtle gray hover effect for better UX

## License

This component uses Google Places API which requires proper attribution according to Google Maps Platform Terms of Service.
