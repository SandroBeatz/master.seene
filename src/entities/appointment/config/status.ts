import type { ButtonProps } from '@nuxt/ui'
import type { AppointmentStatus } from '../model/types'

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
    icon: 'i-lucide-clock-4',
    color: 'warning',
    labelKey: 'appointments.status.pending',
    calendar: {
      borderColor: '#f97316',
      backgroundColor: '#fff7ed',
    },
  },
  confirmed: {
    icon: 'i-lucide-check',
    color: 'primary',
    labelKey: 'appointments.status.confirmed',
    calendar: {
      borderColor: '#a78bfa',
      backgroundColor: '#f5f3ff',
    },
  },
  completed: {
    icon: 'i-lucide-badge-check',
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
