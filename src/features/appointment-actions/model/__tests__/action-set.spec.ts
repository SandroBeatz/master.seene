import { describe, expect, it } from 'vitest'
import {
  getMobileAppointmentFooterAction,
  getMobileAppointmentMenuActions,
  getMobileAppointmentMoreActions,
} from '../action-set'

describe('getMobileAppointmentMoreActions', () => {
  it('offers decline for a pending request', () => {
    expect(getMobileAppointmentMoreActions('pending')).toEqual(['decline'])
  })

  it('offers cancel and no-show for a confirmed appointment', () => {
    expect(getMobileAppointmentMoreActions('confirmed')).toEqual(['cancel', 'no_show'])
  })

  it('does not expose status mutations for closed appointments', () => {
    expect(getMobileAppointmentMoreActions('completed')).toEqual([])
    expect(getMobileAppointmentMoreActions('cancelled')).toEqual([])
  })
})

describe('getMobileAppointmentMenuActions', () => {
  it('wraps status transitions between edit and delete', () => {
    expect(getMobileAppointmentMenuActions('pending')).toEqual(['edit', 'decline', 'delete'])
    expect(getMobileAppointmentMenuActions('confirmed')).toEqual([
      'edit',
      'cancel',
      'no_show',
      'delete',
    ])
  })

  it('keeps edit for completed appointments', () => {
    expect(getMobileAppointmentMenuActions('completed')).toEqual(['edit', 'delete'])
  })

  it.each(['cancelled', 'no_show', 'expired'] as const)(
    'only exposes delete for %s appointments',
    (status) => {
      expect(getMobileAppointmentMenuActions(status)).toEqual(['delete'])
    },
  )
})

describe('getMobileAppointmentFooterAction', () => {
  it('asks to confirm a pending request', () => {
    expect(getMobileAppointmentFooterAction('pending')).toBe('confirm')
  })

  it('asks to complete a started or passed appointment', () => {
    expect(getMobileAppointmentFooterAction('ongoing')).toBe('complete')
    expect(getMobileAppointmentFooterAction('past')).toBe('complete')
  })

  it.each(['confirmed', 'completed', 'cancelled', 'no_show', 'expired'] as const)(
    'has no footer action for %s appointments',
    (status) => {
      expect(getMobileAppointmentFooterAction(status)).toBeNull()
    },
  )
})
