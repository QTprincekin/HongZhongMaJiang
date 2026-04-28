// ============================================================
// 碰牌决策算法 + 碰后杠牌决策
// ============================================================

import { Tile, DeckState, PongDecision, GangDecision, GangDrawAnalysis } from '@/types'
import { analyzeWaiting } from './hand-analyzer'
import { calcProbability } from './probability'
import { formatTile, tilesEqual } from './deck'

// 碰牌决策
export function pongDecision(
  hand: Tile[],
  pongTile: Tile,
  deck: DeckState
): PongDecision {
  // 从手牌移除2张相同的，加上对手的1张 = 碰刻子
  let removed = 0
  const newHandCorrect = hand.filter(t => {
    if (removed < 2 && tilesEqual(t, pongTile)) {
      removed++
      return false
    }
    return true
  }).concat([pongTile])

  // 碰后的听牌分析
  const newWaiting = analyzeWaiting(newHandCorrect)

  // 碰后的概率
  const pongProb = newWaiting.waitingCount > 0
    ? calcProbability(deck, newWaiting.waitingTiles).singleDrawProb
    : 0

  // 不碰时，正常摸牌的概率
  const normalWaiting = analyzeWaiting(hand)
  const noPongProb = normalWaiting.waitingCount > 0
    ? calcProbability(deck, normalWaiting.waitingTiles).singleDrawProb
    : 0

  // 碰后能否杠？（手牌还有该牌 = 碰刻子后还有1张或更多）
  const remainingAfterPong = hand.filter(t => t.suit === pongTile.suit && t.number === pongTile.number).length
  const canGang = remainingAfterPong >= 1 // 碰刻子后还有1张，再摸到第4张可明杠

  // 决策逻辑
  // 碰后只剩1张目标 vs 不碰有3张目标 → 不碰期望更高
  // 但"时间紧迫"时（如牌堆浅），碰可能更安全
  const deckDepth = deck.remainingCount
  const timePressure = deckDepth < 30 // 牌堆浅时，时间成本低

  let shouldPong = false
  let reason = ''

  // 核心判断：碰后等牌数 vs 不碰等牌数
  if (newWaiting.waitingCount === 0) {
    // 碰后不听牌 → 绝对不碰
    shouldPong = false
    reason = `碰后无听牌（等${newWaiting.waitingCount}张），不碰可继续进张`
  } else if (newWaiting.waitingCount >= normalWaiting.waitingCount) {
    // 碰后等牌数 >= 不碰等牌数 → 可以碰
    shouldPong = true
    reason = `碰后等${newWaiting.waitingCount}张，${normalWaiting.waitingCount > 0 ? `不碰等${normalWaiting.waitingCount}张，碰后不亏` : '不碰无听牌，碰后反而有听牌'}`
  } else if (timePressure) {
    // 牌堆浅，时间紧迫
    shouldPong = true
    reason = `牌堆仅剩${deckDepth}张，时间紧迫，碰后等${newWaiting.waitingCount}张，先碰为敬`
  } else {
    // 不碰等牌更多
    shouldPong = false
    reason = `不碰等${normalWaiting.waitingCount}张 > 碰后等${newWaiting.waitingCount}张，长期期望不碰更高`
  }

  return {
    shouldPong,
    pongHand: newHandCorrect,
    pongWaiting: newWaiting,
    pongProb,
    noPongProb,
    reason,
    canGang,
    gangDecision: canGang ? gangDecision(newHandCorrect, pongTile, deck, 'exposed') : undefined,
  }
}

