import type { AppointmentStatus } from '@entities/appointment'

export type MobileAppointmentMoreAction = 'decline' | 'cancel' | 'no_show'

export type MobileAppointmentPrimaryAction = 'confirm' | 'complete' | 'edit' | 'delete'

export interface MobileAppointmentFooterActions {
  primary: MobileAppointmentPrimaryAction
  showDeleteSideAction: boolean
  showEditSideAction: boolean
}

/**
 * Contextual actions used by the Ionic appointment action sheet.
 *
 * The stored status is intentionally used here. Effective states such as
 * `past` are presentation-only and must not change which mutation is allowed.
 */
export function getMobileAppointmentMoreActions(
  status: AppointmentStatus,
): MobileAppointmentMoreAction[] {
  if (status === 'pending') return ['decline']
  if (status === 'confirmed') return ['cancel', 'no_show']
  return []
}

/**
 * Bottom action dock used by the full-screen Ionic preview.
 *
 * Pending and confirmed appointments keep the frequent action prominent in
 * the middle. Completed appointments promote edit to the middle, while other
 * terminal states expose only deletion.
 */
export function getMobileAppointmentFooterActions(
  status: AppointmentStatus,
): MobileAppointmentFooterActions {
  if (status === 'pending') {
    return { primary: 'confirm', showDeleteSideAction: true, showEditSideAction: true }
  }
  if (status === 'confirmed') {
    return { primary: 'complete', showDeleteSideAction: true, showEditSideAction: true }
  }
  if (status === 'completed') {
    return { primary: 'edit', showDeleteSideAction: true, showEditSideAction: false }
  }
  return { primary: 'delete', showDeleteSideAction: false, showEditSideAction: false }
}
