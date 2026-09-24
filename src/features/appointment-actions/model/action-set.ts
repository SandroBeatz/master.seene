import type { AppointmentStatus, EffectiveAppointmentStatus } from '@entities/appointment'

export type MobileAppointmentMoreAction = 'decline' | 'cancel' | 'no_show'

export type MobileAppointmentMenuAction = 'edit' | MobileAppointmentMoreAction | 'delete'

export type MobileAppointmentFooterAction = 'confirm' | 'complete'

/**
 * Contextual actions used by the Ionic appointment action sheet.
 *
 * Status transitions are exposed only while they are meaningful: a pending
 * request can be declined, while a confirmed appointment can become a no-show.
 */
export function getMobileAppointmentMoreActions(
  status: AppointmentStatus,
): MobileAppointmentMoreAction[] {
  if (status === 'pending') return ['decline']
  if (status === 'confirmed') return ['cancel', 'no_show']
  return []
}

/**
 * Items of the preview's top-right popover: edit first, status transitions in
 * the middle, delete last. Terminal statuses other than `completed` can only
 * be deleted.
 */
export function getMobileAppointmentMenuActions(
  status: AppointmentStatus,
): MobileAppointmentMenuAction[] {
  if (status === 'cancelled' || status === 'no_show' || status === 'expired') return ['delete']
  return ['edit', ...getMobileAppointmentMoreActions(status), 'delete']
}

/**
 * The single prominent button at the bottom of the preview. Pending requests
 * need confirmation; a confirmed appointment asks for completion only once it
 * has started (`ongoing`) or its slot has passed (`past`).
 */
export function getMobileAppointmentFooterAction(
  status: EffectiveAppointmentStatus,
): MobileAppointmentFooterAction | null {
  if (status === 'pending') return 'confirm'
  if (status === 'ongoing' || status === 'past') return 'complete'
  return null
}
