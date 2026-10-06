// Mobile (Ionic) public API for the home slice. Kept separate from index.ts so
// the mobile bundle never pulls in the desktop HomePage (which imports Nuxt UI
// and the whole desktop widget/feature graph). The desktop entry stays in
// index.ts; both sit at the slice root as sanctioned public surfaces.
export { default as HomeMobilePage } from './ui-mobile/HomeMobilePage.vue'
