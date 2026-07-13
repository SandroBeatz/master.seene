export interface Client {
  id: string
  user_id: string
  phone: string
  first_name: string
  last_name: string | null
  email: string | null
  birthday: string | null // ISO date YYYY-MM-DD
  notes: string | null
  emoji: string | null // optional emoji used as avatar (falls back to initials)
  is_favorite: boolean // favorites are listed first
  source: string
  created_at: string
  updated_at: string
}

export type CreateClientDto = Omit<
  Client,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'emoji' | 'is_favorite'
> & { emoji?: string | null; is_favorite?: boolean }
export type UpdateClientDto = Partial<CreateClientDto> & { id: string }
