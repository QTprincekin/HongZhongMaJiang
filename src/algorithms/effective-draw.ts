// ============================================================
// 有效进张分析：找出所有能降低向听数的牌
// Phase 1: 纯摸牌视角（摸到哪张牌能降低向听数）
// Phase 2: 打-摸联动（打出哪张 → 摸到哪张最优）
// ============================================================

import {
  Tile, TileSuit, Meld, DeckState,
  EffectiveDraw, EffectiveDrawResult,
  FormedCombination,
  DiscardAnalysis, DiscardRecommendation,
} from '@/types'
import { calculateShantenFast } from './shanten'

// ===================== Phase 1: 纯摸牌有效进张 =====================

/**
 * 分析当前手牌的有效进张
 * @param hand 手牌（不含副露中的牌）
 * @param melds 已完成的副露
 * @param deck 当前牌堆状态（用于计算剩余张数）
 * @param playerHand 完整手牌（含手牌中的重复，用于排除已持有的牌）
 */
export function analyzeEffectiveDraws(
  hand: Tile[],
  melds: Meld[] = [],
  deck?: DeckState,
): EffectiveDrawResult {
  // 当前向听数
  const currentShanten = calculateShantenFast(hand, melds)

  // 如果已胡牌，没有有效进张
  if (currentShanten <= -1) {
    return {
      currentShanten,
      effectiveDraws: [],
      totalEffectiveCount: 0,
      acceptanceRate: 0,
    }
  }

  const effectiveDraws: EffectiveDraw[] = []

  // 遍历所有可能的牌种类（27种普通牌 + 红中）
  const allTileTypes = getAllTileTypes()

  for (const candidateTile of allTileTypes) {
    // 计算这张牌在牌堆中还剩几张
    const remaining = deck
      ? countInDeck(deck, candidateTile)
      : estimateRemaining(hand, melds, candidateTile)

    if (remaining <= 0) continue

    // 模拟摸到这张牌后的手牌
    const newHand = [...hand, candidateTile]
    const shantenAfter = calculateShantenFast(newHand, melds)
    const reduction = currentShanten - shantenAfter

    // 有效进张 = 摸到后向听数降低
    if (reduction > 0) {
      // 分析形成的组合（用于UI展示）
      const formedCombinations = analyzeFormedCombinations(hand, candidateTile, melds)

      effectiveDraws.push({
        tile: candidateTile,
        remainingCount: remaining,
        shantenAfter,
        shantenReduction: reduction,
        formedCombinations,
      })
    }
  }

  // 按优先级排序：向听数降低最多 → 剩余张数最多
  effectiveDraws.sort((a, b) => {
    if (a.shantenReduction !== b.shantenReduction) return b.shantenReduction - a.shantenReduction
    return b.remainingCount - a.remainingCount
  })

  const totalEffectiveCount = effectiveDraws.reduce((sum, d) => sum + d.remainingCount, 0)
  const deckRemaining = deck ? deck.remainingCount : 112 - hand.length - melds.length * 3

  return {
    currentShanten,
    effectiveDraws,
    totalEffectiveCount,
    acceptanceRate: deckRemaining > 0 ? totalEffectiveCount / deckRemaining : 0,
  }
}

// ===================== Phase 2: 打-摸联动 =====================

/**
 * 打-摸联动分析：对14张手牌，分析打出每张牌后的有效进张
 * 适用于摸牌后需要出牌的阶段
 * @param hand 手牌（14张，刚摸完牌）
 * @param melds 已完成的副露
 * @param deck 当前牌堆状态
 */
export function analyzeDiscardOptions(
  hand: Tile[],
  melds: Meld[] = [],
  deck?: DeckState,
): DiscardRecommendation {
  const currentShanten = calculateShantenFast(hand, melds)

  // 去重：相同花色+数字的牌只分析一次
  const seen = new Set<string>()
  const options: DiscardAnalysis[] = []

  for (let i = 0; i < hand.length; i++) {
    const discard = hand[i]
    // 不打红中（红中是万能牌，通常不打）
    // 但仍然允许，只是排序时会排后面
    const key = `${discard.suit}_${discard.number}`
    if (seen.has(key)) continue
    seen.add(key)

    // 打出后的手牌
    const handAfterDiscard = [...hand.slice(0, i), ...hand.slice(i + 1)]
    const shantenAfter = calculateShantenFast(handAfterDiscard, melds)

    // 只分析不升高向听数的打法（打出后向听数 <= 当前向听数）
    // 允许向听数不变的打法（横移）
    if (shantenAfter > currentShanten) continue

    // 分析打出后的有效进张
    const drawResult = analyzeEffectiveDraws(handAfterDiscard, melds, deck)

    options.push({
      discard,
      shantenAfter: drawResult.currentShanten,
      effectiveDraws: drawResult.effectiveDraws,
      effectiveCount: drawResult.totalEffectiveCount,
      acceptanceRate: drawResult.acceptanceRate,
    })
  }

  // 排序：向听数最低 → 有效进张最多 → 进张率最高
  options.sort((a, b) => {
    if (a.shantenAfter !== b.shantenAfter) return a.shantenAfter - b.shantenAfter
    if (a.effectiveCount !== b.effectiveCount) return b.effectiveCount - a.effectiveCount
    return b.acceptanceRate - a.acceptanceRate
  })

  return {
    options,
    bestDiscard: options[0] || {
      discard: hand[0],
      shantenAfter: currentShanten,
      effectiveDraws: [],
      effectiveCount: 0,
      acceptanceRate: 0,
    },
  }
}

