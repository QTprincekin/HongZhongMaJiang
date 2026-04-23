import { describe, it, expect } from 'vitest'
import { singleDrawProb, multiDrawProb, expectedDraws } from '@/algorithms/probability'

describe('概率计算', () => {
  it('单巡概率计算', () => {
    expect(singleDrawProb(60, 3)).toBeCloseTo(0.05, 2)
    expect(singleDrawProb(40, 4)).toBeCloseTo(0.1, 2)
    expect(singleDrawProb(60, 0)).toBe(0)
    expect(singleDrawProb(0, 3)).toBe(0)
  })

  it('10巡内自摸概率', () => {
    const p = multiDrawProb(60, 3, 10)
    expect(p).toBeGreaterThan(0.3)
    expect(p).toBeLessThan(0.6)
  })

  it('20巡内自摸概率应大于10巡', () => {
    const p10 = multiDrawProb(60, 3, 10)
    const p20 = multiDrawProb(60, 3, 20)
    expect(p20).toBeGreaterThan(p10)
  })

  it('期望巡数计算', () => {
    expect(expectedDraws(60, 3)).toBeCloseTo(20, 0)
    expect(expectedDraws(40, 4)).toBeCloseTo(10, 0)
    expect(expectedDraws(60, 0)).toBe(Infinity)
  })
})
