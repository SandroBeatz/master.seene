import {
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  hourglassOutline,
  timeOutline,
} from 'ionicons/icons'
import type { EffectiveAppointmentStatus } from '../model/types'

export interface MobileAppointmentStatusIcon {
  icon: string
  /** Ionic color name for `ion-icon[color]`. */
  color: 'warning' | 'tertiary' | 'success' | 'medium'
}

// Ionicons counterpart of the desktop Lucide status icons in config/status.ts.
export function getMobileAppointmentStatusIcon(
  status: EffectiveAppointmentStatus,
): MobileAppointmentStatusIcon {
  switch (status) {
    case 'pending':
      return { icon: timeOutline, color: 'warning' }
    case 'confirmed':
      return { icon: checkmarkCircleOutline, color: 'tertiary' }
    case 'ongoing':
      return { icon: hourglassOutline, color: 'success' }
    case 'completed':
      return { icon: checkmarkDoneOutline, color: 'success' }
    default:
      return { icon: checkmarkDoneOutline, color: 'medium' }
  }
}