// ===================== 辅助函数 =====================

/** 生成所有牌种类（27种普通牌 + 红中） */
function getAllTileTypes(): Tile[] {
  const types: Tile[] = []
  for (const suit of [TileSuit.DOT, TileSuit.BAMBOO, TileSuit.CHARACTER]) {
    for (let n = 1; n <= 9; n++) {
      types.push({ suit, number: n, id: `eff_${suit}_${n}` })
    }
  }
  types.push({ suit: TileSuit.RED_ZHONG, number: null, id: 'eff_rz' })
  return types
}

/** 计算某张牌在牌堆中的实际剩余数 */
function countInDeck(deck: DeckState, tile: Tile): number {
  return deck.tiles.filter(t => t.suit === tile.suit && t.number === tile.number).length
}

/** 估算某张牌在牌堆中的剩余数（无牌堆信息时用） */
function estimateRemaining(hand: Tile[], melds: Meld[], tile: Tile): number {
  const total = 4 // 每种牌4张
  // 手牌中已有的数量
  const inHand = hand.filter(t => t.suit === tile.suit && t.number === tile.number).length
  // 副露中已有的数量
  let inMelds = 0
  for (const m of melds) {
    if (m.tile.suit === tile.suit && m.tile.number === tile.number) {
      inMelds += m.type === 'pong' ? 3 : m.type === 'exposed_gang' || m.type === 'concealed_gang' ? 4 : 0
    }
  }
  return Math.max(0, total - inHand - inMelds)
}

/**
 * 分析摸到某张牌后形成的组合（用于UI展示进张效果）
 * 找出摸到的牌与手牌中哪些牌形成了新的面子/搭子
 */
function analyzeFormedCombinations(
  hand: Tile[],
  drawn: Tile,
  _melds: Meld[],
): FormedCombination[] {
  const combinations: FormedCombination[] = []

  // 红中是万能牌，标记特殊
  if (drawn.suit === TileSuit.RED_ZHONG) {
    combinations.push({
      type: 'pair',
      tiles: [drawn],
      drawnTileId: drawn.id,
    })
    return combinations
  }

  const suit = drawn.suit
  const num = drawn.number!

  // 检查是否能形成刻子（手牌中已有2张相同）
  const sameCount = hand.filter(t => t.suit === suit && t.number === num).length
  if (sameCount >= 2) {
    const sameTiles = hand.filter(t => t.suit === suit && t.number === num).slice(0, 2)
    combinations.push({
      type: 'triplet',
      tiles: [...sameTiles, drawn],
      drawnTileId: drawn.id,
    })
  }

  // 检查是否能形成对子（手牌中已有1张相同）
  if (sameCount >= 1) {
    const sameTile = hand.find(t => t.suit === suit && t.number === num)!
    combinations.push({
      type: 'pair',
      tiles: [sameTile, drawn],
      drawnTileId: drawn.id,
    })
  }

  // 检查是否能形成顺子
  {
    // num-2, num-1, num
    if (num >= 3) {
      const t1 = hand.find(t => t.suit === suit && t.number === num - 2)
      const t2 = hand.find(t => t.suit === suit && t.number === num - 1)
      if (t1 && t2) {
        combinations.push({
          type: 'sequence',
          tiles: [t1, t2, drawn],
          drawnTileId: drawn.id,
        })
      }
    }
    // num-1, num, num+1
    if (num >= 2 && num <= 8) {
      const t1 = hand.find(t => t.suit === suit && t.number === num - 1)
      const t2 = hand.find(t => t.suit === suit && t.number === num + 1)
      if (t1 && t2) {
        combinations.push({
          type: 'sequence',
          tiles: [t1, drawn, t2],
          drawnTileId: drawn.id,
        })
      }
    }
    // num, num+1, num+2
    if (num <= 7) {
      const t1 = hand.find(t => t.suit === suit && t.number === num + 1)
      const t2 = hand.find(t => t.suit === suit && t.number === num + 2)
      if (t1 && t2) {
        combinations.push({
          type: 'sequence',
          tiles: [drawn, t1, t2],
          drawnTileId: drawn.id,
        })
      }
    }
  }

  return combinations
}
