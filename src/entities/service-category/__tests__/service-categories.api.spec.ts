import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()

  const builder = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
  }

  mockSelect.mockReturnValue(builder)
  mockEq.mockReturnValue(builder)
  mockFrom.mockReturnValue(builder)

  return { mockOrder, mockEq, mockSelect, mockFrom }
})

vi.mock('@shared/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

import { listServiceCategories } from '../api/service-categories.api'

const mockCategories = [
  { id: 'cat-1', name: 'Hair' },
  { id: 'cat-2', name: 'Nails' },
]

beforeEach(() => {
  vi.clearAllMocks()
  const builder = { select: mockSelect, eq: mockEq, order: mockOrder }
  mockSelect.mockReturnValue(builder)
  mockEq.mockReturnValue(builder)
  mockFrom.mockReturnValue(builder)
})

describe('listServiceCategories', () => {
  it('returns categories array on success', async () => {
    mockOrder.mockResolvedValue({ data: mockCategories, error: null })

    const result = await listServiceCategories('user-1')

    expect(mockFrom).toHaveBeenCalledWith('service_category')
    expect(mockSelect).toHaveBeenCalledWith('id, name')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockOrder).toHaveBeenCalledWith('sort_order')
    expect(result).toEqual(mockCategories)
  })

  it('returns empty array when no categories exist', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const result = await listServiceCategories('user-1')

    expect(result).toEqual([])
  })

  it('throws on supabase error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') })

    await expect(listServiceCategories('user-1')).rejects.toThrow('DB error')
  })
})
