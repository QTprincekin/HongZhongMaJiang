// ============================================================
// 游戏状态管理 - 回合制 + 对手AI
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  Tile, TileSuit, DeckState, Meld, GameAction,
  ProbabilityState, PongDecision, GangDecision,
  AIDifficulty, AI_DIFFICULTY_CONFIG, RoundResult,
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

  // 圈数系统
  const totalRounds = ref<number>(0)   // 0=不记分/无限
  const currentRoundNumber = ref<number>(1)

  // 对手亮牌（对手胡牌时记录其手牌）
  const opponentWinHand = ref<{ opponentId: number; tiles: Tile[]; isSelfDraw: boolean } | null>(null)

  // 对手碰杠响应状态（玩家出牌后，对手依次响应）
  const opponentPendingPong = ref<{ opponentId: number; tile: Tile } | null>(null)
  const opponentPendingGang = ref<{ opponentId: number; tile: Tile } | null>(null)

  // 对手出牌后，轮到哪个对手响应（0/1/2，-1=全部响应完）
  const opponentResponseIdx = ref<number>(0)

  // 碰/杠提示来源：'player_discard' = 玩家出牌后的对手响应链，'opponent_discard' = 对手出牌后的链末尾
  const pongGangSource = ref<'player_discard' | 'opponent_discard'>('player_discard')
  // 对手杠牌待处理标志（防止 rejectGang 后 doOpponentGang 仍执行）
  const opponentGangPending = ref<boolean>(false)
  // 每个玩家的累计得分（每人初始900分）
  const INITIAL_SCORE = 900
  const playerScore = ref<Record<number, number>>({ 0: INITIAL_SCORE, 1: INITIAL_SCORE, 2: INITIAL_SCORE, 3: INITIAL_SCORE })
  // 每局胡牌记录（用于战后回顾）
  const roundHistory = ref<RoundResult[]>([])
  // 连胜追踪
  const lastWinner = ref<number>(-1)   // 上局赢家，-1=无
  const winStreak = ref<number>(0)     // 当前连胜次数

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
    currentRoundNumber.value = 1
    currentOpponent.value = null
    selectedTile.value = undefined
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    opponentWinHand.value = null
    opponentPendingPong.value = null
    opponentPendingGang.value = null
    opponentResponseIdx.value = -1
    opponentGangPending.value = false
    if (totalRounds.value > 0) {
      playerScore.value = { 0: INITIAL_SCORE, 1: INITIAL_SCORE, 2: INITIAL_SCORE, 3: INITIAL_SCORE }
      roundHistory.value = []
      lastWinner.value = -1
      winStreak.value = 0
    }
    gamePhase.value = 'my_draw'
    message.value = `第 ${round.value} 巡，你的回合，请摸牌`
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
    // 玩家出牌后，对手依次响应（碰→杠），最后才到玩家下一巡
    startOpponentResponsesAfterPlayerDiscard(tile)
  }

  // 玩家出牌后，按顺序让对手响应（碰→杠）
  function startOpponentResponsesAfterPlayerDiscard(tile: Tile) {
    opponentResponseIdx.value = 0
    gamePhase.value = 'opponent_turn'
    setTimeout(() => opponentRespondToPlayerDiscard(tile, 0), 400)
  }

  // 对手依次响应玩家出牌（碰/杠）
  // 注意：碰/杠后该牌已被取走，其他对手无法再碰同一张牌，所以碰/杠后应 return
  function opponentRespondToPlayerDiscard(tile: Tile, oppIdx: number) {
    if (oppIdx >= 3) {
      // 所有对手都不碰不杠，轮到对手们依次摸牌出牌
      nextTurn()
      return
    }
    if (gamePhase.value === 'ended') return

    const opp = opponents.value[oppIdx]
    const handCount = countTiles(opp.hand, tile.suit, tile.number)

    if (handCount >= 2) {
      // 可以碰
      opponentPendingPong.value = { opponentId: oppIdx, tile }
      const canGang = handCount >= 3

      if (canGang) {
        opponentPendingGang.value = { opponentId: oppIdx, tile }
        // 让对手决定碰 or 杠
        const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
        const gangResult = opponentGangDecision(opp.hand, opp.melds, tile, deck.value)

        if (gangResult.should && config.discardStrategy !== 'bad') {
          // 对手选择杠 → 杠后补摸出牌 → 出牌触发新响应链
          doOpponentGang(oppIdx, tile, 'exposed')
          return
        }
        // 对手选择碰 → 碰后出牌 → 出牌触发新响应链
        doOpponentPong(oppIdx, tile)
        return
      } else {
        // 只可以碰
        opponentPendingGang.value = null
        const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
        const shouldPong = config.discardStrategy === 'bad'
          ? Math.random() > 0.3
          : true

        if (shouldPong) {
          doOpponentPong(oppIdx, tile)
          return
        } else {
          opp.lastDiscard = tile
          setTimeout(() => opponentRespondToPlayerDiscard(tile, oppIdx + 1), 200)
        }
      }
    } else {
      setTimeout(() => opponentRespondToPlayerDiscard(tile, oppIdx + 1), 200)
    }
  }

  function doOpponentPong(oppIdx: number, tile: Tile) {
    const opp = opponents.value[oppIdx]
    let removed = 0
    opp.hand = opp.hand.filter(t => {
      if (removed < 2 && tilesEqual(t, tile)) { removed++; return false }
      return true
    })
    // 碰来的牌直接进 meld，不进手牌
    opp.melds.push({ type: 'pong', tile, fromOpponent: false })
    opp.lastDiscard = undefined
    opponentPendingPong.value = null
    opponentPendingGang.value = null
    message.value = `${opp.name} 碰 ${formatTile(tile)}`
    // 对手碰完后需要打出一张（手牌11张，出1张=10张，+meld3=13）
    setTimeout(() => opponentDiscardAfterPong(oppIdx), 600)
  }

  function doOpponentGang(oppIdx: number, tile: Tile, gangType: 'exposed' | 'concealed') {
    opponentGangPending.value = true
    const opp = opponents.value[oppIdx]
    if (gangType === 'exposed') {
      // 明杠：手牌3张 + 出牌者1张 = exposed_gang meld
      // 手牌 13 - 3 = 10，补摸1 = 11，出1 = 10，+meld4 = 14
      opp.hand = removeTiles(opp.hand, tile.suit, tile.number, 3)
      opp.melds.push({ type: 'exposed_gang', tile, fromOpponent: false })
    } else {
      // 暗杠：手牌4张
      opp.hand = removeTiles(opp.hand, tile.suit, tile.number, 4)
      opp.melds.push({ type: 'concealed_gang', tile, fromOpponent: false })
    }
    opponentPendingPong.value = null
    opponentPendingGang.value = null
    message.value = `${opp.name} 杠 ${formatTile(tile)}，补摸中...`
    // 杠后补摸
    setTimeout(() => opponentGangDrawAndDiscard(oppIdx), 600)
  }

  function opponentGangDecision(hand: Tile[], _melds: Meld[], tile: Tile, _deck: DeckState) {
    // 高手/专家选择明杠的条件：手牌数>=14，有刻子，杠后摸牌有改善
    const hasTriple = countTiles(hand, tile.suit, tile.number) >= 3
    return { should: hasTriple }
  }

  function opponentGangDrawAndDiscard(oppIdx: number) {
    if (!opponentGangPending.value) return  // 杠已被取消（玩家拒绝等）
    opponentGangPending.value = false
    if (deck.value.tiles.length === 0) { endRound(-1, false) ; return }  // 流局
    const { tile: drawn, deck: newDeck } = gangDraw(deck.value)
    deck.value = newDeck
    opponents.value[oppIdx].hand.push(drawn)
    message.value = `${opponents.value[oppIdx].name} 补摸 ${formatTile(drawn)}，出牌中...`
    setTimeout(() => opponentDiscardAfterPong(oppIdx), 400)
  }

  function opponentDiscardAfterPong(oppIdx: number) {
    if (gamePhase.value === 'ended') return
    const opp = opponents.value[oppIdx]
    if (opp.hand.length === 0) return

    const visibleTiles = deck.value.visibleTiles || []
    const discardTile = selectOpponentDiscard(opp.hand, visibleTiles, opp.melds)
    const idx = opp.hand.findIndex(t => t.id === discardTile.id)
    if (idx >= 0) {
      opp.hand.splice(idx, 1)
      opp.river.push(discardTile)
      opp.lastDiscard = discardTile
      deck.value = addVisibleTile(deck.value, discardTile)
      history.value.push({ type: 'discard', tile: discardTile, round: round.value, fromOpponent: oppIdx })
      message.value = `${opp.name} 打出 ${formatTile(discardTile)}`
      // 对手碰/杠后出牌，同样走响应链（其他对手 → 玩家）
      setTimeout(() => opponentRespondToDiscard(discardTile, oppIdx, 0), 300)
    }
  }

  // 检查玩家是否可以碰/杠某张对手打出的牌
  // 注意：此函数在 opponentRespondToDiscard 链末尾调用（所有对手已检查完）
  // 所以玩家拒绝后，应该进入下家摸牌阶段
  function checkPlayerPongGang(tile: Tile, fromOppIdx: number) {
    pongGangSource.value = 'opponent_discard'
    const handCount = countTiles(playerHand.value, tile.suit, tile.number)
    if (handCount >= 3) {
      pendingGangTile.value = tile
      pendingFrom.value = fromOppIdx
      gamePhase.value = 'waiting_gang'
      message.value = `${opponents.value[fromOppIdx].name} 打出 ${formatTile(tile)}，你可以杠！`
    } else if (handCount >= 2) {
      pendingPongTile.value = tile
      pendingFrom.value = fromOppIdx
      gamePhase.value = 'waiting_pong'
      message.value = `${opponents.value[fromOppIdx].name} 打出 ${formatTile(tile)}，你可以碰！`
    } else {
      // 玩家不碰/杠，轮到出牌者的下家摸牌
      advanceOpponent(fromOppIdx)
    }
  }

  function startNextRoundAfterResponses() {
    if (deck.value.tiles.length === 0) {
      endRound(-1, false)  // 流局
      return
    }
    round.value++
    opponentResponseIdx.value = -1
    gamePhase.value = 'my_draw'
    hasDrawnThisTurn.value = false
    message.value = `第 ${round.value} 巡，你的回合，请摸牌`
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
    const source = pongGangSource.value
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null

    gamePhase.value = 'opponent_turn'
    if (source === 'opponent_discard') {
      // 来自 opponentRespondToDiscard 链末尾（对手出牌后所有对手已检查完）
      // 拒绝后进入下家摸牌
      if (fromIdx !== null) {
        advanceOpponent(fromIdx)
      } else {
        nextTurn()
      }
    } else {
      // 来自 opponentRespondToPlayerDiscard（玩家出牌后的对手响应链）
      // 但实际上，opponentRespondToPlayerDiscard 中对手碰杠后直接 return，
      // 不会再触发玩家碰杠提示。所以这个分支不应该走到。
      // 如果走到，说明是对手不碰，所有对手都不碰后 startNextRoundAfterResponses
      // 这种情况下不会进入 waiting_pong 状态，所以不会调用 rejectPong
      // 安全回退：进入下一巡
      startNextRoundAfterResponses()
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
    const source = pongGangSource.value
    pendingGangTile.value = undefined
    pendingFrom.value = null
    opponentGangPending.value = false

    if (fromIdx !== null) {
      gamePhase.value = 'opponent_turn'
      if (source === 'opponent_discard') {
        // 对手出牌后的链末尾 → 拒绝杠后进入下家摸牌
        advanceOpponent(fromIdx)
      } else {
        // 不应到达（玩家出牌后对手响应链中不会触发玩家杠提示）
        startNextRoundAfterResponses()
      }
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
      endRound(-1, false)  // 流局
      return
    }
    gamePhase.value = 'opponent_turn'
    setTimeout(() => opponentTurn(0), 400)
  }

  // ===================== 对手AI =====================
  // 对手回合：摸牌 → (碰杠响应) → 出牌 → (玩家碰杠) → 下一对手
  function opponentTurn(opponentIdx: number) {
    if (gamePhase.value === 'ended') return
    const opp = opponents.value[opponentIdx]
    if (!opp) return

    if (deck.value.tiles.length === 0) {
      endRound(-1, false)
      return
    }

    // 摸牌
    const { tile: drawn, deck: newDeck } = drawTile(deck.value)
    deck.value = newDeck
    opp.hand.push(drawn)
    currentOpponent.value = opponentIdx
    message.value = `${opp.name} 摸牌`

    setTimeout(() => {
      // 1. 检查自摸胡牌
      const oppWaiting = analyzeWaiting(opp.hand, opp.melds)
      if (oppWaiting.isReady) {
        const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
        const roll = Math.random()
        if (roll < config.winChance) {
          // AI 自摸胡牌
          endRound(opponentIdx, true, drawn)
          return
        }
      }

      // 2. 对手摸牌后，出牌前，检查是否有人对自己打出牌可碰/杠（这里只有对手间碰杠）
      // 对手之间的碰杠在出牌响应链中处理

      // 3. 出牌
      const visibleTiles = deck.value.visibleTiles || []
      const discardTile = selectOpponentDiscard(opp.hand, visibleTiles, opp.melds)
      doOpponentDiscard(opponentIdx, discardTile)
    }, 500)
  }

  // 对手正式打出一张牌
  function doOpponentDiscard(opponentIdx: number, discardTile: Tile) {
    const opp = opponents.value[opponentIdx]
    const idx = opp.hand.findIndex(t => t.id === discardTile.id)
    if (idx < 0) return
    opp.hand.splice(idx, 1)
    opp.river.push(discardTile)
    opp.lastDiscard = discardTile
    deck.value = addVisibleTile(deck.value, discardTile)
    history.value.push({ type: 'discard', tile: discardTile, round: round.value, fromOpponent: opponentIdx })
    message.value = `${opp.name} 打出 ${formatTile(discardTile)}`

    // 对手出牌后：先检查其他对手碰/杠，再检查玩家碰/杠，最后下家摸牌
    setTimeout(() => opponentRespondToDiscard(discardTile, opponentIdx, 0), 300)
  }

  // 通用响应链：对手出牌后，其他对手+玩家依次响应碰/杠
  // discarderIdx = 出牌者, checkIdx = 当前检查的对手序号(0/1/2)
  function opponentRespondToDiscard(tile: Tile, discarderIdx: number, checkIdx: number) {
    if (gamePhase.value === 'ended') return

    // 跳过出牌者自己
    if (checkIdx === discarderIdx) {
      setTimeout(() => opponentRespondToDiscard(tile, discarderIdx, checkIdx + 1), 100)
      return
    }

    // 所有对手都检查完，轮到玩家
    if (checkIdx >= 3) {
      checkPlayerPongGang(tile, discarderIdx)
      return
    }

    // 检查该对手是否可以碰/杠
    const opp = opponents.value[checkIdx]
    const handCount = countTiles(opp.hand, tile.suit, tile.number)

    if (handCount >= 2) {
      const canGang = handCount >= 3
      if (canGang) {
        const gangResult = opponentGangDecision(opp.hand, opp.melds, tile, deck.value)
        const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
        if (gangResult.should && config.discardStrategy !== 'bad') {
          // 对手选择杠
          doOpponentGang(checkIdx, tile, 'exposed')
          // 杠后该对手补摸出牌 → 出牌后继续响应链（从出牌者下家开始）
          return
        }
      }
      // 碰牌决策
      const config = AI_DIFFICULTY_CONFIG[aiDifficulty.value]
      const shouldPong = config.discardStrategy === 'bad'
        ? Math.random() > 0.3
        : true
      if (shouldPong) {
        doOpponentPong(checkIdx, tile)
        // 碰后该对手出牌 → opponentDiscardAfterPong 会继续响应链
        return
      }
    }
    // 该对手不碰/杠，检查下一个对手
    setTimeout(() => opponentRespondToDiscard(tile, discarderIdx, checkIdx + 1), 200)
  }

  // advanceOpponent：出牌者的下家开始摸牌
  // currentIdx = 刚出牌的对手索引(0/1/2)
  // 下家 = currentIdx + 1，如果 >= 3 则轮到玩家
  function advanceOpponent(currentIdx: number) {
    const nextIdx = currentIdx + 1
    if (nextIdx < 3) {
      // 下家是对手，对手摸牌出牌
      setTimeout(() => opponentTurn(nextIdx), 400)
    } else {
      // 下家是玩家，进入玩家摸牌阶段
      startNextRoundAfterResponses()
    }
  }

  // ===================== 一局结束 & 游戏结束 =====================
  function endRound(winner: number, isSelfDraw: boolean, winTile?: Tile) {
    // 记录该局结果
    const result: RoundResult = {
      roundNumber: round.value,
      winner,
      isSelfDraw,
      winTile,
      scoreChanges: { 0: 0, 1: 0, 2: 0, 3: 0 },
    }

    if (winner >= 0) {
      opponentWinHand.value = {
        opponentId: winner,
        tiles: winner < 3 ? opponents.value[winner].hand : [...playerHand.value],
        isSelfDraw,
      }
      message.value = winner < 3
        ? `${opponents.value[winner].name} ${isSelfDraw ? '自摸' : '胡牌'}！`
        : `你 ${isSelfDraw ? '自摸' : '胡牌'}！`
    } else {
      opponentWinHand.value = null
      message.value = '流局，牌堆已空'
    }

    // 记分模式：抓马计分
    if (totalRounds.value > 0 && winner >= 0) {
      // 获取赢家手牌（含副露），判断是否有红中
      const winnerHand = winner < 3 ? opponents.value[winner].hand : playerHand.value
      const winnerMelds = winner < 3 ? opponents.value[winner].melds : playerMelds.value
      const hasZhong = checkHasRedZhong(winnerHand, winnerMelds)

      // 计算连胜
      if (lastWinner.value === winner) {
        winStreak.value++
      } else {
        winStreak.value = 1
        lastWinner.value = winner
      }

      const scoreResult = calcRoundScore(winner, hasZhong, winStreak.value)
      result.scoreChanges = scoreResult.scores
      result.bonusDrawCount = scoreResult.drawCount
      result.bonusDrawTiles = scoreResult.drawnTiles
      result.bonusHitCount = scoreResult.hitCount
      result.hasRedZhong = hasZhong
      result.winnerScore = scoreResult.winnerTotal
      for (const [pid, sc] of Object.entries(scoreResult.scores)) {
        playerScore.value[Number(pid)] += sc
      }
    } else if (winner < 0) {
      // 流局：连胜中断
      lastWinner.value = -1
      winStreak.value = 0
    }
    roundHistory.value.push(result)
    // 总是先停在 ended 状态，等玩家确认亮牌弹窗后再继续
    gamePhase.value = 'ended'
  }


  // 玩家确认亮牌弹窗后调用：决定是否进入下一局
  function confirmRoundEnd() {
    opponentWinHand.value = null
    if (totalRounds.value === 0) {
      // 不记分模式：单局结束，回到初始
      gamePhase.value = 'init'
      message.value = ''
      return
    }
    if (currentRoundNumber.value >= totalRounds.value) {
      // 所有圈数打完
      gamePhase.value = 'ended'
      message.value = '游戏结束！最终成绩已出'
      return
    }
    // 还有下一局
    startNextRound()
  }

  function startNextRound() {
    // 重置牌堆和各玩家手牌，开始下一把
    currentRoundNumber.value++
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
    round.value = 1
    history.value = []
    opponentWinHand.value = null
    opponentPendingPong.value = null
    opponentPendingGang.value = null
    opponentResponseIdx.value = -1
    selectedTile.value = undefined
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    gamePhase.value = 'my_draw'
    message.value = `第 ${currentRoundNumber.value} 把 · 第 ${round.value} 巡，请摸牌`
  }

  // 检查胡牌时手中是否有红中（手牌 + 副露中的红中）
  function checkHasRedZhong(hand: Tile[], melds: Meld[]): boolean {
    if (hand.some(t => t.suit === TileSuit.RED_ZHONG)) return true
    if (melds.some(m => m.tile.suit === TileSuit.RED_ZHONG)) return true
    return false
  }

  // 判断牌是否为目标牌（1/5/9 + 红中）
  function isBonusTile(tile: Tile): boolean {
    if (tile.suit === TileSuit.RED_ZHONG) return true
    if (tile.number === 1 || tile.number === 5 || tile.number === 9) return true
    return false
  }

  // 抓马记分算法
  function calcRoundScore(
    winner: number,
    hasRedZhong: boolean,
    streak: number
  ): {
    scores: Record<number, number>
    drawCount: number
    drawnTiles: Tile[]
    hitCount: number
    winnerTotal: number
  } {
    const scores: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }

    // 1. 底分 10 分
    let total = 10

    // 2. 计算抓马个数：基础4个 + 连胜加成(每连胜+2) + 无红中加成(+2)
    let drawCount = 4 + (streak - 1) * 2
    if (!hasRedZhong) drawCount += 2

    // 3. 从牌堆顺序抓马
    const drawnTiles: Tile[] = []
    const remaining = deck.value.tiles
    const actualDraw = Math.min(drawCount, remaining.length)
    for (let i = 0; i < actualDraw; i++) {
      drawnTiles.push(remaining[i])
    }

    // 4. 统计命中目标牌数
    const hitCount = drawnTiles.filter(t => isBonusTile(t)).length
    total += hitCount * 10

    // 5. 赢家得分，其他三家各扣 total
    scores[winner] = total * 3  // 向三家收
    for (let i = 0; i < 4; i++) {
      if (i !== winner) scores[i] = -total
    }

    return { scores, drawCount, drawnTiles, hitCount, winnerTotal: total * 3 }
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
    currentRoundNumber.value = 1
    currentOpponent.value = null
    history.value = []
    selectedTile.value = undefined
    pendingPongTile.value = undefined
    pendingGangTile.value = undefined
    pendingFrom.value = null
    hasDrawnThisTurn.value = false
    opponentWinHand.value = null
    opponentPendingPong.value = null
    opponentPendingGang.value = null
    opponentResponseIdx.value = -1
    opponentGangPending.value = false
    playerScore.value = { 0: 0, 1: 0, 2: 0, 3: 0 }
    roundHistory.value = []
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

  function setTotalRounds(rounds: number) {
    totalRounds.value = rounds
  }

  return {
    deck, playerHand, playerMelds, playerRiver,
    opponents, round, currentOpponent, history,
    selectedTile, pendingPongTile, pendingGangTile, pendingFrom,
    gamePhase, message, hasDrawnThisTurn, aiDifficulty,
    totalRounds, currentRoundNumber, playerScore, roundHistory,
    winStreak, lastWinner,
    opponentWinHand, opponentPendingPong, opponentPendingGang,
    waiting, probability, pongResult, gangResult,
    canDraw, canDiscard, canPong, canGang,
    shantenResult, effectiveDrawResult, discardRecommendation,
    startGame, draw, discard, pong, rejectPong, gang, rejectGang, win, rejectWin, reset,
    setAIDifficulty, setTotalRounds, confirmRoundEnd,
  }
})
