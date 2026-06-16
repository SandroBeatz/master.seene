/**
 * Specialization codes a master can offer. Mirrors the onboarding set
 * (`onboarding.step1.categories.*`) so the Profile form round-trips with data
 * captured during onboarding. Labels are resolved via i18n at render time.
 */
export const SPECIALIZATION_CODES = [
  'makeup',
  'hair',
  'nails',
  'barber',
  'massage',
  'tattoo_piercing',
  'depilation',
  'cosmetology',
  'brows_lashes',
] as const

export type SpecializationCode = (typeof SPECIALIZATION_CODES)[number]
