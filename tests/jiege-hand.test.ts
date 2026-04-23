import { describe, it, expect } from 'vitest'
import { checkWin } from '../src/algorithms/hand-analyzer'
import { TileSuit } from '../src/types'

describe('杰哥第四副牌型 - 红中替代顺子bug修复验证', () => {
  it('4筒摸牌后应该胡牌', () => {
    // 手牌: 2,2,3,4,5,7,7,8,8,9,红中,1,1,1
    // 组合: 2-2(对)+3-4-5(顺)+7-8-9(顺)+7-8-红中(顺)+1-1-1(刻)
    const hand = [
      { suit: TileSuit.DOT, number: 2, id: 'd2a' },
      { suit: TileSuit.DOT, number: 2, id: 'd2b' },
      { suit: TileSuit.DOT, number: 3, id: 'd3' },
      { suit: TileSuit.DOT, number: 4, id: 'd4' },
      { suit: TileSuit.DOT, number: 5, id: 'd5' },
      { suit: TileSuit.DOT, number: 7, id: 'd7a' },
      { suit: TileSuit.DOT, number: 7, id: 'd7b' },
      { suit: TileSuit.DOT, number: 8, id: 'd8a' },
      { suit: TileSuit.DOT, number: 8, id: 'd8b' },
      { suit: TileSuit.DOT, number: 9, id: 'd9' },
      { suit: TileSuit.RED_ZHONG, number: null, id: 'rz' },
      { suit: TileSuit.BAMBOO, number: 1, id: 'b1a' },
      { suit: TileSuit.BAMBOO, number: 1, id: 'b1b' },
      { suit: TileSuit.BAMBOO, number: 1, id: 'b1c' },
    ]
    expect(checkWin(hand, [])).toBe(true)
  })
})