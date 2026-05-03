import { supabase } from '@shared/lib/supabase'
import type { CreateTimeBlockDto, TimeBlock, UpdateTimeBlockDto } from '../model/types'

export async function listTimeBlocks(
  userId: string,
  options?: { from?: string; to?: string },
): Promise<TimeBlock[]> {
  let query = supabase.from('time_block').select('*').eq('user_id', userId).order('start_at')

  if (options?.from) query = query.gte('end_at', options.from)
  if (options?.to) query = query.lte('start_at', options.to)

  const { data, error } = await query
  if (error) throw error
  return data as TimeBlock[]
}

export async function createTimeBlock(userId: string, dto: CreateTimeBlockDto): Promise<TimeBlock> {
  const { data, error } = await supabase
    .from('time_block')
    .insert({ ...dto, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as TimeBlock
}

export async function updateTimeBlock(dto: UpdateTimeBlockDto): Promise<TimeBlock> {
  const { id, ...fields } = dto
  const { data, error } = await supabase
    .from('time_block')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as TimeBlock
}

export async function removeTimeBlock(id: string): Promise<void> {
  const { error } = await supabase.from('time_block').delete().eq('id', id)
  if (error) throw error
}
