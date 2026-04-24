// ============================================================
// 游戏状态管理 - 回合制 + 对手AI
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  Tile, TileSuit, DeckState, Meld, GameAction,
  ProbabilityState, PongDecision, GangDecision,
  AIDifficulty, AI_DIFFICULTY_CONFIG,
} from '@/types'
import {
  createDeck, dealHand, drawTile, gangDraw, addVisibleTile,
  tilesEqual, countTiles, removeTiles, formatTile,
} from '@/algorithms/deck'
import { analyzeWaiting } from '@/algorithms/hand-analyzer'
import { calcProbability } from '@/algorithms/probability'
import { pongDecision, gangDecision } from '@/algorithms/pong-decision'
import { analyzeEffectiveDraws, analyzeDiscardOptions } from '@/algorithms/effective-draw'
import { calculateShanten } from '@/algorithms/shanten'

// 对手数据结构
interface Opponent {
  id: number
  name: string
  hand: Tile[]
  melds: Meld[]
  river: Tile[]
  lastDiscard?: Tile
}

// 游戏阶段
type GamePhase =
  | 'init'
  | 'my_draw'
  | 'my_discard'
  | 'opponent_turn'
  | 'waiting_pong'
  | 'waiting_gang'
  | 'waiting_win'
  | 'ended'

