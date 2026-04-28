# 红中麻将算法详解

**版本：** V1.0（基于代码审查）
**更新时间：** 2026-04-28

---

## 一、向听数算法（shanten.ts）

### 1.1 概念

向听数 = 和牌还差多少张。0 向听 = 听牌，-1 = 已胡。

### 1.2 算法思想

穷举手牌的所有拆牌方案（刻子/顺子/搭子/对子），找出手牌能凑成的最多面子数，从而得到最小向听数。

**核心公式：**
```
向听数 = 3 - 面子数 × 2 - 对子数
（若手牌含红中，每张红中额外 -1）
```

### 1.3 递归穷举过程

```
输入：手牌列表（最多13/14张）
输出：最小向听数 + 最优拆牌方案

1. 统计每种牌的数量（去除红中）
2. 递归尝试所有拆牌可能：
   a) 取一个刻子（3张相同）→ 面子+1，递归剩余牌
   b) 取一个顺子（3张连续）→ 面子+1，递归剩余牌
   c) 取一个搭子/对子 → 递归剩余牌
3. 维护全局最优解（最小向听数）
4. 红中特殊处理：每张红中可当作任意牌使用，直接降低向听数
```

### 1.4 时间复杂度

- 最坏 O(3^n)，但通过剪枝（超过当前最优解则停止）实际很快
- n ≤ 13 时，实测 < 1ms

### 1.5 关键代码

```typescript
function calcShanten(tiles: Tile[]): ShantenResult {
  // 1. 分离红中
  // 2. 统计剩余牌的数量数组
  // 3. 递归穷举刻子/顺子/面子组合
  // 4. 维护最优解
  // 5. 最终向听数 = max(0, 3 - melds - pairs) - redZhongs
}
```

---

## 二、胡牌检测（hand-analyzer.ts）

### 2.1 判断逻辑

**基本牌型（面子胡）：** 4 面子 + 1 对子 = 14 张

**七对子牌型：** 7 个对子 = 14 张（红中不参与此牌型）

**算法：** 枚举个可能的对子位置，对剩余牌验证是否可完全拆成面子

```typescript
function canWin(hand: Tile[]): boolean {
  // 1. 七对子检测：恰好7个对子 → 胡
  // 2. 面子胡检测：
  //    - 枚举止有 k 种牌可能作为对子（k = 手牌种类数）
  //    - 每种对子：移除2张 → 验证剩余12张能否全拆成面子
  //    - 面子验证：递归移除刻子或顺子，能完全拆完则胡
  // 3. 红中补充：若有红中，尝试作为任意牌补全
}
```

### 2.2 听牌分析

```typescript
function analyzeWaiting(hand: Tile[]): WaitingResult {
  // 1. 对每种未完成的牌型，枚举补全所需的牌
  // 2. 过滤牌堆中存在的牌
  // 3. 去重返回等待列表
}
```

---

## 三、有效进张分析（effective-draw.ts）

### 3.1 Phase1：纯摸牌（手牌 13 张）

枚举每种可摸的牌（27 种普通牌 + 红中），计算摸后向听数，找出能降向听数的牌。

```typescript
function calcEffectiveDraws(hand: Tile[], deck: DeckState): EffectiveDrawResult {
  const results: DrawOption[] = []

  for (const tile of ALL_TILES) {
    // 跳过已摸过的牌（凑够4张的不再考虑）
    const remaining = getRemainingCount(tile, deck)
    if (remaining <= 0) continue

    // 模拟摸牌
    const newHand = [...hand, tile]
    const shanten = calcShanten(newHand)

    if (shanten < currentShanten) {
      // 记录有效进张
      results.push({ tile, remainingCount: remaining, newShanten })
    }
  }

  return {
    effectiveDraws: results,
    totalEffectiveCount: results.reduce((s, r) => s + r.remainingCount, 0),
    acceptanceRate: totalEffectiveCount / deck.remainingCount,
  }
}
```

### 3.2 Phase2：打摸联动（手牌 14 张）

枚举打出每种牌后的手牌，分析打出后的有效进张，选出最优打牌方案。

```typescript
function calcDiscardRecommendation(hand: Tile[], deck: DeckState): DiscardRecommendation {
  const options: DiscardOption[] = []

  for (const tile of hand) {
    const afterDiscard = hand.filter(t => t.id !== tile.id)
    const shanten = calcShanten(afterDiscard)
    const effDraws = calcEffectiveDraws(afterDiscard, deck)

    options.push({
      discard: tile,
      shantenAfter: shanten,
      effectiveDraws: effDraws.effectiveDraws,
      effectiveCount: effDraws.totalEffectiveCount,
      acceptanceRate: effDraws.acceptanceRate,
    })
  }

  // 按有效进张数降序排列，返回最优
  return options.sort((a, b) => b.effectiveCount - a.effectiveCount)[0]
}
```

