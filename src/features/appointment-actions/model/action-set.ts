import type { AppointmentStatus } from '@entities/appointment'

export type MobileAppointmentMoreAction = 'edit' | 'decline' | 'no_show'

/**
 * Contextual actions used by the Ionic appointment action sheet.
 *
 * The stored status is intentionally used here. Effective states such as
 * `past` are presentation-only and must not change which mutation is allowed.
 */
export function getMobileAppointmentMoreActions(
  status: AppointmentStatus,
): MobileAppointmentMoreAction[] {
  if (status === 'pending') return ['edit', 'decline']
  if (status === 'confirmed') return ['edit', 'no_show']
  return ['edit']
}
