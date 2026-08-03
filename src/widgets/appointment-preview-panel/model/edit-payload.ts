/** Fields persisted when the user saves an inline edit from the mobile sheet. */
export interface AppointmentEditPayload {
  id: string
  client_id: string
  service_ids: string[]
  start_at: string
  duration: number
  price: number | null
  /** Present only when a completed appointment's payment method was changed. */
  sale?: { id: string; payment_type_id: string; amount: number }
}
