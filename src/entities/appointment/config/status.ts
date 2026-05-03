import type { ButtonProps } from '@nuxt/ui'
import type { AppointmentStatus } from '../model/types'

export interface AppointmentStatusViewConfig {
  icon: string
  color: NonNullable<ButtonProps['color']>
  calendar: {
    borderColor: string
    backgroundColor: string
  }
}

export const APPOINTMENT_STATUS_VIEW: Record<AppointmentStatus, AppointmentStatusViewConfig> = {
  pending: {
    icon: 'i-lucide-clock-4',
    color: 'warning',
    calendar: {
      borderColor: '#f97316',
      backgroundColor: '#fff7ed',
    },
  },
  confirmed: {
    icon: 'i-lucide-check',
    color: 'primary',
    calendar: {
      borderColor: '#a78bfa',
      backgroundColor: '#f5f3ff',
    },
  },
  completed: {
    icon: 'i-lucide-check-check',
    color: 'success',
    calendar: {
      borderColor: '#22c55e',
      backgroundColor: '#f0fdf4',
    },
  },
  cancelled: {
    icon: 'i-lucide-circle-x',
    color: 'error',
    calendar: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
    },
  },
  no_show: {
    icon: 'i-lucide-ban',
    color: 'neutral',
    calendar: {
      borderColor: '#64748b',
      backgroundColor: '#f8fafc',
    },
  },
}
