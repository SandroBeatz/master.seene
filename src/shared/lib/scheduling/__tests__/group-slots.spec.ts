import { describe, expect, it } from 'vitest'
import { groupSlotsByPartOfDay } from '../group-slots'

describe('groupSlotsByPartOfDay', () => {
  it('splits slots by morning (<12:00), day (12:00–16:59) and evening (>=17:00)', () => {
    // 09:00, 11:30 | 12:00, 16:45 | 17:00, 19:30
    const slots = [540, 690, 720, 1005, 1020, 1170]
    expect(groupSlotsByPartOfDay(slots)).toEqual([
      { part: 'morning', slots: [540, 690] },
      { part: 'day', slots: [720, 1005] },
      { part: 'evening', slots: [1020, 1170] },
    ])
  })

  it('omits empty groups', () => {
    // 08:00 (morning) and 18:00 (evening) only — no midday slots.
    expect(groupSlotsByPartOfDay([480, 1080])).toEqual([
      { part: 'morning', slots: [480] },
      { part: 'evening', slots: [1080] },
    ])
  })

  it('returns an empty array for no slots', () => {
    expect(groupSlotsByPartOfDay([])).toEqual([])
  })

  it('treats exactly 12:00 as day and exactly 17:00 as evening (boundary)', () => {
    expect(groupSlotsByPartOfDay([719, 720, 1019, 1020])).toEqual([
      { part: 'morning', slots: [719] },
      { part: 'day', slots: [720, 1019] },
      { part: 'evening', slots: [1020] },
    ])
  })

  it('preserves the input order within a group', () => {
    expect(groupSlotsByPartOfDay([690, 540])).toEqual([{ part: 'morning', slots: [690, 540] }])
  })
})
