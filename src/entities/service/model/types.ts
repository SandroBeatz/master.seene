export interface ServiceCategory {
  id: string
  name: string
}

export interface Service {
  id: string
  user_id: string
  category_id: string | null
  name: string
  description: string | null
  duration: number
  price: number
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  category?: ServiceCategory | null
}

export type CreateServiceDto = Omit<Service, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateServiceDto = Partial<CreateServiceDto> & { id: string }
