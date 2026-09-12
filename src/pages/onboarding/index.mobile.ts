// Mobile (Ionic) public API for the onboarding slice — separate from index.ts so
// the mobile bundle never pulls in the desktop onboarding steps (Nuxt UI). The
// native onboarding is a placeholder for now; see pages/home/index.mobile.ts.
export { default as OnboardingPlaceholderMobilePage } from './ui-mobile/OnboardingPlaceholderMobilePage.vue'
