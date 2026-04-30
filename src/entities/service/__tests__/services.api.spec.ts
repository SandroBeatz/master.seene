import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSingle, mockOrder, mockEq, mockSelect, mockInsert, mockUpdate, mockDeleteEq, mockFrom } =
  vi.hoisted(() => {
    const mockSingle = vi.fn()
    const mockOrder = vi.fn()
    const mockDeleteEq = vi.fn()
    const mockEq = vi.fn()
    const mockSelect = vi.fn()
    const mockInsert = vi.fn()
    const mockUpdate = vi.fn()
    const mockFrom = vi.fn()

    const builder = {
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      insert: mockInsert,
      update: mockUpdate,
      single: mockSingle,
      delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
    }

    mockSelect.mockReturnValue(builder)
    mockEq.mockReturnValue(builder)
    mockInsert.mockReturnValue(builder)
    mockUpdate.mockReturnValue(builder)
    mockFrom.mockReturnValue(builder)

    return { mockSingle, mockOrder, mockEq, mockSelect, mockInsert, mockUpdate, mockDeleteEq, mockFrom }
  })

vi.mock('@shared/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

import { listServices, createService, updateService, deleteService } from '../api/services.api'

const mockService = {
  id: 'svc-1',
  user_id: 'user-1',
  category_id: 'cat-1',
  name: 'Haircut',
  description: null,
  duration: 30,
  price: 20,
  is_active: true,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  color: '#a78bfa',
  category: { id: 'cat-1', name: 'Hair' },
}

beforeEach(() => {
  vi.clearAllMocks()
  // Restore chain after clearAllMocks
  const builder = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    insert: mockInsert,
    update: mockUpdate,
    single: mockSingle,
    delete: vi.fn().mockReturnValue({ eq: mockDeleteEq }),
  }
  mockSelect.mockReturnValue(builder)
  mockEq.mockReturnValue(builder)
  mockInsert.mockReturnValue(builder)
  mockUpdate.mockReturnValue(builder)
  mockFrom.mockReturnValue(builder)
})

describe('listServices', () => {
  it('returns services array on success', async () => {
    mockOrder.mockResolvedValue({ data: [mockService], error: null })

    const result = await listServices('user-1')

    expect(mockFrom).toHaveBeenCalledWith('service')
    expect(mockSelect).toHaveBeenCalledWith('*, category:service_category(id, name)')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockOrder).toHaveBeenCalledWith('sort_order')
    expect(result).toEqual([mockService])
  })

  it('throws on supabase error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') })

    await expect(listServices('user-1')).rejects.toThrow('DB error')
  })
})

describe('createService', () => {
  const dto = {
    category_id: 'cat-1',
    name: 'Haircut',
    description: null,
    duration: 30,
    price: 20,
    is_active: true,
    color: '#a78bfa',
    sort_order: 0,
  }

  it('returns created service on success', async () => {
    mockSingle.mockResolvedValue({ data: mockService, error: null })

    const result = await createService('user-1', dto)

    expect(mockFrom).toHaveBeenCalledWith('service')
    expect(mockInsert).toHaveBeenCalledWith({ ...dto, user_id: 'user-1' })
    expect(mockSelect).toHaveBeenCalledWith('*, category:service_category(id, name)')
    expect(mockSingle).toHaveBeenCalled()
    expect(result).toEqual(mockService)
  })

  it('throws on supabase error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('Insert failed') })

    await expect(createService('user-1', dto)).rejects.toThrow('Insert failed')
  })
})

describe('updateService', () => {
  it('returns updated service on success', async () => {
    const updated = { ...mockService, name: 'New Name' }
    mockSingle.mockResolvedValue({ data: updated, error: null })

    const result = await updateService({ id: 'svc-1', name: 'New Name' })

    expect(mockFrom).toHaveBeenCalledWith('service')
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' })
    expect(mockEq).toHaveBeenCalledWith('id', 'svc-1')
    expect(mockSelect).toHaveBeenCalledWith('*, category:service_category(id, name)')
    expect(mockSingle).toHaveBeenCalled()
    expect(result.name).toBe('New Name')
  })

  it('throws on supabase error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('Update failed') })

    await expect(updateService({ id: 'svc-1', name: 'X' })).rejects.toThrow('Update failed')
  })
})

describe('deleteService', () => {
  it('resolves without value on success', async () => {
    mockDeleteEq.mockResolvedValue({ error: null })

    await expect(deleteService('svc-1')).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('service')
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'svc-1')
  })

  it('throws on supabase error', async () => {
    mockDeleteEq.mockResolvedValue({ error: new Error('Delete failed') })

    await expect(deleteService('svc-1')).rejects.toThrow('Delete failed')
  })
})
