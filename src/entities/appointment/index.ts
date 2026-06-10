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
  useActionableAppointmentsQuery,
  useNextAppointmentQuery,
} from './model/appointment.queries'
export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
  listActionableAppointments,
  getNextAppointment,
} from './api/appointments.api'
export { APPOINTMENT_STATUS_VIEW } from './config/status'
export type { AppointmentStatusViewConfig } from './config/status'
