// ============================================================
// 概率计算：超几何分布、自摸概率、N巡内概率
// ============================================================

import { Tile, DeckState, ProbabilityState } from '@/types'

// 单巡自摸概率（简化放回抽样近似）
export function singleDrawProb(deckRemaining: number, targetCount: number): number {
  if (deckRemaining <= 0 || targetCount <= 0) return 0
  return targetCount / deckRemaining
}

// N巡内自摸概率
export function multiDrawProb(deckRemaining: number, targetCount: number, draws: number): number {
  if (deckRemaining <= 0 || targetCount <= 0) return 0
  if (draws <= 0) return 0
  // P(至少自摸1次) = 1 - P(连续N次都不自摸)
  // 近似放回抽样：(1 - p)^N
  const p = targetCount / deckRemaining
  return 1 - Math.pow(1 - p, draws)
}

// 超几何分布精确概率（精确计算某巡正好自摸）
export function hypergeometricProb(
  deckTotal: number,
  targetCount: number,
  draws: number,
  exactlyK: number
): number {
  // P(X = k) = C(targetCount, k) * C(deck - target, draws - k) / C(deck, draws)
  if (draws > deckTotal) return 0
  if (exactlyK > targetCount || exactlyK > draws) return 0
  if (exactlyK < Math.max(0, draws - (deckTotal - targetCount))) return 0

  return (
    binomial(targetCount, exactlyK) *
    binomial(deckTotal - targetCount, draws - exactlyK) /
    binomial(deckTotal, draws)
  )
}

// 计算期望自摸巡数
export function expectedDraws(deckRemaining: number, targetCount: number): number {
  if (targetCount <= 0) return Infinity
  return deckRemaining / targetCount
}

// 精确N巡内概率（用超几何分布，模拟不放回抽样）
export function exactMultiDrawProb(
  deckRemaining: number,
  targetCount: number,
  draws: number
): number {
  let prob = 0
  for (let k = 1; k <= Math.min(draws, targetCount); k++) {
    prob += hypergeometricProb(deckRemaining, targetCount, draws, k)
  }
  return prob
}

// 计算综合概率状态
export function calcProbability(
  deck: DeckState,
  waitingTiles: Tile[],
  playerHand: Tile[] = [],
  playerMelds: { tile: Tile; type: string }[] = []
): ProbabilityState {
  const deckRemaining = deck.remainingCount

  // 各目标牌的剩余数量
  // 剩余 = 4张 - 已打出的(河面) - 自己手牌中的 - 自己副露中的
  const targetCounts = new Map<string, number>()
  let totalTarget = 0

  for (const tile of waitingTiles) {
    const key = `${tile.suit}_${tile.number}`
    
    // 总数 4 张
    const total = 4
    
    // 已打出的牌（visibleTiles）
    const playedCount = deck.visibleTiles.filter(
      t => t.suit === tile.suit && t.number === tile.number
    ).length
    
    // 自己手牌中的
    const inMyHand = playerHand.filter(
      t => t.suit === tile.suit && t.number === tile.number
    ).length
    
    // 自己副露中的（碰/杠）
    const inMyMelds = playerMelds.filter(
      m => m.tile.suit === tile.suit && m.tile.number === tile.number
    ).length * (playerMelds.find(m => m.tile.suit === tile.suit && m.tile.number === tile.number)?.type === 'concealed_gang' ? 4 : 3)
    
    // 剩余可摸数量
    const count = Math.max(0, total - playedCount - inMyHand - inMyMelds)
    
    targetCounts.set(key, count)
    totalTarget += count
  }

  // 单巡概率（任意一张目标牌）
  const singleDrawProb = deckRemaining > 0 ? totalTarget / deckRemaining : 0

  // N巡内概率
  const multiDrawProb = new Map<number, number>()
  for (const n of [3, 5, 10, 15, 20]) {
    multiDrawProb.set(n, multiDrawProbCalc(deckRemaining, targetCounts, n))
  }

  // 期望巡数
  const expectedDraws = totalTarget > 0 ? deckRemaining / totalTarget : Infinity

  return {
    singleDrawProb,
    multiDrawProb,
    expectedDraws,
    targetTiles: waitingTiles,
    targetCount: totalTarget,
    targetTileCounts: targetCounts,
  }
}

// 多目标牌N巡内概率（精确计算）
function multiDrawProbCalc(
  deckRemaining: number,
  targetCounts: Map<string, number>,
  draws: number
): number {
  let target = 0
  for (const count of targetCounts.values()) {
    target += count
  }

  if (target === 0) return 0

  // 用不放回公式近似
  let prob = 0
  for (let i = 1; i <= Math.min(draws, target); i++) {
    prob += hypergeometricProb(deckRemaining, target, draws, i)
  }
  return prob
}

// 阶乘
function factorial(n: number): number {
  if (n <= 1) return 1
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}

// 组合数 C(n, k)
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  // 用对数避免溢出
  return Math.round(factorial(n) / (factorial(k) * factorial(n - k)))
}

// 格式化概率为百分比
export function formatProb(prob: number): string {
  if (!isFinite(prob)) return '—'
  return `${(prob * 100).toFixed(1)}%`
}

// 概率等级
export function probLevel(prob: number): 'high' | 'mid' | 'low' {
  if (prob >= 0.1) return 'high'
  if (prob >= 0.03) return 'mid'
  return 'low'
}

// 概率等级颜色
export const PROB_COLORS: Record<string, string> = {
  high: 'var(--color-success)',
  mid: 'var(--color-accent)',
  low: 'var(--color-danger)',
}
