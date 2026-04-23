import { describe, it, expect } from 'vitest'
import { analyzeEffectiveDraws, analyzeDiscardOptions } from '../src/algorithms/effective-draw'
import type { Tile, Meld } from '../src/types'

function t(suit: string, num: number | null): Tile {
  return { suit: suit as any, number: num, id: `${suit}_${num}_t${Math.random().toString(36).slice(2, 6)}` }
}

describe('有效进张分析', () => {

  // ===== Phase 1: 纯摸牌有效进张 =====

  it('听牌手牌：有效进张就是胡牌', () => {
    // 123条 456条 789条 11筒 + 红中 = 13张，听牌(shanten=0)
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('dot', 5),
    ]
    const result = analyzeEffectiveDraws(hand)
    expect(result.currentShanten).toBe(0)
    // 听牌时有效进张 = 能胡的牌（shantenAfter = -1）
    expect(result.effectiveDraws.length).toBeGreaterThan(0)
    for (const draw of result.effectiveDraws) {
      expect(draw.shantenAfter).toBe(-1)
      expect(draw.shantenReduction).toBe(1)
    }
  })

  it('一向听：有效进张使向听数从1降到0', () => {
    // 123条 456条 78条 11筒 5万 + 红中 = 12张+1红中=13张
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8),
      t('dot', 1), t('dot', 1),
      t('char', 5),
      t('red_zhong', null),
    ]
    const result = analyzeEffectiveDraws(hand)
    expect(result.currentShanten).toBe(1)
    expect(result.effectiveDraws.length).toBeGreaterThan(0)
    for (const draw of result.effectiveDraws) {
      expect(draw.shantenAfter).toBeLessThan(1)
    }
  })

  it('红中始终是有效进张', () => {
    // 散牌手牌，向听数较高
    const hand = [
      t('bamboo', 1), t('bamboo', 3), t('bamboo', 7),
      t('dot', 2), t('dot', 5), t('dot', 9),
      t('char', 1), t('char', 4), t('char', 6),
      t('char', 9), t('dot', 8), t('bamboo', 5),
      t('char', 2),
    ]
    const result = analyzeEffectiveDraws(hand)
    // 红中应该在有效进张列表中
    const rzDraw = result.effectiveDraws.find(d => d.tile.suit === 'red_zhong')
    expect(rzDraw).toBeDefined()
    expect(rzDraw!.shantenReduction).toBeGreaterThan(0)
  })

  it('已胡牌：没有有效进张', () => {
    // 14张已胡牌
    const hand = [
      t('bamboo', 1), t('bamboo', 1), t('bamboo', 1),
      t('bamboo', 2), t('bamboo', 2), t('bamboo', 2),
      t('bamboo', 3), t('bamboo', 3), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 4), t('bamboo', 4),
      t('red_zhong', null), t('red_zhong', null),
    ]
    const result = analyzeEffectiveDraws(hand)
    expect(result.currentShanten).toBe(-1)
    expect(result.effectiveDraws.length).toBe(0)
  })

  it('有效进张包含正确的剩余张数', () => {
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('dot', 5),
    ]
    const result = analyzeEffectiveDraws(hand)
    // 无牌堆信息时用估算：每种4张减去手牌中已有
    for (const draw of result.effectiveDraws) {
      expect(draw.remainingCount).toBeGreaterThan(0)
      expect(draw.remainingCount).toBeLessThanOrEqual(4)
    }
  })

  it('有副露时正确分析', () => {
    // 10张手牌 + 1碰
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('dot', 1), t('dot', 1),
      t('char', 7), t('char', 8),
    ]
    const melds: Meld[] = [
      { type: 'pong', tile: t('char', 3), fromOpponent: true }
    ]
    const result = analyzeEffectiveDraws(hand, melds)
    // shanten=0 (听牌)，有效进张让shanten=-1
    expect(result.currentShanten).toBe(0)
    // 应该听6万和9万
    const char6 = result.effectiveDraws.find(d => d.tile.suit === 'char' && d.tile.number === 6)
    const char9 = result.effectiveDraws.find(d => d.tile.suit === 'char' && d.tile.number === 9)
    expect(char6).toBeDefined()
    expect(char9).toBeDefined()
  })

  it('进张结果包含组合分析', () => {
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('dot', 5),
    ]
    const result = analyzeEffectiveDraws(hand)
    // 至少有些进张带有formedCombinations
    const withCombos = result.effectiveDraws.filter(d => d.formedCombinations.length > 0)
    expect(withCombos.length).toBeGreaterThan(0)
  })

  // ===== Phase 2: 打-摸联动 =====

  it('打摸联动：14张手牌分析打牌选项', () => {
    // 14张手牌（刚摸完牌）
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('dot', 5),
      t('char', 9), // 第14张，散牌
    ]
    const result = analyzeDiscardOptions(hand)
    expect(result.options.length).toBeGreaterThan(0)
    expect(result.bestDiscard).toBeDefined()
    // 最优打法的有效进张应该最多
    for (const opt of result.options.slice(1)) {
      expect(result.bestDiscard.shantenAfter).toBeLessThanOrEqual(opt.shantenAfter)
    }
  })

  it('打摸联动：不推荐打出会升高向听数的牌', () => {
    const hand = [
      t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('dot', 5),
      t('char', 9),
    ]
    const result = analyzeDiscardOptions(hand)
    const currentShanten = 0 // 听牌
    // 所有推荐选项的向听数不应高于当前
    for (const opt of result.options) {
      expect(opt.shantenAfter).toBeLessThanOrEqual(currentShanten)
    }
  })

  it('打摸联动：去重相同牌种', () => {
    const hand = [
      t('bamboo', 1), t('bamboo', 1), t('bamboo', 2), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 5), t('bamboo', 6),
      t('bamboo', 7), t('bamboo', 8), t('bamboo', 9),
      t('dot', 1), t('dot', 1),
      t('red_zhong', null),
      t('char', 9),
    ]
    const result = analyzeDiscardOptions(hand)
    // 不应有两个相同牌种的选项
    const keys = result.options.map(o => `${o.discard.suit}_${o.discard.number}`)
    const unique = new Set(keys)
    expect(keys.length).toBe(unique.size)
  })
})
