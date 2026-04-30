export type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './model/types'
export type { AppointmentDateRange } from './model/appointment.queries'
export {
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useRemoveAppointmentMutation,
} from './model/appointment.queries'
export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
} from './api/appointments.api'
