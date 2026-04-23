// ============================================================
// 听牌换向决策 + 蒙特卡洛模拟器
// 红中麻将规则：无吃、可碰杠、自摸
// ============================================================

import { Tile, SwitchDecision, SimulatorResult, DeckState, TileSuit } from '@/types'
import { createDeck, drawTile } from './deck'
import { analyzeWaiting } from './hand-analyzer'
import { calcProbability } from './probability'

// 换向决策
export function switchDecision(
  hand: Tile[],
  recentDraws: Tile[], // 最近几次摸牌记录
  deck: DeckState
): SwitchDecision {
  const currentWaiting = analyzeWaiting(hand)
  const currentProb = currentWaiting.waitingCount > 0
    ? calcProbability(deck, currentWaiting.waitingTiles).singleDrawProb
    : 0

  // 模拟：将 recentDraws 加入手牌后分析听牌
  const simulatedHand = [...hand, ...recentDraws]
  const newWaiting = analyzeWaiting(simulatedHand)
  const switchProb = newWaiting.waitingCount > 0
    ? calcProbability(deck, newWaiting.waitingTiles).singleDrawProb
    : 0

  const trend = analyzeDrawTrend(recentDraws)

  let shouldSwitch = false
  let reason = ''

  if (trend.type === 'none' || recentDraws.length < 3) {
    shouldSwitch = false
    reason = '无明显趋势，换向意义不大'
  } else if (newWaiting.waitingCount === 0) {
    shouldSwitch = false
    reason = `换向后反而不听牌，当前等${currentWaiting.waitingCount}张，保持`
  } else if (switchProb <= currentProb) {
    shouldSwitch = false
    reason = `换向${(switchProb*100).toFixed(1)}% ≤ 当前${(currentProb*100).toFixed(1)}%，不换`
  } else if (switchProb < currentProb * 1.3) {
    shouldSwitch = false
    reason = '换向提升不足30%，保持当前方向'
  } else if (deck.remainingCount < 20) {
    shouldSwitch = false
    reason = `牌堆浅（${deck.remainingCount}张），换向代价大，不换`
  } else {
    shouldSwitch = true
    const trendName = trend.type === 'pair' ? '成对' : trend.type === 'straight' ? '成顺' : '同花色'
    reason = `recentDraws 呈${trendName}趋势，换向后等${newWaiting.waitingCount}张（${(switchProb*100).toFixed(1)}%）> 当前${currentWaiting.waitingCount}张（${(currentProb*100).toFixed(1)}%），建议换向`
  }

  return {
    shouldSwitch,
    currentDirection: currentWaiting.waitingTiles,
    currentProb,
    switchDirection: newWaiting.waitingTiles,
    switchProb,
    reason,
  }
}

// 分析摸牌趋势
function analyzeDrawTrend(draws: Tile[]): { type: 'pair' | 'straight' | 'same_suit' | 'none'; suit?: TileSuit; count: number } {
  if (draws.length < 2) return { type: 'none', count: 0 }

  const suitCount = new Map<TileSuit, number>()
  for (const t of draws) {
    if (t.suit === TileSuit.RED_ZHONG) continue
    suitCount.set(t.suit, (suitCount.get(t.suit) || 0) + 1)
  }

  let maxSuit: TileSuit | null = null
  let maxCount = 0
  for (const [suit, count] of suitCount) {
    if (count > maxCount) { maxCount = count; maxSuit = suit }
  }

  if (maxCount === 0) return { type: 'none', count: 0 }
  if (maxCount >= 3) return { type: 'straight', suit: maxSuit!, count: maxCount }
  if (maxCount >= 2) return { type: 'pair', suit: maxSuit!, count: maxCount }
  return { type: 'same_suit', suit: maxSuit!, count: maxCount }
}

// 蒙特卡洛模拟器
export function monteCarloSimulator(
  initialHand: Tile[],
  iterations: number = 10000
): { winRate: number; avgDraws: number } {
  let wins = 0
  let totalDraws = 0

  for (let i = 0; i < iterations; i++) {
    const result = simulateOneGame(initialHand)
    if (result.won) { wins++; totalDraws += result.draws }
  }

  return { winRate: wins / iterations, avgDraws: wins > 0 ? totalDraws / wins : Infinity }
}

// 单局模拟
function simulateOneGame(initialHand: Tile[]): { won: boolean; draws: number } {
  let currentDeck = createDeck()
  const handSet = new Set(initialHand.map(t => `${t.suit}_${t.number}`))
  // 从牌堆移除初始手牌中的牌（近似发牌）
  const remaining = currentDeck.tiles.filter(t => !handSet.has(`${t.suit}_${t.number}`))
  currentDeck = { ...currentDeck, tiles: remaining, remainingCount: remaining.length }
  let hand = [...initialHand]

  for (let draws = 0; draws < 100; draws++) {
    if (currentDeck.tiles.length === 0) return { won: false, draws }
    const { tile, deck: newDeck } = drawTile(currentDeck)
    currentDeck = newDeck
    hand.push(tile)
    // 摸到第14张时检查是否听牌（13张+摸的1张=14张）
    if (hand.length === 14) {
      const waiting = analyzeWaiting(hand.slice(0, 13))
      if (waiting.isReady) return { won: true, draws: draws + 1 }
      // 14张没胡，打掉摸的牌
      hand.pop()
    }
  }
  return { won: false, draws: 100 }
}

// 多策略对比
export function compareStrategies(
  initialHand: Tile[],
  iterations: number = 5000
): SimulatorResult {
  const keep = monteCarloSimulator(initialHand, iterations)
  return {
    totalGames: iterations,
    selfWinRate: keep.winRate,
    avgDraws: keep.avgDraws,
    byStrategy: { keep, aggressive: { winRate: 0, avgDraws: Infinity } },
  }
}
