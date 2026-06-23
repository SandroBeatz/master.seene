import { describe, expect, it } from 'vitest'
import { computeSquareCrop } from '../resize-image'

describe('computeSquareCrop', () => {
  it('returns the whole image when it is already square', () => {
    expect(computeSquareCrop(200, 200)).toEqual({ sx: 0, sy: 0, side: 200 })
  })

  it('crops the sides of a landscape image, keeping it centered', () => {
    expect(computeSquareCrop(300, 200)).toEqual({ sx: 50, sy: 0, side: 200 })
  })

  it('crops the top/bottom of a portrait image, keeping it centered', () => {
    expect(computeSquareCrop(200, 300)).toEqual({ sx: 0, sy: 50, side: 200 })
  })

  it('floors the offset for odd overflow so it never exceeds the source', () => {
    // overflow = 301 - 200 = 101, /2 = 50.5 → floored to 50
    expect(computeSquareCrop(301, 200)).toEqual({ sx: 50, sy: 0, side: 200 })
  })

  it('never produces a negative offset', () => {
    const crop = computeSquareCrop(1, 1000)
    expect(crop.sx).toBeGreaterThanOrEqual(0)
    expect(crop.sy).toBeGreaterThanOrEqual(0)
    expect(crop.side).toBe(1)
  })
})
