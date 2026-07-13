import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockEq, mockSelect, mockInsert, mockUpdate, mockDelete, mockSingle, mockFrom } =
  vi.hoisted(() => {
    const mockOrder = vi.fn()
    const mockEq = vi.fn()
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockUpdate = vi.fn()
    const mockDelete = vi.fn()
    const mockSingle = vi.fn()
    const mockFrom = vi.fn()

    const builder = {
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      single: mockSingle,
    }

    mockSelect.mockReturnValue(builder)
    mockEq.mockReturnValue(builder)
    mockOrder.mockReturnValue(builder)
    mockInsert.mockReturnValue(builder)
    mockUpdate.mockReturnValue(builder)
    mockDelete.mockReturnValue(builder)
    mockFrom.mockReturnValue(builder)

    return { mockOrder, mockEq, mockSelect, mockInsert, mockUpdate, mockDelete, mockSingle, mockFrom }
  })

vi.mock('@shared/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

import {
  listServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from '../api/service-categories.api'

const mockCategories = [
  { id: 'cat-1', name: 'Hair' },
  { id: 'cat-2', name: 'Nails' },
]

// Restore the chainable defaults after clearAllMocks so terminal methods
// (order/single/eq) can be overridden per test.
function resetBuilder() {
  const builder = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    single: mockSingle,
  }
  mockSelect.mockReturnValue(builder)
  mockEq.mockReturnValue(builder)
  mockOrder.mockReturnValue(builder)
  mockInsert.mockReturnValue(builder)
  mockUpdate.mockReturnValue(builder)
  mockDelete.mockReturnValue(builder)
  mockFrom.mockReturnValue(builder)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetBuilder()
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

describe('createServiceCategory', () => {
  it('appends the category at sort_order = existing count', async () => {
    // Count query resolves via the terminal `eq`; insert chain via `single`.
    mockEq.mockResolvedValueOnce({ count: 2, error: null })
    mockSingle.mockResolvedValue({ data: { id: 'cat-3', name: 'Skin' }, error: null })

    const result = await createServiceCategory('user-1', { name: 'Skin' })

    expect(mockFrom).toHaveBeenCalledWith('service_category')
    expect(mockInsert).toHaveBeenCalledWith({ name: 'Skin', user_id: 'user-1', sort_order: 2 })
    expect(result).toEqual({ id: 'cat-3', name: 'Skin' })
  })

  it('defaults sort_order to 0 when count is null', async () => {
    mockEq.mockResolvedValueOnce({ count: null, error: null })
    mockSingle.mockResolvedValue({ data: { id: 'cat-1', name: 'Hair' }, error: null })

    await createServiceCategory('user-1', { name: 'Hair' })

    expect(mockInsert).toHaveBeenCalledWith({ name: 'Hair', user_id: 'user-1', sort_order: 0 })
  })

  it('throws when the count query fails', async () => {
    mockEq.mockResolvedValueOnce({ count: null, error: new Error('count failed') })

    await expect(createServiceCategory('user-1', { name: 'X' })).rejects.toThrow('count failed')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('throws when the insert fails', async () => {
    mockEq.mockResolvedValueOnce({ count: 0, error: null })
    mockSingle.mockResolvedValue({ data: null, error: new Error('insert failed') })

    await expect(createServiceCategory('user-1', { name: 'X' })).rejects.toThrow('insert failed')
  })
})

describe('updateServiceCategory', () => {
  it('updates only the name and returns the row', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'cat-1', name: 'Renamed' }, error: null })

    const result = await updateServiceCategory({ id: 'cat-1', name: 'Renamed' })

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(mockEq).toHaveBeenCalledWith('id', 'cat-1')
    expect(result).toEqual({ id: 'cat-1', name: 'Renamed' })
  })

  it('throws on supabase error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('update failed') })

    await expect(updateServiceCategory({ id: 'cat-1', name: 'X' })).rejects.toThrow('update failed')
  })
})

describe('deleteServiceCategory', () => {
  it('deletes by id', async () => {
    mockEq.mockResolvedValueOnce({ error: null })

    await deleteServiceCategory('cat-1')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'cat-1')
  })

  it('throws on supabase error', async () => {
    mockEq.mockResolvedValueOnce({ error: new Error('delete failed') })

    await expect(deleteServiceCategory('cat-1')).rejects.toThrow('delete failed')
  })
})