// 杠牌决策 ⭐
export function gangDecision(
  hand: Tile[],
  gangTile: Tile,
  deck: DeckState,
  gangType: 'exposed' | 'concealed'
): GangDecision {
  const deckRemaining = deck.remainingCount

  // 分析杠后补摸
  const gangDrawAnalysis = analyzeGangDraw(deck, gangTile, hand)

  // 杠后手牌（移除4张相同的）
  const newHand = hand.filter(t => {
    if (t.suit !== gangTile.suit || t.number !== gangTile.number) return true
    return false
  })

  // 杠后补摸1张后的手牌（分析期望）
  // 期望 = P(补摸到目标牌) × 直接自摸 + P(补摸改善) × 改善后概率 + P(摸废牌) × 剩余概率
  const gangProb = gangDrawAnalysis.expectedValue

  // 不杠时的期望（正常摸牌）
  const normalWaiting = analyzeWaiting(hand)
  const noGangProb = normalWaiting.waitingCount > 0
    ? calcProbability(deck, normalWaiting.waitingTiles).singleDrawProb
    : 0

  // 决策
  // 牌堆越深，杠的代价越小（跳过1次摸牌的机会成本低）
  // 牌堆越浅，杠的代价越大
  const skipPenalty = noGangProb // 跳过1次摸牌的机会成本
  const adjustedGangProb = gangProb - skipPenalty * 0.5 // 考虑跳过1次摸牌

  let shouldGang = adjustedGangProb >= noGangProb * 0.8 // 阈值
  let reason = ''

  if (gangDrawAnalysis.directWinProb > 0) {
    // 补摸直接自摸概率 > 0
    shouldGang = true
    reason = `补摸直接自摸概率${(gangDrawAnalysis.directWinProb * 100).toFixed(1)}%，值得一杠`
  } else if (deckRemaining > 40) {
    // 牌堆深，杠的代价小
    shouldGang = gangProb >= noGangProb * 0.6
    reason = `牌堆深（${deckRemaining}张），杠后期望${(gangProb * 100).toFixed(1)}% ≈ 正常摸牌${(noGangProb * 100).toFixed(1)}%，可接受`
  } else if (deckRemaining < 15) {
    // 牌堆浅，杠代价大
    shouldGang = gangProb > noGangProb * 1.5 // 需要显著更高才杠
    reason = `牌堆浅（${deckRemaining}张），杠跳过1次摸牌代价大，谨慎`
  } else {
    reason = `杠期望${(gangProb * 100).toFixed(1)}%，不杠${(noGangProb * 100).toFixed(1)}%`
  }

  // 暗杠特殊处理：信息暴露
  if (gangType === 'concealed') {
    reason += `；暗杠不暴露信息，但补摸后需打1张`
  } else {
    reason += `；明杠对手知道你有了${formatTile(gangTile)}`
  }

  return {
    shouldGang,
    gangType,
    handAfterGang: newHand,
    gangProb,
    noGangProb,
    reason,
    gangDrawAnalysis,
  }
}

// 分析杠后补摸的概率分布 ⭐
export function analyzeGangDraw(
  deck: DeckState,
  _gangTile: Tile,
  hand: Tile[]
): GangDrawAnalysis {
  const deckRemaining = deck.remainingCount

  // 目标牌（当前听的牌）
  const waiting = analyzeWaiting(hand)
  const targetCount = waiting.waitingTiles.reduce((sum, t) => {
    return sum + deck.tiles.filter(x => x.suit === t.suit && x.number === t.number).length
  }, 0)

  // 补摸到目标牌的概率
  const directWinProb = deckRemaining > 0
    ? targetCount / deckRemaining
    : 0

  // 补摸改善手牌的概率（摸到凑对/凑顺的牌）
  const improveProb = estimateImproveProb(hand, deck)

  // 补摸废牌的概率
  const neutralProb = Math.max(0, 1 - directWinProb - improveProb)

  // 期望值 = 直接自摸 + 改善后的概率提升
  const improveBoost = improveProb * 0.02 // 改善后平均提升2%概率
  const expectedValue = directWinProb + improveBoost

  return {
    directWinProb,
    improveProb,
    neutralProb,
    expectedValue,
    deckAfterGang: deckRemaining - 1,
  }
}

/**
 * 估算补摸改善手牌的概率
 * 改善 = 摸到的牌能与手牌组成对子/刻子/顺子（使手牌质量提升）
 * 真实概率 = 有用牌剩余张数 / 牌堆剩余张数
 */
function estimateImproveProb(hand: Tile[], deck: DeckState): number {
  const deckRemaining = deck.remainingCount
  if (deckRemaining === 0) return 0

  // 统计各花色手牌分布
  const counts: Record<string, number> = {}
  for (const t of hand) {
    if (t.suit === 'red_zhong') continue
    const key = `${t.suit}_${t.number}`
    counts[key] = (counts[key] || 0) + 1
  }

  let usefulCount = 0

  // 有用牌的定义：摸到后能与手牌形成对子/刻子/顺子的牌
  const countedKeys = new Set<string>()

  for (const t of hand) {
    if (t.suit === 'red_zhong') continue
    const key = `${t.suit}_${t.number}`
    if (countedKeys.has(key)) continue
    countedKeys.add(key)

    const c = counts[key] || 0
    const suit = t.suit
    const num = t.number!

    if (c === 1) {
      // 单张：摸到相同牌成对，或摸到顺子搭子
      usefulCount += countInDeck(deck, { suit, number: num }) // 第2张
      // 顺子搭子：num-1, num+1
      if (num >= 2) usefulCount += countInDeck(deck, { suit, number: num - 1 })
      if (num <= 8) usefulCount += countInDeck(deck, { suit, number: num + 1 })
    } else if (c === 2) {
      // 已成对：摸到第3张成刻
      usefulCount += countInDeck(deck, { suit, number: num })
    }
    // c >= 3 的牌已够刻子，不再计入
  }

  return Math.min(usefulCount / deckRemaining, 1)
}

/** 计算某张牌在牌堆中的剩余张数 */
function countInDeck(deck: DeckState, tile: Partial<Tile> & { suit: string | import('@/types').TileSuit }): number {
  if (tile.suit === 'red_zhong') return 0
  return deck.tiles.filter(t => t.suit === tile.suit && t.number === tile.number).length
}
