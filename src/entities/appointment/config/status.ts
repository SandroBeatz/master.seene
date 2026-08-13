import type { ButtonProps } from '@nuxt/ui'
import type { AppointmentStatus, EffectiveAppointmentStatus } from '../model/types'

export interface AppointmentStatusViewConfig {
  icon: string
  color: NonNullable<ButtonProps['color']>
  /** i18n key for the human-readable status label (e.g. the popup status pill). */
  labelKey: string
  calendar: {
    borderColor: string
    backgroundColor: string
  }
}

export const APPOINTMENT_STATUS_VIEW: Record<AppointmentStatus, AppointmentStatusViewConfig> = {
  pending: {
    icon: 'i-lucide-clock-alert',
    color: 'warning',
    labelKey: 'appointments.status.pending',
    calendar: {
      borderColor: '#f97316',
      backgroundColor: '#fff7ed',
    },
  },
  confirmed: {
    icon: 'i-lucide-clock-check',
    color: 'primary',
    labelKey: 'appointments.status.confirmed',
    calendar: {
      borderColor: '#a78bfa',
      backgroundColor: '#f5f3ff',
    },
  },
  completed: {
    icon: 'i-lucide-check-check',
    color: 'success',
    labelKey: 'appointments.status.completed',
    calendar: {
      borderColor: '#22c55e',
      backgroundColor: '#f0fdf4',
    },
  },
  cancelled: {
    icon: 'i-lucide-x',
    color: 'neutral',
    labelKey: 'appointments.status.cancelled',
    calendar: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
    },
  },
  no_show: {
    icon: 'i-lucide-user-x',
    color: 'error',
    labelKey: 'appointments.status.no_show',
    calendar: {
      borderColor: '#64748b',
      backgroundColor: '#f8fafc',
    },
  },
  expired: {
    icon: 'i-lucide-clock-x',
    color: 'neutral',
    labelKey: 'appointments.status.expired',
    calendar: {
      borderColor: '#94a3b8',
      backgroundColor: '#f8fafc',
    },
  },
}

/**
 * View config keyed by the time-derived effective status. Extends
 * `APPOINTMENT_STATUS_VIEW` with the two frontend-only states:
 * - `ongoing`  — the appointment is happening right now (green accent).
 * - `past`     — a confirmed appointment whose end time passed uncompleted.
 */
export const EFFECTIVE_APPOINTMENT_STATUS_VIEW: Record<
  EffectiveAppointmentStatus,
  AppointmentStatusViewConfig
> = {
  ...APPOINTMENT_STATUS_VIEW,
  ongoing: {
    icon: 'i-lucide-clock-fading',
    color: 'success',
    labelKey: 'appointments.status.ongoing',
    calendar: {
      borderColor: '#16a34a',
      backgroundColor: '#f0fdf4',
    },
  },
  past: {
    icon: 'i-lucide-check',
    color: 'neutral',
    labelKey: 'appointments.status.past',
    calendar: {
      borderColor: '#94a3b8',
      backgroundColor: '#f8fafc',
    },
  },
}
