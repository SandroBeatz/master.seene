import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useCompleteSaleMutation, useUpdateSaleDetailsMutation } from '../sale.queries'

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

vi.mock('../../api/sale.api', () => ({
  completeSale: vi.fn<() => never>(),
  getSaleByAppointmentId: vi.fn<() => never>(),
  updateSale: vi.fn<() => never>(),
  updateSaleDetails: vi.fn<() => never>(),
}))

describe('complete sale mutation cache refresh', () => {
  beforeEach(() => {
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
    mocks.mutationOptions = null
  })

  it('refreshes appointment, actionable, analytics, and sale data', async () => {
    useCompleteSaleMutation(ref('user-1'))
    const onSettled = mocks.mutationOptions?.onSettled as
      | ((data: unknown, error: unknown, dto: { appointment_id: string }) => Promise<unknown>)
      | undefined

    await onSettled?.(undefined, undefined, { appointment_id: 'appointment-1' })

    expect(mocks.invalidate.mock.calls.map(([options]) => options.key)).toEqual([
      ['appointments', 'user-1'],
      ['appointments-actionable', 'user-1'],
      ['appointment-day-counts', 'user-1'],
      ['analytics-v2'],
      ['sale-by-appointment', 'appointment-1'],
    ])
  })

  it('refreshes sale, appointment, and analytics after editing sale details', async () => {
    useUpdateSaleDetailsMutation(ref('user-1'))
    const onSettled = mocks.mutationOptions?.onSettled as
      | ((data: unknown, error: unknown, vars: { appointmentId: string }) => Promise<unknown>)
      | undefined

    await onSettled?.(undefined, undefined, { appointmentId: 'appointment-1' })

    expect(mocks.invalidate.mock.calls.map(([options]) => options.key)).toEqual([
      ['sale-by-appointment', 'appointment-1'],
      ['appointments', 'user-1'],
      ['analytics-v2'],
    ])
  })
})
