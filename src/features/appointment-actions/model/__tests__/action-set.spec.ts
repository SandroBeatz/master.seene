import { describe, expect, it } from 'vitest'
import { getMobileAppointmentMoreActions } from '../action-set'

describe('getMobileAppointmentMoreActions', () => {
  it('offers edit and decline for a pending request', () => {
    expect(getMobileAppointmentMoreActions('pending')).toEqual(['edit', 'decline'])
  })

  it('offers edit and no-show for a confirmed appointment', () => {
    expect(getMobileAppointmentMoreActions('confirmed')).toEqual(['edit', 'no_show'])
  })

  it('does not expose status mutations for closed appointments', () => {
    expect(getMobileAppointmentMoreActions('completed')).toEqual(['edit'])
    expect(getMobileAppointmentMoreActions('cancelled')).toEqual(['edit'])
  })
})
