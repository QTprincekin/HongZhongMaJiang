// ============================================================
// 牌堆管理：生成、洗牌、发牌、摸牌
// ============================================================

import { Tile, TileSuit, DeckState, Meld, MeldType } from '@/types'
export { TileSuit }

// 生成112张牌（1-9筒/万/条各4张 + 红中4张）
function createFullDeck(): Tile[] {
  const tiles: Tile[] = []
  let idCounter = 0

  // 1-9 筒/万/条，各4张
  for (const suit of [TileSuit.DOT, TileSuit.BAMBOO, TileSuit.CHARACTER]) {
    for (let n = 1; n <= 9; n++) {
      for (let i = 0; i < 4; i++) {
        tiles.push({
          suit,
          number: n,
          id: `${suit}_${n}_${idCounter++}`,
        })
      }
    }
  }

  // 红中4张
  for (let i = 0; i < 4; i++) {
    tiles.push({
      suit: TileSuit.RED_ZHONG,
      number: null,
      id: `${TileSuit.RED_ZHONG}_${i}`,
    })
  }

  return tiles
}

// Fisher-Yates 洗牌
export function shuffle(tiles: Tile[]): Tile[] {
  const result = [...tiles]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 创建初始牌堆
export function createDeck(): DeckState {
  const tiles = shuffle(createFullDeck())
  return {
    tiles,
    totalCount: 112,
    remainingCount: 112,
    visibleTiles: [],
    gangDraws: [],
  }
}

// 发牌（每家13张）
export function dealHand(deck: DeckState): { hand: Tile[]; deck: DeckState } {
  const hand = deck.tiles.slice(0, 13)
  const remaining = deck.tiles.slice(13)
  return {
    hand,
    deck: {
      ...deck,
      tiles: remaining,
      remainingCount: deck.remainingCount - 13,
    },
  }
}

// 摸一张牌
export function drawTile(deck: DeckState): { tile: Tile; deck: DeckState } {
  if (deck.tiles.length === 0) {
    throw new Error('牌堆已空')
  }
  const [tile, ...remaining] = deck.tiles
  return {
    tile,
    deck: {
      ...deck,
      tiles: remaining,
      remainingCount: deck.remainingCount - 1,
    },
  }
}

// 杠后补摸一张牌（从牌堆后方摸，不消耗巾）
export function gangDraw(deck: DeckState): { tile: Tile; deck: DeckState } {
  if (deck.tiles.length === 0) {
    throw new Error('牌堆已空，无法补摸')
  }
  const tile = deck.tiles[deck.tiles.length - 1]
  const remaining = deck.tiles.slice(0, -1)
  return {
    tile,
    deck: {
      ...deck,
      tiles: remaining,
      remainingCount: deck.remainingCount - 1,
      gangDraws: [...deck.gangDraws, tile],
    },
  }
}

// 记录已见牌（打出/碰/杠亮出）
export function addVisibleTile(deck: DeckState, tile: Tile): DeckState {
  return {
    ...deck,
    visibleTiles: [...deck.visibleTiles, tile],
  }
}

// 获取某种牌剩余数量
export function getRemainingCount(deck: DeckState, suit: TileSuit, number: number | null): number {
  const visibleCount = deck.visibleTiles.filter(t => t.suit === suit && t.number === number).length
  const gangCount = deck.gangDraws.filter(t => t.suit === suit && t.number === number).length
  const total = suit === TileSuit.RED_ZHONG ? 4 : 4
  const remaining = total - visibleCount - gangCount

  // 还要减去玩家手牌中的牌
  // 这里返回的是牌堆中的剩余数，不包含手牌
  return Math.max(0, remaining)
}

// 获取某种牌在牌堆中的剩余数量（已考虑已见牌）
export function getDeckRemainingCount(deck: DeckState, suit: TileSuit, number: number | null): number {
  // 牌堆中的牌
  const inDeck = deck.tiles.filter(t => t.suit === suit && t.number === number).length
  return inDeck
}

// 获取某张牌在牌堆中的剩余数量
export function getTileDeckCount(deck: DeckState, tile: Tile): number {
  return getDeckRemainingCount(deck, tile.suit, tile.number)
}

// 生成补摸后的牌堆（模拟杠后补摸）
export function simulateGangDraw(deck: DeckState): { tile: Tile; newDeck: DeckState } | null {
  if (deck.tiles.length === 0) return null
  const [tile, ...remaining] = deck.tiles
  return {
    tile,
    newDeck: {
      ...deck,
      tiles: remaining,
      remainingCount: deck.remainingCount - 1,
      gangDraws: [...deck.gangDraws, tile],
    },
  }
}

// 格式化牌名
export function formatTile(tile: Tile): string {
  if (tile.suit === TileSuit.RED_ZHONG) return '红中'
  const suitName = { dot: '筒', bamboo: '条', char: '万' }[tile.suit]
  return `${tile.number}${suitName}`
}

// 格式化牌组
export function formatTiles(tiles: Tile[]): string {
  if (!tiles || tiles.length === 0) return '无'
  return tiles.map(formatTile).join('、')
}

// 副露格式化
export function formatMeld(meld: Meld): string {
  const tileStr = formatTile(meld.tile)
  const typeMap: Record<MeldType, string> = {
    pong: '碰',
    exposed_gang: '明杠',
    concealed_gang: '暗杠',
  }
  return `${typeMap[meld.type]}${tileStr}`
}

// 比较两张牌是否相同
export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.number === b.number
}

// 在数组中找某种牌的数量
export function countTiles(tiles: Tile[], suit: TileSuit, number: number | null): number {
  return tiles.filter(t => t.suit === suit && t.number === number).length
}

// 从手牌中移除N张指定的牌
export function removeTiles(hand: Tile[], suit: TileSuit, number: number | null, count: number): Tile[] {
  let remaining = count
  const result: Tile[] = []
  for (const tile of hand) {
    if (remaining > 0 && tile.suit === suit && tile.number === number) {
      remaining--
    } else {
      result.push(tile)
    }
  }
  return result
}
