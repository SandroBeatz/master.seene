export type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './model/types'
export type { AppointmentDateRange, AppointmentDayCountsRange } from './model/appointment.queries'
export {
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useRemoveAppointmentMutation,
  useActionableAppointmentsQuery,
  useNextAppointmentQuery,
  useClientAppointmentsCountQuery,
  useClientAppointmentsQuery,
  useAppointmentDayCountsQuery,
} from './model/appointment.queries'
export {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
  listActionableAppointments,
  getNextAppointment,
  countClientAppointments,
  listClientAppointments,
  listAppointmentDayCounts,
} from './api/appointments.api'
export type { AppointmentDayCount } from './api/appointments.api'
export { APPOINTMENT_STATUS_VIEW } from './config/status'
export type { AppointmentStatusViewConfig } from './config/status'
export {
  isGroupAppointment,
  getAppointmentServiceColors,
  getAppointmentAccentColor,
  getAppointmentStatusIcon,
} from './lib/appearance'
export type { ServiceColorRef } from './lib/appearance'
export { collectDayBusyIntervals, timeBlockToBusyInterval } from './model/busy-intervals'
export type { CollectBusyIntervalsInput } from './model/busy-intervals'
export { lastVisitDate } from './lib/last-visit'
