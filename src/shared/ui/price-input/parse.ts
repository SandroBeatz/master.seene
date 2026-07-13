/**
 * Pure helpers for the PriceInput field. Kept separate from the component so the
 * sanitisation rules can be unit-tested without mounting Vue.
 */

/**
 * Sanitises raw keyboard input into a valid price string:
 * - strips anything that is not a digit or a decimal separator;
 * - drops the fraction entirely for zero-decimal currencies (KZT, RUB, …);
 * - normalises a decimal comma to a dot, keeps a single separator, and clamps
 *   the number of fraction digits to the currency's `decimals`.
 */
export function sanitizePrice(raw: string, decimals: number): string {
  const cleaned = raw.replace(/[^\d.,]/g, '')
  if (decimals <= 0) return cleaned.replace(/[.,]/g, '')

  const normalized = cleaned.replace(/,/g, '.')
  const firstDot = normalized.indexOf('.')
  if (firstDot === -1) return normalized

  const intPart = normalized.slice(0, firstDot)
  const frac = normalized
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, decimals)
  return `${intPart}.${frac}`
}

/** Converts a sanitised price string to a number, or null when it isn't a value yet. */
export function priceToNumber(cleaned: string): number | null {
  if (cleaned === '' || cleaned === '.') return null
  const value = Number(cleaned)
  return Number.isNaN(value) ? null : value
}
