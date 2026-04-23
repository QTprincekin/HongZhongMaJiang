// ============================================================
// 向听数计算：红中麻将专用
// 向听数 = 距离听牌还需要多少步（摸到有效进张的次数）
// -1 = 已胡, 0 = 听牌, 1 = 一向听, 2 = 二向听 ...
// ============================================================

import { Tile, TileSuit, Meld, ShantenResult, HandGroup } from '@/types'

// ===================== 公开API =====================

/**
 * 计算向听数（含红中赖子）
 * @param hand 手牌（不含副露中的牌）
 * @param melds 已完成的副露
 */
export function calculateShanten(hand: Tile[], melds: Meld[] = []): ShantenResult {
  const completedMelds = melds.length
  // 需要的面子数 = 4 - 已完成副露
  const targetMelds = 4 - completedMelds

  // 分离红中与普通牌
  const normalTiles: Tile[] = []
  let rzCount = 0
  for (const t of hand) {
    if (t.suit === TileSuit.RED_ZHONG) {
      rzCount++
    } else {
      normalTiles.push(t)
    }
  }

  // 按花色+数字转为计数数组（3花色 x 9数字）
  const counts = tilesToCounts(normalTiles)

  // 穷举所有拆牌方案，找最小向听数
  let bestShanten = 8 // 理论最大值（13张全是孤张）
  let bestDecomp: HandGroup[] = []

  // 递归拆牌：穷举面子→搭子→对子的所有组合
  const tempGroups: HandGroup[] = []
  searchBestShanten(
    counts, rzCount, targetMelds,
    0, 0, 0, false,
    tempGroups,
    (shanten, groups) => {
      if (shanten < bestShanten) {
        bestShanten = shanten
        bestDecomp = [...groups]
      }
    }
  )

  // 向听数下限：手牌张数不够时不可能完成胡牌
  // 完成胡牌需要 targetMelds*3 + 2 张手牌
  const neededForComplete = targetMelds * 3 + 2
  const minShanten = hand.length >= neededForComplete ? -1 : 0

  return {
    shanten: Math.max(minShanten, bestShanten),
    bestDecomposition: bestDecomp,
  }
}

// ===================== 内部实现 =====================

// 3花色 x 9数字 = 计数数组
// index: suit * 9 + (num - 1)
// suit: 0=dot, 1=bamboo, 2=char
const SUIT_MAP: Record<string, number> = {
  [TileSuit.DOT]: 0,
  [TileSuit.BAMBOO]: 1,
  [TileSuit.CHARACTER]: 2,
}

function tilesToCounts(tiles: Tile[]): number[] {
  const c = new Array(27).fill(0)
  for (const t of tiles) {
    const si = SUIT_MAP[t.suit]
    if (si !== undefined && t.number !== null) {
      c[si * 9 + (t.number - 1)]++
    }
  }
  return c
}

function countsToTile(idx: number): Tile {
  const suitIdx = Math.floor(idx / 9)
  const num = (idx % 9) + 1
  const suits = [TileSuit.DOT, TileSuit.BAMBOO, TileSuit.CHARACTER]
  return { suit: suits[suitIdx], number: num, id: `s_${suits[suitIdx]}_${num}` }
}

/**
 * 核心递归：穷举拆牌方案
 * 
 * @param counts 27格计数数组（会被修改，调用者需恢复）
 * @param rz 可用红中数
 * @param targetMelds 需要的面子总数（4-副露数）
 * @param mentsu 已找到的完整面子数
 * @param partial 已找到的搭子/对子数（需1张即成面子/将的不完整组）
 * @param pos 当前扫描位置（0-26）
 * @param hasPair 是否已选定将牌对子
 * @param groups 当前拆出的分组
 * @param onResult 找到一种方案时的回调
 */
