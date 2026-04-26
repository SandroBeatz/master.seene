import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import AddressAutocomplete from './AddressAutocomplete.vue'

const meta = {
  title: 'Components/UI/AddressAutocomplete',
  component: AddressAutocomplete,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: 'Current input value (v-model)',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '""' },
      },
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder text',
      table: {
        type: { summary: 'string' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    componentRestrictions: {
      control: 'object',
      description: 'Restrict results to specific country (ISO 3166-1 Alpha-2 code)',
      table: {
        type: { summary: '{ country: string | string[] }' },
      },
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
# AddressAutocomplete

Custom address autocomplete component using Google Places API with fully customizable UI.

## Features

- 🎨 **Fully customizable UI** - Complete control over dropdown styling using Shadcn Popover
- 🌍 **Multi-language support** - Automatically uses current locale from i18n
- ⌨️ **Keyboard navigation** - Arrow keys, Enter, Escape support
- 🎯 **Country restrictions** - Filter results by country
- ⚡ **Debounced search** - Optimized API calls (300ms delay)
- 🔄 **Session tokens** - Proper billing optimization
- ♿ **Accessible** - Proper focus management and keyboard navigation
- 📱 **Responsive** - Works on all screen sizes

## Requirements

- Google Maps API key configured in \`nuxt.config.ts\`
- Places API enabled in Google Cloud Console

## Limitations

- \`address_components\` may contain native language names due to Google Places API limitations
- Search starts from the first character (may increase API costs)
        `,
      },
    },
  },
} satisfies Meta<typeof AddressAutocomplete>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default state of the AddressAutocomplete component.
 * Start typing an address to see autocomplete suggestions.
 */
export const Default: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const address = ref('')
      const handlePlaceChanged = (place: any) => {
        console.log('Place selected:', place)
      }
      return { args, address, handlePlaceChanged }
    },
    template: `
      <div class="max-w-md">
        <label class="block text-sm font-medium mb-2">Street Address</label>
        <AddressAutocomplete
          v-model="address"
          v-bind="args"
          @place_changed="handlePlaceChanged"
        />
        <p class="mt-2 text-sm text-muted-foreground">
          Selected: {{ address || 'None' }}
        </p>
      </div>
    `,
  }),
  args: {
    placeholder: 'Start typing an address...',
  },
}

/**
 * AddressAutocomplete with country restriction.
 * Results are limited to Austria (AT).
 */
export const WithCountryRestriction: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const address = ref('')
      const handlePlaceChanged = (place: any) => {
        console.log('Place selected:', place)
      }
      return { args, address, handlePlaceChanged }
    },
    template: `
      <div class="max-w-md">
        <label class="block text-sm font-medium mb-2">Austrian Address</label>
        <AddressAutocomplete
          v-model="address"
          v-bind="args"
          @place_changed="handlePlaceChanged"
        />
        <p class="mt-2 text-sm text-muted-foreground">
          Selected: {{ address || 'None' }}
        </p>
      </div>
    `,
  }),
  args: {
    placeholder: 'Enter Austrian address...',
    componentRestrictions: { country: 'AT' },
  },
}

/**
 * Disabled state of the AddressAutocomplete component.
 */
export const Disabled: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const address = ref('123 Main St, Vienna')
      return { args, address }
    },
    template: `
      <div class="max-w-md">
        <label class="block text-sm font-medium mb-2 opacity-50">Street Address (Disabled)</label>
        <AddressAutocomplete
          v-model="address"
          v-bind="args"
        />
      </div>
    `,
  }),
  args: {
    placeholder: 'Address input disabled',
    disabled: true,
  },
}

/**
 * Complete form example showing how to use AddressAutocomplete
 * with other form fields and extract address components.
 */
