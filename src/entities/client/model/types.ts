export interface Client {
  id: string
  user_id: string
  phone: string
  first_name: string
  last_name: string | null
  email: string | null
  birthday: string | null // ISO date YYYY-MM-DD
  notes: string | null
  source: string
  created_at: string
  updated_at: string
}

export type CreateClientDto = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateClientDto = Partial<CreateClientDto> & { id: string }
