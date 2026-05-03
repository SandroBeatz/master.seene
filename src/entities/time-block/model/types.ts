export interface TimeBlock {
  id: string
  user_id: string
  start_at: string
  end_at: string
  all_day: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateTimeBlockDto {
  start_at: string
  end_at: string
  all_day: boolean
  notes?: string | null
}

export interface UpdateTimeBlockDto {
  id: string
  start_at?: string
  end_at?: string
  all_day?: boolean
  notes?: string | null
}
