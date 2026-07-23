export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired'

/**
 * Status as shown in the UI, extended with two states derived from the current
 * time (never persisted): `ongoing` (now inside the appointment window) and
 * `past` (a confirmed appointment whose end time has passed but was not marked
 * completed). See `getEffectiveAppointmentStatus`.
 */
export type EffectiveAppointmentStatus = AppointmentStatus | 'ongoing' | 'past'

/** Where the appointment originated. */
export type AppointmentSource = 'manual' | 'online_booking'

export interface Appointment {
  id: string
  user_id: string
  client_id: string
  service_ids: string[]
  start_at: string
  duration: number
  price: number | null
  status: AppointmentStatus
  source: AppointmentSource
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateAppointmentDto {
  client_id: string
  service_ids: string[]
  start_at: string
  duration: number
  price?: number | null
  notes?: string | null
  status?: AppointmentStatus
  source?: AppointmentSource
}

export interface UpdateAppointmentDto {
  id: string
  client_id?: string
  service_ids?: string[]
  start_at?: string
  duration?: number
  price?: number | null
  status?: AppointmentStatus
  notes?: string | null
}
