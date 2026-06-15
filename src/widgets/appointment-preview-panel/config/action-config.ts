import type { ButtonProps } from '@nuxt/ui'
import type { AppointmentStatus } from '@entities/appointment'

/** Action a user can trigger from the appointment preview. */
export type AppointmentActionKey =
  | 'confirm'
  | 'decline'
  | 'complete'
  | 'cancel'
  | 'edit'
  | 'no_show'
  | 'delete'

/** Contextual badge potentially shown for an appointment. Actual visibility is
 *  resolved by the panel against real data (source / isNew / sale). */
export type AppointmentTagKey = 'online_booking' | 'new_client' | 'paid'

export interface AppointmentAction {
  key: AppointmentActionKey
  /** i18n key for the action label. */
  labelKey: string
  icon: string
  color: NonNullable<ButtonProps['color']>
  /** Button/menu-item variant. Primary CTA → 'solid', secondary → 'ghost'. */
  variant?: ButtonProps['variant']
}

export interface AppointmentStatusActions {
  /** Tags to potentially render, in display order. */
  tags: AppointmentTagKey[]
  /** Full-width primary CTA in the footer (omitted → no footer CTA). */
  primary?: AppointmentAction
  /** Secondary, low-emphasis action below the primary CTA. */
  secondary?: AppointmentAction
  /** Items for the header overflow ("…") menu. */
  menu: AppointmentAction[]
}

const CONFIRM: AppointmentAction = {
  key: 'confirm',
  labelKey: 'appointments.preview.confirmAppointment',
  icon: 'i-lucide-check-circle',
  color: 'neutral',
  variant: 'solid',
}

const DECLINE: AppointmentAction = {
  key: 'decline',
  labelKey: 'appointments.preview.declineRequest',
  icon: 'i-lucide-x',
  color: 'error',
  variant: 'ghost',
}

const COMPLETE: AppointmentAction = {
  key: 'complete',
  labelKey: 'appointments.preview.completeCheckout',
  icon: 'i-lucide-badge-check',
  color: 'success',
  variant: 'solid',
}

const CANCEL: AppointmentAction = {
  key: 'cancel',
  labelKey: 'appointments.preview.cancelAppointment',
  icon: 'i-lucide-x-circle',
  color: 'error',
  variant: 'ghost',
}

const EDIT: AppointmentAction = {
  key: 'edit',
  labelKey: 'common.edit',
  icon: 'i-lucide-pencil',
  color: 'neutral',
}

const NO_SHOW: AppointmentAction = {
  key: 'no_show',
  labelKey: 'appointments.preview.markNoShow',
  icon: 'i-lucide-user-x',
  color: 'neutral',
}

const DELETE: AppointmentAction = {
  key: 'delete',
  labelKey: 'common.delete',
  icon: 'i-lucide-trash-2',
  color: 'error',
}

/**
 * Single source of truth for "what to show and which actions are available"
 * per appointment status — drives the preview panel's tags, footer CTA and the
 * header overflow menu. See the design matrix in the epic.
 */
export const APPOINTMENT_ACTION_CONFIG: Record<AppointmentStatus, AppointmentStatusActions> = {
  pending: {
    tags: ['online_booking', 'new_client'],
    primary: CONFIRM,
    secondary: DECLINE,
    menu: [EDIT, DELETE],
  },
  confirmed: {
    tags: ['online_booking', 'new_client'],
    primary: COMPLETE,
    secondary: CANCEL,
    menu: [EDIT, NO_SHOW, DELETE],
  },
  completed: {
    tags: ['paid'],
    menu: [EDIT, DELETE],
  },
  cancelled: {
    tags: [],
    menu: [DELETE],
  },
  no_show: {
    tags: ['new_client'],
    menu: [DELETE],
  },
  expired: {
    tags: ['online_booking'],
    menu: [DELETE],
  },
}