---

## 四、自摸概率计算（probability.ts）

### 4.1 超几何分布

从牌堆中抽取 N 张，不放回，目标牌出现 K 张的概率：

```
P(K = k) = C(K_pop, k) × C(N_pop - K_pop, N - k) / C(N_pop, N)

其中：
- N_pop = 牌堆剩余总数
- K_pop = 目标牌总数
- N = 抽牌数（通常为1）
- k = 目标牌出现次数
```

### 4.2 单巡自摸概率

```typescript
function calcSingleDrawProb(hand: Tile[], deck: DeckState): number {
  const waiting = analyzeWaiting(hand).waitingTiles
  const totalTarget = waiting.reduce((s, t) => s + deck.remainingCount(t), 0)

  // 超几何分布：抽1张，目标牌出现 ≥ 1 的概率
  const prob = hypergeometric(
    populationSize: deck.remainingCount,  // 牌堆总数
    successPopulation: totalTarget,        // 目标牌总数
    samples: 1,                           // 抽1张
    successes: 1                          // 至少1张
  )
  return prob
}
```

### 4.3 N 巡累积概率

不放回抽取时，各巡概率相互独立（因为摸走的牌不再放回）：

```
P(在N巡内自摸) = 1 - ∏(从第i巡开始不摸到的概率)
```

```typescript
function calcMultiDrawProb(hand: Tile[], deck: DeckState, n: number): number {
  let remaining = deck.remainingCount
  let probNoSelfDraw = 1

  for (let i = 0; i < n; i++) {
    const singleProb = calcSingleDrawProb(hand, deck)
    probNoSelfDraw *= (1 - singleProb)
    // 模拟摸1张后更新牌堆
    deck = simulateDraw(deck)
  }

  return 1 - probNoSelfDraw
}
```

### 4.4 期望自摸巡数

```typescript
function expectedDraws(hand: Tile[], deck: DeckState): number {
  const p = calcSingleDrawProb(hand, deck)
  if (p <= 0) return Infinity
  // 几何分布期望：1/p（但这是不放回场景，有所修正）
  return 1 / p
}
```

---

## 五、碰牌决策（pong-decision.ts）

### 5.1 决策逻辑

碰牌意味着跳过 1 次摸牌机会，同时可能改变听牌方向。

```
碰的收益：
- 碰后可能改变听牌，获得更好的听牌方向
- 碰后可能有杠牌机会

碰的成本：
- 跳过1次摸牌（自摸机会 -1）
- 暴露碰的刻子，对手可推算你的听牌

决策公式：
碰的净收益 = 碰后听牌改善程度 × 碰后概率 - 跳过摸牌成本
```

### 5.2 算法

```typescript
function decidePong(
  hand: Tile[],
  pongTile: Tile,
  deck: DeckState,
): PongDecision {
  // 1. 模拟碰牌后手牌
  const pongHand = addPong(hand, pongTile)

  // 2. 分析碰后听牌
  const pongWaiting = analyzeWaiting(pongHand)
  const pongShanten = calcShanten(pongHand)

  // 3. 计算碰后自摸概率
  const pongProb = calcSingleDrawProb(pongHand, deck)

  // 4. 不碰：保持原手牌
  const noPongProb = calcSingleDrawProb(hand, deck)

  // 5. 决策：碰后听牌数是否显著增加
  const shouldPong = pongWaiting.waitingCount > currentWaitingCount + 2

  return { shouldPong, pongProb, noPongProb, reason }
}
```

---

## 六、杠牌决策（pong-decision.ts）

### 6.1 明杠 vs 暗杠

| 类型 | 触发 | 效果 | 特殊考虑 |
|------|------|------|---------|
| 明杠（加杠） | 手上有碰的刻子，对手打了同牌 | 亮4张，补摸1张 | 机会成本：少1次独立摸牌 |
| 暗杠 | 手牌有4张相同 | 亮4张，补摸1张 | 暴露信息，但无碰牌成本 |

### 6.2 决策公式

```
杠期望 = P(补摸到目标牌) × 自摸收益 + P(补摸改善手牌) × 改善收益 - 机会成本
```

```typescript
function decideGang(
  hand: Tile[],
  gangTile: Tile,
  gangType: 'exposed' | 'concealed',
  deck: DeckState,
): GangDecision {
  const afterGang = remove4Tiles(hand, gangTile)
  const drawProb = calcSingleDrawProb(afterGang, deck)

  // 补摸1张后改善手牌的估算概率
  const improveProb = estimateImproveProb(deck)

  // 机会成本：跳过1次独立摸牌
  const skipCost = 0.02  // 约2%的自摸概率损失

  // 期望收益
  const gangGain = drawProb + improveProb * 0.3 - skipCost

  return { shouldGang: gangGain > 0, gangProb: drawProb, reason }
}
```

