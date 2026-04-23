// ============================================================
// 贝叶斯推断：对手手牌概率分析
// ============================================================

import { Tile, BayesianResult, GameAction } from '@/types'

// 贝叶斯推断参数（经验值，需要实际数据校准）
const LIKELIHOOD_PARAMS = {
  // 主动在第R巡打出某牌，对方手里还有该牌的概率
  active: (round: number) => {
    if (round <= 3) return 0.03  // 早期主动打，手里大概率没有
    if (round <= 8) return 0.10 // 中期
    return 0.20                  // 后期，手里已接近听牌
  },
  // 碰后打某牌
  afterPong: (round: number) => 0.18 + round * 0.01,
  // 杠后打某牌
  afterGang: (_round: number) => 0.30,
}

// 先验概率（开局时，对手9张手牌中某牌的数量分布）
function priorDistribution(): { k: number; prob: number }[] {
  // 超几何分布：对手9张手牌，该牌有4张
  // P(有k张) = C(4,k) * C(32,9-k) / C(36,9)
  const total = 4
  const handSize = 9
  const deckSize = 36 // 某种花色9×4=36张

  const results: { k: number; prob: number }[] = []
  let totalWays = binomial(deckSize, handSize)

  for (let k = 0; k <= Math.min(total, handSize); k++) {
    const ways = binomial(total, k) * binomial(deckSize - total, handSize - k)
    results.push({ k, prob: ways / totalWays })
  }

  return results
}

// 后验概率计算
export function bayesianUpdate(
  tile: Tile,
  action: { type: 'active' | 'pong' | 'gang'; round: number },
  priorResults?: { k: number; prob: number }[]
): BayesianResult {
  // 获取先验分布
  const priors = priorResults || priorDistribution()

  // 获取似然函数
  let likelihoodFn: (round: number) => number
  switch (action.type) {
    case 'active': likelihoodFn = LIKELIHOOD_PARAMS.active; break
    case 'pong': likelihoodFn = LIKELIHOOD_PARAMS.afterPong; break
    case 'gang': likelihoodFn = LIKELIHOOD_PARAMS.afterGang; break
  }

  // 计算后验
  const likelihoods = priors.map(p => ({
    k: p.k,
    prior: p.prob,
    likelihood: p.k > 0 ? likelihoodFn(action.round) : 1 - likelihoodFn(action.round),
  }))

  // 归一化
  const unnormalized = likelihoods.map(l => l.prior * l.likelihood)
  const evidence = unnormalized.reduce((a, b) => a + b, 0)

  if (evidence === 0) {
    return {
      tile,
      posteriorProb: 0,
      priorProb: priors[0]?.prob || 0,
      likelihood: 0,
      evidence: 0,
      adjustedDeckCount: 0,
    }
  }

  // 期望值
  const posteriorExpected = likelihoods.reduce((sum, l) => sum + l.k * (l.prior * l.likelihood / evidence), 0)

  // 修正牌堆目标牌数 = 4 × 后验期望
  const adjustedDeckCount = Math.max(0, 4 - Math.round(posteriorExpected))

  return {
    tile,
    posteriorProb: evidence > 0 ? likelihoods.reduce((s, l) => s + (l.prior * l.likelihood / evidence) * (l.k > 0 ? 1 : 0), 0) : 0,
    priorProb: priors.reduce((s, p) => s + p.prob * p.k, 0) / priors.reduce((s, p) => s + p.prob, 0),
    likelihood: likelihoodFn(action.round),
    evidence,
    adjustedDeckCount,
  }
}

// 批量分析对手的出牌序列
export function analyzeOpponentActions(actions: GameAction[]): BayesianResult[] {
  const results: BayesianResult[] = []

  for (const action of actions) {
    if (action.type === 'discard' && action.tile) {
      const result = bayesianUpdate(
        action.tile,
        { type: 'active', round: action.round },
        undefined
      )
      results.push(result)
    }
  }

  return results
}

// 修正牌堆概率（考虑对手手牌）
export function adjustDeckProbability(
  deckTargetCount: number,
  bayesianResults: BayesianResult[]
): number {
  let totalDeduction = 0
  for (const r of bayesianResults) {
    // 每次推断从目标牌数中减去期望值
    totalDeduction += (r.priorProb - r.posteriorProb) * 4
  }
  return Math.max(0, deckTargetCount - totalDeduction)
}

// 组合数
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  let result = 1
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1)
  }
  return result
}