export const useGameStore = defineStore('game', () => {
  // ===================== 状态 =====================
  const deck = ref<DeckState>(createDeck())
  const playerHand = ref<Tile[]>([])
  const playerMelds = ref<Meld[]>([])
  const playerRiver = ref<Tile[]>([])

  const opponents = ref<Opponent[]>([
    { id: 0, name: '对手A', hand: [], melds: [], river: [] },
    { id: 1, name: '对手B', hand: [], melds: [], river: [] },
    { id: 2, name: '对手C', hand: [], melds: [], river: [] },
  ])

  const round = ref(0)
  const currentOpponent = ref<number | null>(null)
  const history = ref<GameAction[]>([])
  const selectedTile = ref<Tile | undefined>(undefined)
  const pendingPongTile = ref<Tile | undefined>(undefined)
  const pendingGangTile = ref<Tile | undefined>(undefined)
  const pendingFrom = ref<number | null>(null)
  const gamePhase = ref<GamePhase>('init')
  const message = ref<string>('')
  const hasDrawnThisTurn = ref(false)
  const aiDifficulty = ref<AIDifficulty>(AIDifficulty.NOVICE)

  // ===================== 计算属性 =====================
  const waiting = computed(() => {
    const result = analyzeWaiting(playerHand.value, playerMelds.value)
    if (result.isReady) {
      console.log('[DEBUG 听牌]', {
        handCount: playerHand.value.length,
        meldsCount: playerMelds.value.length,
        effective: playerHand.value.length + playerMelds.value.length * 3,
        hand: playerHand.value.map(t => `${t.suit}_${t.number}`).join(', '),
        melds: playerMelds.value.map(m => `${m.type}:${m.tile.suit}_${m.tile.number}`),
        waitingTiles: result.waitingTiles.map(t => `${t.suit}_${t.number}`),
      })
    }
    return result
  })

  const probability = computed<ProbabilityState>(() =>
    calcProbability(deck.value, waiting.value.waitingTiles, playerHand.value, playerMelds.value)
  )

  const pongResult = computed<PongDecision | null>(() => {
    if (!pendingPongTile.value) return null
    return pongDecision(playerHand.value, pendingPongTile.value, deck.value)
  })

  const gangResult = computed<GangDecision | null>(() => {
    if (!pendingGangTile.value) return null
    return gangDecision(playerHand.value, pendingGangTile.value, deck.value, 'exposed')
  })

  const canDraw = computed(() => gamePhase.value === 'my_draw' && !hasDrawnThisTurn.value)
  const canDiscard = computed(() => gamePhase.value === 'my_discard' && !!selectedTile.value)
  const canPong = computed(() => gamePhase.value === 'waiting_pong' && !!pendingPongTile.value)
  const canGang = computed(() => gamePhase.value === 'waiting_gang' && !!pendingGangTile.value)

  // 向听数
  const shantenResult = computed(() =>
    calculateShanten(playerHand.value, playerMelds.value)
  )

  // 有效进张分析（13张手牌时：纯摸牌视角）
  const effectiveDrawResult = computed(() => {
    const handLen = playerHand.value.length + playerMelds.value.length * 3
    // 只在13张（等摸牌状态）时分析有效进张
    if (handLen !== 13) return null
    return analyzeEffectiveDraws(playerHand.value, playerMelds.value, deck.value)
  })

  // 打摸联动分析（14张手牌时：摸牌后需要打出）
  const discardRecommendation = computed(() => {
    const handLen = playerHand.value.length + playerMelds.value.length * 3
    // 只在14张（需出牌状态）时分析打摸联动
    if (handLen !== 14) return null
    return analyzeDiscardOptions(playerHand.value, playerMelds.value, deck.value)
  })

  // ===================== 开始游戏 =====================
  function startGame() {
    deck.value = createDeck()
    const { hand: myHand, deck: d1 } = dealHand(deck.value)
    deck.value = d1
    playerHand.value = myHand.sort(sortTiles)
    playerMelds.value = []
    playerRiver.value = []
    for (let i = 0; i < 3; i++) {
      const { hand, deck: d } = dealHand(deck.value)
      deck.value = d
      opponents.value[i].hand = hand.sort(sortTiles)
      opponents.value[i].melds = []
      opponents.value[i].river = []
      opponents.value[i].lastDiscard = undefined
    }
    history.value = []
    round.value = 1
    currentOpponent.value = null
    selectedTile.value = undefined
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    gamePhase.value = 'my_draw'
    message.value = '你的回合，请摸牌'
  }

  // ===================== 摸牌 =====================
  function draw() {
    if (gamePhase.value !== 'my_draw') { message.value = '请先摸牌或等待'; return }
    if (hasDrawnThisTurn.value) { message.value = '本回合已摸牌，请先打出一张'; return }
    if (deck.value.tiles.length === 0) {
      gamePhase.value = 'ended'
      message.value = '牌堆已空，流局'
      return
    }
    const { tile, deck: newDeck } = drawTile(deck.value)
    deck.value = newDeck
    playerHand.value.push(tile)
    playerHand.value.sort(sortTiles)
    hasDrawnThisTurn.value = true
    history.value.push({ type: 'draw', tile, round: round.value })

    // 检查是否自摸胡牌
    if (checkSelfWin()) {
      gamePhase.value = 'waiting_win'
      message.value = '🎉 恭喜！自摸胡牌！'
      return
    }

    gamePhase.value = 'my_discard'
    selectedTile.value = undefined
    if (waiting.value.isReady) {
      message.value = `摸到 ${formatTile(tile)}，已听牌！请打出一张`
    } else {
      message.value = `摸到 ${formatTile(tile)}，请打出一张`
    }
    checkConcealedGang()
  }

  // 检查是否自摸胡牌（有效牌数 = 手牌 + 副露*3）
  function checkSelfWin(): boolean {
    const effective = playerHand.value.length + playerMelds.value.length * 3
    if (effective !== 14) return false
    const result = analyzeWaiting(playerHand.value, playerMelds.value)
    return result.isReady
  }

  // 胡牌（自摸）
  function win() {
    if (gamePhase.value !== 'waiting_win') return
    const tile = playerHand.value[playerHand.value.length - 1]
    history.value.push({ type: 'self_draw', tile, round: round.value })
    gamePhase.value = 'ended'
    message.value = '🎉 自摸胡牌！'
  }

  // 不胡（继续）
  function rejectWin() {
    if (gamePhase.value !== 'waiting_win') return
    gamePhase.value = 'my_discard'
    message.value = '请打出一张牌'
  }

  // ===================== 出牌 =====================
  function discard(tile: Tile) {
    if (gamePhase.value !== 'my_discard') { message.value = '请先摸牌'; return }
    const idx = playerHand.value.findIndex(t => t.id === tile.id)
    if (idx < 0) { message.value = '找不到这张牌'; return }
    playerHand.value.splice(idx, 1)
    playerRiver.value.push(tile)
    deck.value = addVisibleTile(deck.value, tile)
    history.value.push({ type: 'discard', tile, round: round.value })
    selectedTile.value = undefined
    message.value = `打出 ${formatTile(tile)}`
    hasDrawnThisTurn.value = false
    nextTurn()
  }

  // ===================== 碰牌 =====================
  function pong() {
    if (gamePhase.value !== 'waiting_pong' || !pendingPongTile.value) return
    const tile = pendingPongTile.value
    // 从手牌移除2张相同牌
    let removed = 0
    playerHand.value = playerHand.value.filter(t => {
      if (removed < 2 && tilesEqual(t, tile)) { removed++; return false }
      return true
    })
    playerMelds.value.push({ type: 'pong', tile, fromOpponent: true })
    // 从对手河面移除这张牌
    if (pendingFrom.value !== null) {
      const opp = opponents.value[pendingFrom.value]
      const idx = opp.river.findIndex(t => tilesEqual(t, tile))
      if (idx >= 0) opp.river.splice(idx, 1)
    }
    deck.value = addVisibleTile(deck.value, tile)
    history.value.push({ type: 'pong', tile, round: round.value, meld: playerMelds.value[playerMelds.value.length - 1] })
    pendingPongTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    // 碰完后直接进入出牌阶段（碰=2张+对手1张，不可能再杠）
    gamePhase.value = 'my_discard'
    selectedTile.value = undefined
    message.value = `碰 ${formatTile(tile)}，请打出一张牌`
  }

  function rejectPong() {
    const fromIdx = pendingFrom.value
    if (fromIdx !== null) {
      opponents.value[fromIdx].lastDiscard = pendingPongTile.value
    }
    pendingPongTile.value = undefined
    pendingFrom.value = null
    // 重置为对手回合，然后继续轮转
    gamePhase.value = 'opponent_turn'
    if (fromIdx !== null) {
      advanceOpponent(fromIdx)
    } else {
      nextTurn()
    }
  }

  // ===================== 杠牌 =====================
  function gang(type: 'exposed' | 'concealed') {
    const tile = pendingGangTile.value || findGangTile(playerHand.value)
    if (!tile) return

    if (type === 'exposed') {
      // 明杠：手里3张 + 对手打出1张，从手牌移除3张
      playerHand.value = removeTiles(playerHand.value, tile.suit, tile.number, 3)
      // 从对手河面移除打出的牌
      if (pendingFrom.value !== null) {
        const opp = opponents.value[pendingFrom.value]
        const idx = opp.river.findIndex(t => tilesEqual(t, tile))
        if (idx >= 0) opp.river.splice(idx, 1)
      }
    } else {
      // 暗杠：手里4张，全部移除
      playerHand.value = removeTiles(playerHand.value, tile.suit, tile.number, 4)
    }

    if (deck.value.tiles.length === 0) {
      gamePhase.value = 'ended'
      message.value = '牌堆已空，流局'
      return
    }

    // 杠后从牌堆后方补摸一张
    const { tile: drawn, deck: newDeck } = gangDraw(deck.value)
    deck.value = newDeck
    playerHand.value.push(drawn)
    playerHand.value.sort(sortTiles)
    playerMelds.value.push({
      type: type === 'exposed' ? 'exposed_gang' : 'concealed_gang',
      tile, drawnAfter: drawn, fromOpponent: type === 'exposed',
    })
    deck.value = addVisibleTile(deck.value, tile)
    history.value.push({ type: 'gang', tile, round: round.value, meld: playerMelds.value[playerMelds.value.length - 1] })
    pendingGangTile.value = undefined
    pendingPongTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = true

    // 检查杠后补摸是否自摸胡牌
    if (checkSelfWin()) {
      gamePhase.value = 'waiting_win'
      message.value = '🎉 杠后自摸胡牌！'
    } else {
      // 杠完补摸后，需要打出一张牌
      gamePhase.value = 'my_discard'
      selectedTile.value = undefined
      message.value = `杠 ${formatTile(tile)}，补摸 ${formatTile(drawn)}，请打出一张牌`
    }
  }

  function rejectGang() {
    const fromIdx = pendingFrom.value
    pendingGangTile.value = undefined
    pendingFrom.value = null
    if (fromIdx !== null) {
      // 明杠拒绝：重置为对手回合，从该对手继续轮转
      gamePhase.value = 'opponent_turn'
      advanceOpponent(fromIdx)
    } else {
      // 暗杠拒绝：自己摸牌后检测到的，继续出牌
      gamePhase.value = 'my_discard'
      message.value = '请打出一张牌'
    }
  }

  // ===================== 检查暗杠 =====================
  function checkConcealedGang() {
    const tile = findGangTile(playerHand.value)
    if (tile && gamePhase.value === 'my_discard') {
      pendingGangTile.value = tile
      gamePhase.value = 'waiting_gang'
      message.value = `你可以暗杠 ${formatTile(tile)}！`
    }
  }

  function findGangTile(hand: Tile[]): Tile | undefined {
    const seen = new Set<string>()
    for (const t of hand) {
      const key = `${t.suit}_${t.number}`
      if (!seen.has(key)) {
        seen.add(key)
        if (countTiles(hand, t.suit, t.number) >= 4) return t
      }
    }
    return undefined
  }

  // ===================== 轮转 =====================
  function nextTurn() {
    if (deck.value.tiles.length === 0) {
      gamePhase.value = 'ended'
      message.value = '牌堆已空，流局'
      return
    }
    gamePhase.value = 'opponent_turn'
    setTimeout(() => opponentTurn(0), 400)
  }

  // ===================== 对手AI =====================
  function opponentTurn(opponentIdx: number) {
    if (gamePhase.value === 'ended') return
    const opp = opponents.value[opponentIdx]
    if (!opp) return

    if (deck.value.tiles.length === 0) {
      gamePhase.value = 'ended'
      message.value = '牌堆已空，流局'
      return
    }

    const { tile: drawn, deck: newDeck } = drawTile(deck.value)
    deck.value = newDeck
    opp.hand.push(drawn)
    currentOpponent.value = opponentIdx
    message.value = `${opp.name} 摸牌`

    setTimeout(() => {
      // 检查对手是否自摸胡牌（14张且听牌）
      if (opp.hand.length === 14) {
        const oppWaiting = analyzeWaiting(opp.hand, opp.melds)
        if (oppWaiting.isReady) {
          const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
          const roll = Math.random()
          if (roll < config.winChance) {
            // AI 胡牌了！
            gamePhase.value = 'ended'
            message.value = `${opp.name} 自摸胡牌！你输了 💔`
            history.value.push({ type: 'self_draw', tile: drawn, round: round.value })
            return
          }
        }
      }

      // 获取所有可见牌（已打出的牌）
      const visibleTiles = deck.value.visibleTiles || []
      const discardTile = selectOpponentDiscard(opp.hand, visibleTiles, opp.melds)
      const idx = opp.hand.findIndex(t => t.id === discardTile.id)
      if (idx >= 0) {
        opp.hand.splice(idx, 1)
        opp.river.push(discardTile)
        opp.lastDiscard = discardTile
        deck.value = addVisibleTile(deck.value, discardTile)
        history.value.push({ type: 'discard', tile: discardTile, round: round.value, fromOpponent: opponentIdx })
        message.value = `${opp.name} 打出 ${formatTile(discardTile)}`

        // 检查玩家是否可以碰/杠（对手出牌后玩家可以响应）
        if (gamePhase.value === 'my_discard' || gamePhase.value === 'my_draw' || gamePhase.value === 'opponent_turn') {
          const handCount = countTiles(playerHand.value, discardTile.suit, discardTile.number)
          // 手里3张 + 对手打出1张 = 明杠
          if (handCount >= 3) {
            pendingGangTile.value = discardTile
            pendingFrom.value = opponentIdx
            gamePhase.value = 'waiting_gang'
            message.value = `${opp.name} 打出 ${formatTile(discardTile)}，你可以杠！`
          // 手里2张 + 对手打出1张 = 碰
          } else if (handCount >= 2) {
            pendingPongTile.value = discardTile
            pendingFrom.value = opponentIdx
            gamePhase.value = 'waiting_pong'
            message.value = `${opp.name} 打出 ${formatTile(discardTile)}，你可以碰！`
          } else {
            setTimeout(() => advanceOpponent(opponentIdx), 300)
          }
        } else {
          setTimeout(() => advanceOpponent(opponentIdx), 300)
        }
      }
    }, 500)
  }

  function advanceOpponent(currentIdx: number) {
    const nextIdx = currentIdx + 1
    if (nextIdx < 3) {
      setTimeout(() => opponentTurn(nextIdx), 400)
    } else {
      round.value++
      gamePhase.value = 'my_draw'
      hasDrawnThisTurn.value = false
      message.value = `第 ${round.value} 巡，你的回合，请摸牌`
    }
  }

  function selectOpponentDiscard(hand: Tile[], _visibleTiles: Tile[] = [], melds: Meld[] = []): Tile {
    const counts = new Map<string, number>()
    for (const t of hand) {
      const key = `${t.suit}_${t.number}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }

    const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
    const strategy = config.discardStrategy

    // 辅助函数：不打红中的过滤
    const noRed = (t: Tile) => t.suit !== TileSuit.RED_ZHONG

    // ========== 专家级：最优策略 ==========
    if (strategy === 'optimal') {
      const rec = analyzeDiscardOptions(hand, melds, deck.value)
      if (rec && rec.bestDiscard) {
        const target = hand.find(t => t.suit === rec.bestDiscard.discard.suit && t.number === rec.bestDiscard.discard.number)
        if (target) return target
      }
      // fallback 到 good 策略
    }

    // ========== 高手级：好策略 ==========
    if (strategy === 'good' || strategy === 'optimal') {
      // 优先打孤张
      const singles = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 1)
      if (singles.length > 0) {
        // 优先打边张（1,9），保留中间张（更容易成顺）
        const edgeSingles = singles.filter(t => t.number === 1 || t.number === 9)
        if (edgeSingles.length > 0) return edgeSingles[Math.floor(Math.random() * edgeSingles.length)]
        return singles[Math.floor(Math.random() * singles.length)]
      }
      // 其次拆对子，但优先拆边张对子
      const pairs = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 2)
      const edgePairs = pairs.filter(t => t.number === 1 || t.number === 9)
      if (edgePairs.length > 0) return edgePairs[Math.floor(Math.random() * edgePairs.length)]
      if (pairs.length > 0) return pairs[Math.floor(Math.random() * pairs.length)]
      // 最后打刻子
      const triples = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 3)
      if (triples.length > 0) return triples[Math.floor(Math.random() * triples.length)]
      const nonRed = hand.filter(noRed)
      if (nonRed.length > 0) return nonRed[Math.floor(Math.random() * nonRed.length)]
      return hand[0]
    }

    // ========== 入门级：随机策略 ==========
    if (strategy === 'random') {
      const singles = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 1)
      if (singles.length > 0 && Math.random() > 0.3) {
        return singles[Math.floor(Math.random() * singles.length)]
      }
      const pairs = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 2)
      if (pairs.length > 0 && Math.random() > 0.3) {
        return pairs[Math.floor(Math.random() * pairs.length)]
      }
      const triples = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 3)
      if (triples.length > 0) return triples[Math.floor(Math.random() * triples.length)]
      const nonRed = hand.filter(noRed)
      if (nonRed.length > 0) return nonRed[Math.floor(Math.random() * nonRed.length)]
      return hand[0]
    }

    // ========== 新手级：烂策略（故意打烂牌，让自己不容易胡）==========
    // 优先拆对子（给玩家碰的机会），其次打连张，最后才打孤张
    const pairs = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 2)
    if (pairs.length > 0) {
      return pairs[Math.floor(Math.random() * pairs.length)]
    }
    // 其次打有"搭子潜力"的牌（连张）
    const connected = hand.filter(t => {
      if (!noRed(t)) return false
      // 如果手中有相邻数字的牌（如手中有3筒，且还有2筒或4筒）
      return hand.some(o => o.suit === t.suit && o.number !== null && t.number !== null && Math.abs(o.number - t.number) === 1)
    })
    if (connected.length > 0) {
      return connected[Math.floor(Math.random() * connected.length)]
    }
    // 最后打孤张
    const singles = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 1)
    if (singles.length > 0) return singles[Math.floor(Math.random() * singles.length)]
    // 刻子
    const triples = hand.filter(t => noRed(t) && counts.get(`${t.suit}_${t.number}`) === 3)
    if (triples.length > 0) return triples[Math.floor(Math.random() * triples.length)]
    const nonRed = hand.filter(noRed)
    if (nonRed.length > 0) return nonRed[Math.floor(Math.random() * nonRed.length)]
    return hand[0]
  }

  // ===================== 重置 =====================
  function reset() {
    deck.value = createDeck()
    playerHand.value = []
    playerMelds.value = []
    playerRiver.value = []
    opponents.value = [
      { id: 0, name: '对手A', hand: [], melds: [], river: [] },
      { id: 1, name: '对手B', hand: [], melds: [], river: [] },
      { id: 2, name: '对手C', hand: [], melds: [], river: [] },
    ]
    round.value = 0
    currentOpponent.value = null
    history.value = []
    selectedTile.value = undefined
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    gamePhase.value = 'init'
    message.value = ''
  }

  function sortTiles(a: Tile, b: Tile): number {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return (a.number || 0) - (b.number || 0)
  }

  function setAIDifficulty(difficulty: AIDifficulty) {
    aiDifficulty.value = difficulty
  }

  return {
    deck, playerHand, playerMelds, playerRiver,
    opponents, round, currentOpponent, history,
    selectedTile, pendingPongTile, pendingGangTile, pendingFrom,
    gamePhase, message, hasDrawnThisTurn, aiDifficulty,
    waiting, probability, pongResult, gangResult,
    canDraw, canDiscard, canPong, canGang,
    shantenResult, effectiveDrawResult, discardRecommendation,
    startGame, draw, discard, pong, rejectPong, gang, rejectGang, win, rejectWin, reset,
    setAIDifficulty,
  }
})
