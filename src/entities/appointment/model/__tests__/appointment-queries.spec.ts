import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useUpdateAppointmentMutation } from '../appointment.queries'

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn<(options: { key: unknown[] }) => Promise<void>>(),
  mutationOptions: null as Record<string, unknown> | null,
}))

vi.mock('@pinia/colada', () => ({
  useQuery: vi.fn<(...args: unknown[]) => unknown>(),
  useQueryCache: () => ({ invalidateQueries: mocks.invalidate }),
  useMutation: (options: Record<string, unknown>) => {
    mocks.mutationOptions = options
    return options
  },
}))

vi.mock('../../api/appointments.api', () => ({
  countClientAppointments: vi.fn<() => never>(),
  createAppointment: vi.fn<() => never>(),
  getNextAppointment: vi.fn<() => never>(),
  listActionableAppointments: vi.fn<() => never>(),
  listAppointmentDayCounts: vi.fn<() => never>(),
  listAppointments: vi.fn<() => never>(),
  listClientAppointments: vi.fn<() => never>(),
  removeAppointment: vi.fn<() => never>(),
  updateAppointment: vi.fn<() => never>(),
}))

describe('appointment mutation cache refresh', () => {
  beforeEach(() => {
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
    mocks.mutationOptions = null
  })

  it('refreshes schedule, actionable, day counts, and analytics after an update', async () => {
    useUpdateAppointmentMutation(ref('user-1'))
    const onSettled = mocks.mutationOptions?.onSettled as (() => Promise<unknown>) | undefined

    await onSettled?.()

    expect(mocks.invalidate.mock.calls.map(([options]) => options.key)).toEqual([
      ['appointments', 'user-1'],
      ['appointments-actionable', 'user-1'],
      ['appointment-day-counts', 'user-1'],
      ['analytics-v2'],
    ])
  })
})
