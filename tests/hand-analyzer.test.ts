import { describe, it, expect } from 'vitest'
import { analyzeWaiting, checkWin } from '../src/algorithms/hand-analyzer'

describe('胡牌检测', () => {
  it('测试简单胡牌：111222333444红中', () => {
    // 111刻子 222刻子 333刻子 444刻子 红中替代任何一张
    const hand = [
      { suit: 'bamboo', number: 1, id: '1' },
      { suit: 'bamboo', number: 1, id: '2' },
      { suit: 'bamboo', number: 1, id: '3' },
      { suit: 'bamboo', number: 2, id: '4' },
      { suit: 'bamboo', number: 2, id: '5' },
      { suit: 'bamboo', number: 2, id: '6' },
      { suit: 'bamboo', number: 3, id: '7' },
      { suit: 'bamboo', number: 3, id: '8' },
      { suit: 'bamboo', number: 3, id: '9' },
      { suit: 'bamboo', number: 4, id: '10' },
      { suit: 'bamboo', number: 4, id: '11' },
      { suit: 'bamboo', number: 4, id: '12' },
      { suit: 'red_zhong', number: null, id: '13' },
      { suit: 'red_zhong', number: null, id: '14' },
    ]
    expect(checkWin(hand)).toBe(true)
  })

  it('测试BUG：6条8条8条2万3万3万6万7万8万5筒9筒9筒红中红中 不应胡牌', () => {
    const hand = [
      { suit: 'bamboo', number: 6, id: 'b6' },
      { suit: 'bamboo', number: 8, id: 'b8a' },
      { suit: 'bamboo', number: 8, id: 'b8b' },
      { suit: 'char', number: 2, id: 'c2' },
      { suit: 'char', number: 3, id: 'c3a' },
      { suit: 'char', number: 3, id: 'c3b' },
      { suit: 'char', number: 6, id: 'c6' },
      { suit: 'char', number: 7, id: 'c7' },
      { suit: 'char', number: 8, id: 'c8' },
      { suit: 'dot', number: 5, id: 'd5' },
      { suit: 'dot', number: 9, id: 'd9a' },
      { suit: 'dot', number: 9, id: 'd9b' },
      { suit: 'red_zhong', number: null, id: 'rz1' },
      { suit: 'red_zhong', number: null, id: 'rz2' },
    ]
    const result = checkWin(hand)
    console.log('checkWin result:', result)
    // 这手牌无论怎么组合都无法形成 4面子+1对子
    expect(result).toBe(false)
  })

  it('测试BUG2：5条6条1万2万3万8万9万4筒5筒6筒8筒9筒红中 不应听牌', () => {
    // 手牌13张，3组不完整的2张序列跨花色 + 1红中，无法凑齐4面子+1对子
    const hand = [
      { suit: 'bamboo', number: 5, id: 'b5' },
      { suit: 'bamboo', number: 6, id: 'b6' },
      { suit: 'char', number: 1, id: 'c1' },
      { suit: 'char', number: 2, id: 'c2' },
      { suit: 'char', number: 3, id: 'c3' },
      { suit: 'char', number: 8, id: 'c8' },
      { suit: 'char', number: 9, id: 'c9' },
      { suit: 'dot', number: 4, id: 'd4' },
      { suit: 'dot', number: 5, id: 'd5' },
      { suit: 'dot', number: 6, id: 'd6' },
      { suit: 'dot', number: 8, id: 'd8' },
      { suit: 'dot', number: 9, id: 'd9' },
      { suit: 'red_zhong', number: null, id: 'rz1' },
    ]
    const result = analyzeWaiting(hand)
    console.log('听牌结果(应为空):', result.waitingTiles.map(t => `${t.suit}_${t.number}`))
    // 这手牌无论摸什么都无法胡：3组不完整跨花色+1红中，永远有散牌
    expect(result.isReady).toBe(false)
    expect(result.waitingCount).toBe(0)
  })

  it('测试BUG3：1条3条789条11筒3筒6筒红中(10张+1副露) 不应听牌', () => {
    // 手牌10张 + 1副露 = 13张，缺口太多只有1赖子
    const hand = [
      { suit: 'bamboo', number: 1, id: 'b1' },
      { suit: 'bamboo', number: 3, id: 'b3' },
      { suit: 'bamboo', number: 7, id: 'b7' },
      { suit: 'bamboo', number: 8, id: 'b8' },
      { suit: 'bamboo', number: 9, id: 'b9' },
      { suit: 'dot', number: 1, id: 'd1a' },
      { suit: 'dot', number: 1, id: 'd1b' },
      { suit: 'dot', number: 3, id: 'd3' },
      { suit: 'dot', number: 6, id: 'd6' },
      { suit: 'red_zhong', number: null, id: 'rz1' },
    ]
    const melds = [{ type: 'pong', tile: { suit: 'char', number: 5, id: 'm1' }, fromOpponent: true }]
    const result = analyzeWaiting(hand, melds as any)
    console.log('BUG3听牌结果:', result.waitingTiles.map((t: any) => `${t.suit}_${t.number}`))
    expect(result.isReady).toBe(false)
  })

  it('测试听牌：13张听牌', () => {
    // 听3万
    const hand = [
      { suit: 'bamboo', number: 3, id: '1' },
      { suit: 'bamboo', number: 4, id: '2' },
      { suit: 'bamboo', number: 5, id: '3' },
      { suit: 'character', number: 1, id: '4' },
      { suit: 'character', number: 2, id: '5' },
      { suit: 'dot', number: 1, id: '6' },
      { suit: 'dot', number: 1, id: '7' },
      { suit: 'dot', number: 2, id: '8' },
      { suit: 'dot', number: 5, id: '9' },
      { suit: 'dot', number: 6, id: '10' },
      { suit: 'red_zhong', number: null, id: '11' },
      { suit: 'red_zhong', number: null, id: '12' },
      { suit: 'red_zhong', number: null, id: '13' },
    ]

    const result = analyzeWaiting(hand)
    console.log('听牌结果:', result)
    expect(result.isReady).toBe(true)
    expect(result.waitingCount).toBeGreaterThan(0)
  })

  it('测试红中单杠副露在红中杠麻模式下的胡牌检测', () => {
    // 手牌 11 张，已有 1 个碰副露（碰3万），另外有 1 个红中杠副露（红中单杠）
    // 常规手牌 11 张 + 常规副露 3 张 = 14 张
    const hand = [
      { suit: 'bamboo', number: 1, id: '1' },
      { suit: 'bamboo', number: 1, id: '2' },
      { suit: 'bamboo', number: 1, id: '3' },
      { suit: 'bamboo', number: 2, id: '4' },
      { suit: 'bamboo', number: 2, id: '5' },
      { suit: 'bamboo', number: 2, id: '6' },
      { suit: 'bamboo', number: 3, id: '7' },
      { suit: 'bamboo', number: 3, id: '8' },
      { suit: 'bamboo', number: 3, id: '9' },
      { suit: 'bamboo', number: 4, id: '10' },
      { suit: 'bamboo', number: 4, id: '11' }, // 将牌
    ]
    const melds = [
      { type: 'pong', tile: { suit: 'char', number: 3, id: 'm1' }, fromOpponent: true },
      { type: 'red_zhong_gang', tile: { suit: 'red_zhong', number: null, id: 'm2' }, fromOpponent: false },
    ]
    // 应当判定为可以胡牌（11张手牌加上碰3万的副露，忽略红中单杠）
    const won = checkWin(hand, melds as any)
    expect(won).toBe(true)
    
    // 如果是 10 张手牌，碰3万，红中杠，应当判定为听牌（等 4 条）
    const hand10 = [
      { suit: 'bamboo', number: 1, id: '1' },
      { suit: 'bamboo', number: 1, id: '2' },
      { suit: 'bamboo', number: 1, id: '3' },
      { suit: 'bamboo', number: 2, id: '4' },
      { suit: 'bamboo', number: 2, id: '5' },
      { suit: 'bamboo', number: 2, id: '6' },
      { suit: 'bamboo', number: 3, id: '7' },
      { suit: 'bamboo', number: 3, id: '8' },
      { suit: 'bamboo', number: 3, id: '9' },
      { suit: 'bamboo', number: 4, id: '10' }, // 缺一张4条做将
    ]
    const ready = analyzeWaiting(hand10, melds as any)
    expect(ready.isReady).toBe(true)
    expect(ready.waitingTiles.some(t => t.suit === 'bamboo' && t.number === 4)).toBe(true)
  })
})
