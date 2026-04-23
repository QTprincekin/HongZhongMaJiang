// ============================================================
// 手牌分析：胡牌检测、听牌分析
// 红中麻将规则：14张 = 4面子 + 1对子，红中作赖子
// 支持副露（碰/杠）
// ============================================================

import { Tile, TileSuit, WaitingAnalysis, Meld } from '@/types'

// 按花色+数字分组
function groupByKey(tiles: Tile[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of tiles) {
    if (t.suit === TileSuit.RED_ZHONG) {
      counts.set('_RZ_', (counts.get('_RZ_') || 0) + 1)
    } else {
      const key = `${t.suit}_${t.number}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return counts
}

// 复制 map
function cloneMap(m: Map<string, number>): Map<string, number> {
  return new Map(m)
}

// ===================== 胡牌检测（穷举所有将的可能）=====================

/**
 * 检查是否胡牌（穷举所有可能的对子作为将牌）
 */
export function checkWin(tiles: Tile[], melds: Meld[] = []): boolean {
  const effectiveCount = tiles.length + melds.length * 3
  if (effectiveCount !== 14) return false

  // 已完成的副露组数
  const completedMelds = melds.length

  // 14张 = 4个面子 + 1个对子
  // 移除对子后，剩余12张需要组成 4 - completedMelds 个面子
  const neededMelds = 4 - completedMelds

  // 尝试每种对子作为将牌
  const counts = groupByKey(tiles)
  const rz = counts.get('_RZ_') || 0
  counts.delete('_RZ_')

  // 尝试每种普通对子作为将牌
  for (const [key, cnt] of counts) {
    if (cnt >= 2) {
      const c = cloneMap(counts)
      c.set(key, cnt - 2)
      if (canFormNMeldPairs(c, rz, neededMelds)) return true
    }
  }

  // 红中作为将牌（2张红中做将）
  if (rz >= 2) {
    if (canFormNMeldPairs(cloneMap(counts), rz - 2, neededMelds)) return true
  }

  // 单红中+普通牌做将（必须移除1张普通牌 + 1张红中）
  if (rz >= 1) {
    for (const [key, cnt] of counts) {
      if (cnt >= 1) {
        const c = cloneMap(counts)
        c.set(key, cnt - 1)
        if (canFormNMeldPairs(c, rz - 1, neededMelds)) return true
      }
    }
  }

  // 七对子
  if (isSevenPairs(tiles, melds)) return true

  return false
}

/**
 * 判断是否七对子
 */
function isSevenPairs(tiles: Tile[], melds: Meld[]): boolean {
  const counts = groupByKey(tiles)
  const rz = counts.get('_RZ_') || 0
  counts.delete('_RZ_')

  let pairs = 0
  // 副露中有刻子的也算一对
  for (const m of melds) {
    if (m.type === 'pong' || m.type === 'exposed_gang' || m.type === 'concealed_gang') {
      pairs += 1
    }
  }
  for (const [, cnt] of counts) {
    pairs += Math.floor(cnt / 2)
  }
  // 每个红中可以凑成1个对子
  pairs += Math.floor(rz / 2)

  return pairs >= 7
}

/**
 * 递归检测能否组成指定数量的面子
 * 核心思路：找到最小的牌，穷举它参与的所有面子组合（刻子/顺子），递归检查剩余牌
 * 每张牌必须属于某个面子，不允许跳过
 */
function canFormNMeldPairs(counts: Map<string, number>, rz: number, meldsLeft: number): boolean {
  if (meldsLeft === 0) {
    // 所有牌必须恰好用完
    for (const cnt of counts.values()) {
      if (cnt > 0) return false
    }
    return rz === 0
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0) + rz
  if (total !== meldsLeft * 3) return false // 牌数必须恰好等于面子数×3

  // 找最小的牌（按 key 字典序，保证同花色内从小到大处理）
  let minKey = ''
  for (const [k, v] of counts) {
    if (v > 0 && (minKey === '' || k < minKey)) {
      minKey = k
    }
  }

  if (minKey === '') {
    // 没有普通牌了，全部用红中组面子
    return rz === 3 * meldsLeft
  }

  const cnt = counts.get(minKey)!
  const [suit, numStr] = minKey.split('_')
  const num = parseInt(numStr)

  // ========== 刻子分支 ==========

  // 刻子：3张相同
  if (cnt >= 3) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 3)
    if (canFormNMeldPairs(c, rz, meldsLeft - 1)) return true
  }

  // 刻子：2张 + 1红中
  if (cnt >= 2 && rz >= 1) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 2)
    if (canFormNMeldPairs(c, rz - 1, meldsLeft - 1)) return true
  }

  // 刻子：1张 + 2红中
  if (cnt >= 1 && rz >= 2) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 1)
    if (canFormNMeldPairs(c, rz - 2, meldsLeft - 1)) return true
  }

  // ========== 顺子分支（仅限数牌） ==========

  const k1 = `${suit}_${num + 1}`
  const k2 = `${suit}_${num + 2}`
  const c1 = counts.get(k1) || 0
  const c2 = counts.get(k2) || 0

  // 顺子：n, n+1, n+2（全部普通牌）
  if (c1 > 0 && c2 > 0) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 1)
    c.set(k1, c1 - 1)
    c.set(k2, c2 - 1)
    if (canFormNMeldPairs(c, rz, meldsLeft - 1)) return true
  }

  // 顺子：n + (n+1) + 红中代(n+2)，或 红中代(n-1) + n + (n+1)
  if (c1 > 0 && rz >= 1) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 1)
    c.set(k1, c1 - 1)
    if (canFormNMeldPairs(c, rz - 1, meldsLeft - 1)) return true
  }

  // 顺子：n + 红中代(n+1) + (n+2)
  if (c2 > 0 && rz >= 1) {
    const c = cloneMap(counts)
    c.set(minKey, cnt - 1)
    c.set(k2, c2 - 1)
    if (canFormNMeldPairs(c, rz - 1, meldsLeft - 1)) return true
  }

  // 注意：n + 2红中做顺子 的效果等同于 "1张+2红中做刻子"，已在上方覆盖

  return false
}

// ===================== 听牌分析 =====================

/**
 * 听牌分析
 * @param hand 手牌
 * @param melds 副露（可选）
 */
export function analyzeWaiting(hand: Tile[], melds: Meld[] = []): WaitingAnalysis {
  const effectiveCount = hand.length + melds.length * 3

  // 14张已胡牌
  if (effectiveCount === 14) {
    const won = checkWin(hand, melds)
    return {
      isReady: won,
      waitingTiles: won ? [] : [],
      waitingCount: won ? -1 : 0,
      readyHand: [],
    }
  }

  // 只分析13张的情况
  if (effectiveCount !== 13) {
    return { isReady: false, waitingTiles: [], waitingCount: 0, readyHand: [] }
  }

  const waitingTiles: Tile[] = []
  const suits = [TileSuit.DOT, TileSuit.BAMBOO, TileSuit.CHARACTER]

  // 尝试每张牌作为第14张
  for (const suit of suits) {
    for (let num = 1; num <= 9; num++) {
      const testTile: Tile = { suit, number: num, id: `wait_${suit}_${num}` }
      if (checkWin([...hand, testTile], melds)) {
        waitingTiles.push(testTile)
      }
    }
  }

  // 红中也可作为听牌目标
  const rzTile: Tile = { suit: TileSuit.RED_ZHONG, number: null, id: 'wait_rz' }
  if (checkWin([...hand, rzTile], melds)) {
    waitingTiles.push(rzTile)
  }

  return {
    isReady: waitingTiles.length > 0,
    waitingTiles,
    waitingCount: waitingTiles.length,
    readyHand: [],
  }
}

// 手牌统计
export function getHandStats(hand: Tile[], melds: Meld[] = []) {
  const waiting = analyzeWaiting(hand, melds)
  const counts = groupByKey(hand)
  const rz = counts.get('_RZ_') || 0

  return {
    total: hand.length,
    redZhong: rz,
    isReady: waiting.isReady,
    waitingCount: waiting.waitingCount,
    waitingTiles: waiting.waitingTiles,
  }
}
