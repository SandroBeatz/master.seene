// Mobile (Ionic) public API for the time-field — separate from index.ts (which
// belongs to the Nuxt UI shared/ui barrel) so the native TimeField (ion-datetime
// wheel) can be imported into the mobile bundle without dragging Nuxt UI in.
export { default as TimeField } from './ui-mobile/TimeField.vue'
