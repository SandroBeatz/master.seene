export type {
  Appointment,
  AppointmentStatus,
  EffectiveAppointmentStatus,
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
export { APPOINTMENT_STATUS_VIEW, EFFECTIVE_APPOINTMENT_STATUS_VIEW } from './config/status'
export type { AppointmentStatusViewConfig } from './config/status'
export {
  isGroupAppointment,
  getAppointmentServiceColors,
  getAppointmentAccentColor,
  getAppointmentStatusIcon,
  getEffectiveAppointmentStatus,
  getEffectiveAppointmentStatusIcon,
  getEffectiveAppointmentStatusView,
  getAppointmentStatusTextColorClass,
} from './lib/appearance'
export type { ServiceColorRef, EffectiveStatusInput } from './lib/appearance'
export { collectDayBusyIntervals, timeBlockToBusyInterval } from './model/busy-intervals'
export type { CollectBusyIntervalsInput } from './model/busy-intervals'
export { lastVisitDate } from './lib/last-visit'
export { isScheduleVisibleAppointment } from './lib/schedule-visibility'
export { buildDaySlots } from './model/day-slots'
export type { DaySlot, DaySlotState } from './model/day-slots'
export { useAppointmentAvailability } from './model/use-appointment-availability'
export type {
  AppointmentAvailability,
  AppointmentAvailabilityOptions,
  DayOccupancy,
  DayTimeOff,
} from './model/use-appointment-availability'