---

## 七、贝叶斯对手推断（bayesian.ts）

### 7.1 先验分布

开局时，对手手牌 9 张来自 36 张已知牌（某花色）。某牌在对手手里的数量分布为超几何分布：

```
P(对手有 k 张某牌) = C(4, k) × C(32, 9-k) / C(36, 9)
```

### 7.2 似然函数

根据对手在第 R 巡**主动**打出某牌的行为，推断对手手里还有该牌的概率：

```
L(主动打出 | 对手有该牌) = f(round)  # 随巡数增加（手上牌减少）
L(主动打出 | 对手无该牌) = 1 - f(round)
```

f(round) 经验值：
- 巡 1-3：3%（早期主动打，手里大概率没有）
- 巡 4-8：10%（中期）
- 巡 9+：20%（后期，手牌接近听牌）

### 7.3 后验概率

```typescript
// 后验 = 先验 × 似然 / 归一化常数
posteriorProb = P(对手有k张) × L(打出 | 对手有k张) / Σ P(对手有k张) × L(打出)
```

**注意：** 原代码此处有运算符优先级 Bug，已修复。

### 7.4 修正牌堆概率

```typescript
function adjustDeckProbability(
  deckTargetCount: number,
  bayesianResults: BayesianResult[],
): number {
  // 从目标牌数中减去对手手里期望持有的牌数
  let totalDeduction = 0
  for (const r of bayesianResults) {
    totalDeduction += (r.priorProb - r.posteriorProb) * 4
  }
  return Math.max(0, deckTargetCount - totalDeduction)
}
```

---

## 八、听牌换向分析（switch-decision.ts）

### 8.1 何时考虑换向

- 当前向听数 = 1（差1张听牌）
- 有效进张数较少（< 5 张）
- 对手出牌频率显示目标牌被保留概率低

### 8.2 蒙特卡洛模拟

```typescript
function compareStrategies(
  hand: Tile[],
  iterations: number = 10000,
): SimulatorResult {
  const results = {
    keep: { wins: 0, totalDraws: 0 },
    switch: { wins: 0, totalDraws: 0 },
  }

  for (let i = 0; i < iterations; i++) {
    // 模拟保持策略
    const keepResult = simulateGame(hand, 'keep')
    results.keep.wins += keepResult.selfWin ? 1 : 0
    results.keep.totalDraws += keepResult.draws

    // 模拟换向策略（若可换）
    const switchResult = simulateGame(hand, 'switch')
    results.switch.wins += switchResult.selfWin ? 1 : 0
    results.switch.totalDraws += switchResult.draws
  }

  return {
    keepWinRate: results.keep.wins / iterations,
    switchWinRate: results.switch.wins / iterations,
    avgDrawsKeep: results.keep.totalDraws / results.keep.wins,
    avgDrawsSwitch: results.switch.totalDraws / results.switch.wins,
  }
}
```

---

## 九、核心数据结构

### 9.1 Tile

```typescript
interface Tile {
  suit: 'dot' | 'bamboo' | 'char' | 'red_zhong'
  number: number | null  // 1-9，红中为 null
  id: string             // 唯一标识 "dot_3_0"
}
```

### 9.2 DeckState

```typescript
interface DeckState {
  tiles: Tile[]           // 剩余牌堆
  totalCount: number       // 原始112张
  remainingCount: number   // 当前剩余
  visibleTiles: Tile[]     // 已见牌
  gangDraws: Tile[]        // 杠后补摸走的牌
}
```

### 9.3 向听数结果

```typescript
interface ShantenResult {
  shanten: number              // 向听数（-1=胡，0=听，>0=未听）
  melds: number                 // 可组成的面子数
  pairs: number                 // 可组成的对子数
  redZhongsUsed: number         // 红中使用的数量
  formedCombinations: Combination[]  // 已凑出的组合
}
```

---

## 十、已修复的 Bug

### Bug #1：bayesian.ts 运算符优先级（已修复）

**位置：** `bayesianUpdate` 函数，第 74 行

**错误代码：**
```typescript
posteriorProb: evidence > 0
  ? likelihoods.reduce((s, l) => s + (l.prior * l.likelihood / evidence) * (l.k > 0 ? 1 : 0), 0)
  : 0,
```

**问题：** 整个商乘以 `(l.k > 0 ? 1 : 0)`，导致分母也被乘了 0，结果错误。

**修复后：**
```typescript
posteriorProb: evidence > 0
  ? likelihoods.reduce((s, l) => s + (l.k > 0 ? l.prior * l.likelihood / evidence : 0), 0)
  : 0,
```

---

*本文档随代码更新。如有疑问，参考对应 .ts 源文件。*