export const CompleteFormExample: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const form = ref({
        street: '',
        houseNumber: '',
        city: '',
        zip: '',
        country: 'AT',
      })

      const handlePlaceChanged = (place: any) => {
        console.log('Full place data:', place)

        // Extract street
        const street = place.address_components.find((c: any) => c.types.includes('route'))
        // Extract street number
        const streetNumber = place.address_components.find((c: any) =>
          c.types.includes('street_number')
        )
        // Extract city
        const city = place.address_components.find(
          (c: any) => c.types.includes('locality') || c.types.includes('postal_town')
        )
        // Extract postal code
        const zip = place.address_components.find((c: any) => c.types.includes('postal_code'))

        form.value.street = street?.long_name || ''
        form.value.houseNumber = streetNumber?.long_name || ''
        form.value.city = city?.long_name || ''
        form.value.zip = zip?.long_name || ''
      }

      return { args, form, handlePlaceChanged }
    },
    template: `
      <div class="max-w-md space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Street Address</label>
          <AddressAutocomplete
            v-model="form.street"
            placeholder="Start typing address..."
            :component-restrictions="{ country: form.country }"
            @place_changed="handlePlaceChanged"
          />
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div class="col-span-3">
            <label class="block text-sm font-medium mb-2">Street</label>
            <input
              v-model="form.street"
              type="text"
              class="w-full px-3 py-2 border rounded-md"
              readonly
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">No.</label>
            <input
              v-model="form.houseNumber"
              type="text"
              class="w-full px-3 py-2 border rounded-md"
              readonly
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="col-span-1">
            <label class="block text-sm font-medium mb-2">ZIP</label>
            <input
              v-model="form.zip"
              type="text"
              class="w-full px-3 py-2 border rounded-md"
              readonly
            />
          </div>
          <div class="col-span-2">
            <label class="block text-sm font-medium mb-2">City</label>
            <input
              v-model="form.city"
              type="text"
              class="w-full px-3 py-2 border rounded-md"
              readonly
            />
          </div>
        </div>

        <div class="p-4 bg-muted rounded-md">
          <p class="text-sm font-medium mb-2">Form Data:</p>
          <pre class="text-xs">{{ JSON.stringify(form, null, 2) }}</pre>
        </div>
      </div>
    `,
  }),
}

/**
 * Demonstrates keyboard navigation features.
 * Use arrow keys to navigate suggestions, Enter to select, Escape to close.
 */
export const KeyboardNavigation: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const address = ref('')
      const selectedPlace = ref<any>(null)

      const handlePlaceChanged = (place: any) => {
        selectedPlace.value = place
      }

      return { args, address, selectedPlace, handlePlaceChanged }
    },
    template: `
      <div class="max-w-md space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Try Keyboard Navigation</label>
          <AddressAutocomplete
            v-model="address"
            v-bind="args"
            @place_changed="handlePlaceChanged"
          />
        </div>

        <div class="p-4 bg-muted rounded-md space-y-2">
          <p class="text-sm font-medium">Keyboard Shortcuts:</p>
          <ul class="text-xs space-y-1 list-disc list-inside">
            <li><kbd class="px-1 py-0.5 bg-background rounded">↓</kbd> - Move down in list</li>
            <li><kbd class="px-1 py-0.5 bg-background rounded">↑</kbd> - Move up in list</li>
            <li><kbd class="px-1 py-0.5 bg-background rounded">Enter</kbd> - Select highlighted item</li>
            <li><kbd class="px-1 py-0.5 bg-background rounded">Esc</kbd> - Close dropdown</li>
          </ul>
        </div>

        <div v-if="selectedPlace" class="p-4 bg-muted rounded-md">
          <p class="text-sm font-medium mb-2">Selected Place:</p>
          <pre class="text-xs overflow-auto max-h-48">{{ JSON.stringify(selectedPlace, null, 2) }}</pre>
        </div>
      </div>
    `,
  }),
  args: {
    placeholder: 'Type and use keyboard to navigate...',
  },
  parameters: {
    docs: {
      description: {
        story:
          'This story demonstrates the keyboard navigation capabilities. Start typing an address and use arrow keys to navigate through suggestions.',
      },
    },
  },
}

/**
 * Multiple country examples showing different country restrictions.
 */
export const MultipleCountries: Story = {
  render: args => ({
    components: { AddressAutocomplete },
    setup() {
      const addressAT = ref('')
      const addressDE = ref('')
      const addressUS = ref('')

      return { args, addressAT, addressDE, addressUS }
    },
    template: `
      <div class="space-y-6 max-w-md">
        <div>
          <label class="block text-sm font-medium mb-2">Austria (AT)</label>
          <AddressAutocomplete
            v-model="addressAT"
            placeholder="Austrian address..."
            :component-restrictions="{ country: 'AT' }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Germany (DE)</label>
          <AddressAutocomplete
            v-model="addressDE"
            placeholder="German address..."
            :component-restrictions="{ country: 'DE' }"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">United States (US)</label>
          <AddressAutocomplete
            v-model="addressUS"
            placeholder="US address..."
            :component-restrictions="{ country: 'US' }"
          />
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Examples of using the component with different country restrictions.',
      },
    },
  },
}
