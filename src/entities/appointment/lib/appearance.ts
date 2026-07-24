import {
  APPOINTMENT_STATUS_VIEW,
  EFFECTIVE_APPOINTMENT_STATUS_VIEW,
  type AppointmentStatusViewConfig,
} from '../config/status'
import type {
  Appointment,
  AppointmentStatus,
  EffectiveAppointmentStatus,
} from '../model/types'

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

/** Lucide icon name representing the (stored) appointment status. */
export function getAppointmentStatusIcon(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_VIEW[status].icon
}

/** Minimal appointment shape needed to derive the time-based effective status. */
export type EffectiveStatusInput = Pick<Appointment, 'status' | 'start_at' | 'duration'>

/**
 * Effective status shown to the user, derived from the stored status and the
 * current time. Never persisted — computed on the frontend so the database is
 * not polluted with transient states.
 *
 * - Terminal statuses (`completed`/`cancelled`/`no_show`/`expired`) pass through.
 * - `pending`/`confirmed` while `now` is inside the appointment window → `ongoing`.
 * - `confirmed` whose end time has passed (still not completed) → `past`.
 * - A `pending` appointment whose time has passed stays `pending`.
 *
 * Comparison is done on absolute instants (`start_at` is an ISO timestamp),
 * so no timezone conversion is required.
 */
export function getEffectiveAppointmentStatus(
  appointment: EffectiveStatusInput,
  now: Date = new Date(),
): EffectiveAppointmentStatus {
  const { status } = appointment
  if (status !== 'pending' && status !== 'confirmed') return status

  const start = new Date(appointment.start_at).getTime()
  const end = start + appointment.duration * 60_000
  const t = now.getTime()

  if (t >= start && t < end) return 'ongoing'
  if (t >= end && status === 'confirmed') return 'past'
  return status
}

/** Lucide icon name representing the effective (time-derived) status. */
export function getEffectiveAppointmentStatusIcon(
  appointment: EffectiveStatusInput,
  now: Date = new Date(),
): string {
  return EFFECTIVE_APPOINTMENT_STATUS_VIEW[getEffectiveAppointmentStatus(appointment, now)].icon
}

/**
 * Full view config (icon, color, label key) for the effective status — the
 * single source of truth for status pills/badges/icons across the app.
 */
export function getEffectiveAppointmentStatusView(
  appointment: EffectiveStatusInput,
  now: Date = new Date(),
): AppointmentStatusViewConfig {
  return EFFECTIVE_APPOINTMENT_STATUS_VIEW[getEffectiveAppointmentStatus(appointment, now)]
}
