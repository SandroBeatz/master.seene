import { APPOINTMENT_STATUS_VIEW } from '../config/status'
import type { Appointment, AppointmentStatus } from '../model/types'

/**
 * Minimal service shape this module needs to resolve colors.
 *
 * Declared structurally (instead of importing `Service` from `@entities/service`)
 * to avoid a cross-entity dependency — any `{ color }` map value satisfies it,
 * so both the home timeline (full `Service` objects) and the calendar widget
 * (its own `{ name, color }` summary) can reuse these helpers.
 */
export interface ServiceColorRef {
  color: string
}

/** True when the appointment bundles two or more services ("group" appointment). */
export function isGroupAppointment(appointment: Appointment): boolean {
  return appointment.service_ids.length >= 2
}

/**
 * Colors of the appointment's services, in `service_ids` order.
 * Services that are missing from the map or have no color are skipped.
 */
export function getAppointmentServiceColors(
  appointment: Appointment,
  serviceById: ReadonlyMap<string, ServiceColorRef>,
): string[] {
  return appointment.service_ids
    .map((id) => serviceById.get(id)?.color)
    .filter((color): color is string => Boolean(color))
}

/**
 * Accent color for the appointment's card/event bar.
 *
 * - Single service → that service's color.
 * - Group (2+ services) → `null`, signalling the consumer to fall back to a
 *   neutral/grey treatment ("grey = group" reads at a glance across the app).
 * - Single service without a resolvable color → `null` as well.
 */
export function getAppointmentAccentColor(
  appointment: Appointment,
  serviceById: ReadonlyMap<string, ServiceColorRef>,
): string | null {
  if (isGroupAppointment(appointment)) return null
  const [color] = getAppointmentServiceColors(appointment, serviceById)
  return color ?? null
}

/** Lucide icon name representing the appointment status. */
export function getAppointmentStatusIcon(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_VIEW[status].icon
}
