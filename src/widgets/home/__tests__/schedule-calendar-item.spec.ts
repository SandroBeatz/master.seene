import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ScheduleCalendarItem from '../ui/shared/ScheduleCalendarItem.vue'

const dayItem = {
  kind: 'day' as const,
  date: new Date(2026, 6, 23),
  label: 'THU',
  dayNum: '23',
  isToday: false,
}

function mountItem(props: { dots?: number; timeOff?: boolean; selected?: boolean }) {
  const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false })
  return mount(ScheduleCalendarItem, {
    props: { item: dayItem, ...props },
    global: { plugins: [i18n] },
  })
}

const dots = (w: ReturnType<typeof mountItem>) => w.findAll('span.rounded-full')

describe('ScheduleCalendarItem dots', () => {
  it('renders one violet dot per appointment, capped at 5', () => {
    expect(dots(mountItem({ dots: 3 }))).toHaveLength(3)
    expect(dots(mountItem({ dots: 9 }))).toHaveLength(5)
    for (const dot of dots(mountItem({ dots: 3 }))) {
      expect(dot.classes()).toContain('bg-violet-500')
    }
  })

  it('makes the center dot the largest and brightest', () => {
    const rendered = dots(mountItem({ dots: 5 }))
    // Center (index 2) is the biggest/brightest; edges (0, 4) the smallest/faintest.
    expect(rendered[2]!.classes()).toEqual(expect.arrayContaining(['size-1.5', 'opacity-100']))
    expect(rendered[0]!.classes()).toEqual(expect.arrayContaining(['size-1', 'opacity-50']))
    expect(rendered[4]!.classes()).toEqual(expect.arrayContaining(['size-1', 'opacity-50']))
  })

  it('shows a single grey dot for a day with only time off', () => {
    const rendered = dots(mountItem({ dots: 0, timeOff: true }))
    expect(rendered).toHaveLength(1)
    expect(rendered[0]!.classes()).toContain('bg-zinc-400')
  })

  it('prioritises appointments: no grey dot when the day also has appointments', () => {
    const rendered = dots(mountItem({ dots: 2, timeOff: true }))
    expect(rendered).toHaveLength(2)
    for (const dot of rendered) {
      expect(dot.classes()).not.toContain('bg-zinc-400')
    }
  })

  it('shows no dots for an empty day', () => {
    expect(dots(mountItem({ dots: 0, timeOff: false }))).toHaveLength(0)
  })
})