function searchBestShanten(
  counts: number[],
  rz: number,
  targetMelds: number,
  mentsu: number,
  partial: number,
  pos: number,
  hasPair: boolean,
  groups: HandGroup[],
  onResult: (shanten: number, groups: HandGroup[]) => void,
) {
  // 跳过空位置，找到第一个有牌的位置
  while (pos < 27 && counts[pos] === 0) pos++

  // 所有位置已扫描完，评估当前方案
  if (pos >= 27) {
    const maxP = Math.min(partial, targetMelds - mentsu)
    const base = (targetMelds - mentsu) * 2 - maxP - (hasPair ? 1 : 0)
    const s = Math.max(-1, base - rz)
    onResult(s, groups)
    return
  }

  const suitBase = Math.floor(pos / 9) * 9
  const num = pos - suitBase // 0-based number within suit

  // ===== 刻子（3张相同）=====
  if (counts[pos] >= 3) {
    counts[pos] -= 3
    groups.push({ type: 'complete_meld', tiles: [countsToTile(pos), countsToTile(pos), countsToTile(pos)] })
    searchBestShanten(counts, rz, targetMelds, mentsu + 1, partial, pos, hasPair, groups, onResult)
    groups.pop()
    counts[pos] += 3
  }

  // ===== 顺子（连续3张，不跨花色）=====
  if (num <= 6 && (pos + 2) < suitBase + 9 && counts[pos + 1] > 0 && counts[pos + 2] > 0) {
    counts[pos]--; counts[pos + 1]--; counts[pos + 2]--
    groups.push({ type: 'complete_meld', tiles: [countsToTile(pos), countsToTile(pos + 1), countsToTile(pos + 2)] })
    searchBestShanten(counts, rz, targetMelds, mentsu + 1, partial, pos, hasPair, groups, onResult)
    groups.pop()
    counts[pos]++; counts[pos + 1]++; counts[pos + 2]++
  }

  // ===== 对子（将牌候选）=====
  if (counts[pos] >= 2 && !hasPair) {
    counts[pos] -= 2
    groups.push({ type: 'pair', tiles: [countsToTile(pos), countsToTile(pos)] })
    searchBestShanten(counts, rz, targetMelds, mentsu, partial, pos, true, groups, onResult)
    groups.pop()
    counts[pos] += 2
  }

  // ===== 搭子：相邻两张（如 3,4，不跨花色）=====
  if (num <= 7 && (pos + 1) < suitBase + 9 && counts[pos + 1] > 0) {
    counts[pos]--; counts[pos + 1]--
    const needed: Tile[] = []
    if (num >= 1) needed.push(countsToTile(pos - 1))
    if (num <= 6) needed.push(countsToTile(pos + 2))
    groups.push({ type: 'partial_seq', tiles: [countsToTile(pos), countsToTile(pos + 1)], needed })
    searchBestShanten(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, groups, onResult)
    groups.pop()
    counts[pos]++; counts[pos + 1]++
  }

  // ===== 搭子：间隔两张（如 3,5 差4，不跨花色）=====
  if (num <= 6 && (pos + 2) < suitBase + 9 && counts[pos + 2] > 0) {
    counts[pos]--; counts[pos + 2]--
    groups.push({ type: 'partial_seq', tiles: [countsToTile(pos), countsToTile(pos + 2)], needed: [countsToTile(pos + 1)] })
    searchBestShanten(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, groups, onResult)
    groups.pop()
    counts[pos]++; counts[pos + 2]++
  }

  // ===== 对子作为搭子（非将牌用途）=====
  if (counts[pos] >= 2) {
    counts[pos] -= 2
    groups.push({ type: 'partial_pair', tiles: [countsToTile(pos), countsToTile(pos)], needed: [countsToTile(pos)] })
    searchBestShanten(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, groups, onResult)
    groups.pop()
    counts[pos] += 2
  }

  // ===== 跳过当前位置（剩余牌视为孤张）=====
  // 必须探索“不用当前位置的牌组成任何组”的情况
  searchBestShanten(counts, rz, targetMelds, mentsu, partial, pos + 1, hasPair, groups, onResult)
}

/**
 * 快速向听数计算（不追踪分组，纯数值，性能更好）
 * 用于有效进张遍历时的批量计算
 */
export function calculateShantenFast(hand: Tile[], melds: Meld[] = []): number {
  const completedMelds = melds.length
  const targetMelds = 4 - completedMelds

  let rzCount = 0
  const counts = new Array(27).fill(0)
  for (const t of hand) {
    if (t.suit === TileSuit.RED_ZHONG) {
      rzCount++
    } else {
      const si = SUIT_MAP[t.suit]
      if (si !== undefined && t.number !== null) {
        counts[si * 9 + (t.number - 1)]++
      }
    }
  }

  let best = 8
  scanFast(counts, rzCount, targetMelds, 0, 0, 0, false, (s) => {
    if (s < best) best = s
  })

  const neededForComplete = targetMelds * 3 + 2
  const minShanten = hand.length >= neededForComplete ? -1 : 0
  return Math.max(minShanten, best)
}

/**
 * 快速递归扫描（只计算向听数，不记录分组）
 */
function scanFast(
  counts: number[],
  rz: number,
  targetMelds: number,
  mentsu: number,
  partial: number,
  pos: number,
  hasPair: boolean,
  onResult: (shanten: number) => void,
) {
  while (pos < 27 && counts[pos] === 0) pos++

  if (pos >= 27) {
    const maxP = Math.min(partial, targetMelds - mentsu)
    const base = (targetMelds - mentsu) * 2 - maxP - (hasPair ? 1 : 0)
    onResult(Math.max(-1, base - rz))
    return
  }

  const suitBase = Math.floor(pos / 9) * 9
  const num = pos - suitBase

  // 刻子
  if (counts[pos] >= 3) {
    counts[pos] -= 3
    scanFast(counts, rz, targetMelds, mentsu + 1, partial, pos, hasPair, onResult)
    counts[pos] += 3
  }
  // 顺子
  if (num <= 6 && (pos + 2) < suitBase + 9 && counts[pos + 1] > 0 && counts[pos + 2] > 0) {
    counts[pos]--; counts[pos + 1]--; counts[pos + 2]--
    scanFast(counts, rz, targetMelds, mentsu + 1, partial, pos, hasPair, onResult)
    counts[pos]++; counts[pos + 1]++; counts[pos + 2]++
  }
  // 对子做将
  if (counts[pos] >= 2 && !hasPair) {
    counts[pos] -= 2
    scanFast(counts, rz, targetMelds, mentsu, partial, pos, true, onResult)
    counts[pos] += 2
  }
  // 搭子：相邻
  if (num <= 7 && (pos + 1) < suitBase + 9 && counts[pos + 1] > 0) {
    counts[pos]--; counts[pos + 1]--
    scanFast(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, onResult)
    counts[pos]++; counts[pos + 1]++
  }
  // 搭子：间隔
  if (num <= 6 && (pos + 2) < suitBase + 9 && counts[pos + 2] > 0) {
    counts[pos]--; counts[pos + 2]--
    scanFast(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, onResult)
    counts[pos]++; counts[pos + 2]++
  }
  // 对子做搭子
  if (counts[pos] >= 2) {
    counts[pos] -= 2
    scanFast(counts, rz, targetMelds, mentsu, partial + 1, pos, hasPair, onResult)
    counts[pos] += 2
  }
  // 跳过
  scanFast(counts, rz, targetMelds, mentsu, partial, pos + 1, hasPair, onResult)
}
