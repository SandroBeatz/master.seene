export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  user_id: string
  client_id: string
  service_ids: string[]
  start_at: string
  duration: number
  price: number | null
  status: AppointmentStatus
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
