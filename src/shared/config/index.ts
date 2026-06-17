const rawBookingUrl = (import.meta.env.VITE_PUBLIC_BOOKING_URL as string | undefined)?.replace(
  /\/+$/,
  '',
)

/** Base URL of the public booking site where a master's profile pages live. */
export const PUBLIC_BOOKING_URL = rawBookingUrl || 'https://seene-six.vercel.app'

/** Host portion without protocol — shown as the username prefix (e.g. seene-six.vercel.app). */
export const PUBLIC_BOOKING_HOST = PUBLIC_BOOKING_URL.replace(/^https?:\/\//, '')

/** Build the public booking page URL for a given username. */
export const bookingPageUrl = (username: string) => `${PUBLIC_BOOKING_URL}/${username}`
