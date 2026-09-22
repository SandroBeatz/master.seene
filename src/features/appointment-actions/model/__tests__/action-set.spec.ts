import { describe, expect, it } from 'vitest'
import { getMobileAppointmentFooterActions, getMobileAppointmentMoreActions } from '../action-set'

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

describe('getMobileAppointmentFooterActions', () => {
  it('puts confirmation or checkout between delete and edit', () => {
    expect(getMobileAppointmentFooterActions('pending')).toEqual({
      primary: 'confirm',
      showDeleteSideAction: true,
      showEditSideAction: true,
    })
    expect(getMobileAppointmentFooterActions('confirmed')).toEqual({
      primary: 'complete',
      showDeleteSideAction: true,
      showEditSideAction: true,
    })
  })

  it('centers edit for completed appointments', () => {
    expect(getMobileAppointmentFooterActions('completed')).toEqual({
      primary: 'edit',
      showDeleteSideAction: true,
      showEditSideAction: false,
    })
  })

  it.each(['cancelled', 'no_show', 'expired'] as const)(
    'only exposes delete for %s appointments',
    (status) => {
      expect(getMobileAppointmentFooterActions(status)).toEqual({
        primary: 'delete',
        showDeleteSideAction: false,
        showEditSideAction: false,
      })
    },
  )
})
