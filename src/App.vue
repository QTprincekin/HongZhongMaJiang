<template>
  <div class="app">
    <!-- 顶部导航 -->
    <header class="app-header">
      <div class="header-left">
        <span class="app-icon">🀄</span>
        <span class="app-title">红中麻将概率训练</span>
      </div>
      <div class="header-right">
        <div class="deck-counter">
          <span class="deck-label">牌堆</span>
          <span class="deck-value">{{ game.deck.remainingCount }}</span>
        </div>
        <div v-if="game.gamePhase !== 'init'" class="round-badge">
          <template v-if="game.totalRounds > 0">第 {{ game.currentRoundNumber }}/{{ game.totalRounds }} 把 · </template>
          第 {{ game.round }} 巡
        </div>
        <div class="phase-badge" :class="phaseClass">
          {{ phaseLabel }}
        </div>
        <button class="settings-btn" @click="showSettings = !showSettings" :class="{ active: showSettings }">
          ⚙️
        </button>
      </div>
    </header>

    <!-- LLM 配置面板 -->
    <transition name="slide">
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-header">
          <span class="settings-title">🤖 AI 配置</span>
          <button class="settings-close" @click="showSettings = false">✕</button>
        </div>
        <div class="settings-body">
          <label class="setting-item">
            <span class="setting-label">启用 AI</span>
            <input type="checkbox" v-model="llmConfig.enabled" @change="saveLLMConfig" />
          </label>
          <label class="setting-item" title="是否展示深度推理模型的思考推演过程">
            <span class="setting-label">显示推演</span>
            <input type="checkbox" v-model="llmConfig.showReasoning" @change="saveLLMConfig" />
          </label>
          <label class="setting-item full">
            <span class="setting-label">API 地址</span>
            <input type="text" v-model="llmConfig.apiUrl" placeholder="https://api.openai.com/v1/chat/completions" @blur="saveLLMConfig" />
          </label>
          <label class="setting-item full">
            <span class="setting-label">API Key</span>
            <input type="password" v-model="llmConfig.apiKey" placeholder="sk-..." @blur="saveLLMConfig" />
          </label>
          <label class="setting-item">
            <span class="setting-label">模型</span>
            <input type="text" v-model="llmConfig.model" placeholder="gpt-4o-mini" @blur="saveLLMConfig" />
          </label>
        </div>
      </div>
    </transition>

    <!-- 主内容 -->
    <main class="app-main">
      <!-- ========== 左侧面板 ========== -->
      <aside class="left-panel">
        <!-- 状态提示 -->
        <div class="status-card" :class="{ highlight: isPlayerTurn }">
          <div class="status-icon">{{ statusIcon }}</div>
          <div class="status-text">{{ game.message || '点击"开始游戏"开局' }}</div>
        </div>

        <!-- 副露区域 -->
        <div v-if="game.playerMelds.length > 0" class="melds-section">
          <div class="section-label">副露</div>
          <div class="melds-row">
            <div v-for="(meld, i) in game.playerMelds" :key="i" class="meld-item">
              <span class="meld-tag" :class="meld.type">{{ meldTypeLabel(meld.type) }}</span>
              <div class="meld-tiles">
                <TileView
                  v-for="j in (meld.type === 'concealed_gang' ? 4 : 3)"
                  :key="j"
                  :tile="meld.tile"
                  mini
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 手牌 -->
        <div class="hand-section">
          <div class="section-header">
            <div class="section-label">
              我的手牌
              <span v-if="game.waiting.isReady" class="ready-tag">🎯 听牌</span>
              <span v-else class="count-tag">{{ game.playerHand.length }}张</span>
            </div>
            <button class="copy-btn" :class="{ copied: copySuccess }" @click="copyHand">
              {{ copySuccess ? '✓ 已复制' : '📋 复制手牌' }}
            </button>
          </div>
          <div class="hand-tiles">
            <TileView
              v-for="tile in game.playerHand"
              :key="tile.id"
              :tile="tile"
              :selected="game.selectedTile?.id === tile.id"
              @click="selectTile(tile)"
            />
          </div>
        </div>

        <!-- 听牌提示 -->
        <div v-if="game.waiting.isReady" class="waiting-section animate-in">
          <div class="section-label">🎯 听牌 ({{ game.waiting.waitingCount }}张)</div>
          <div class="waiting-tiles">
            <TileView v-for="tile in game.waiting.waitingTiles" :key="tile.id" :tile="tile" mini />
          </div>
        </div>

        <!-- 操作区 -->
        <div class="action-section">
          <!-- 初始状态：开局设置面板 -->
          <GameSetupPanel
            v-if="game.gamePhase === 'init'"
            @start="onGameStart"
          />

          <!-- 摸牌阶段 -->
          <template v-else-if="game.gamePhase === 'my_draw'">
            <n-button
              type="warning"
              size="large"
              block
              :disabled="!game.canDraw"
              class="action-btn"
              @click="game.draw()"
            >
              🀄 摸牌
            </n-button>
          </template>

          <!-- 出牌阶段 -->
          <template v-else-if="game.gamePhase === 'my_discard'">
            <n-button
              type="info"
              size="large"
              block
              :disabled="!game.canDiscard || !game.selectedTile"
              class="action-btn"
              @click="game.discard(game.selectedTile!)"
            >
              🗑️ 打出 {{ game.selectedTile ? formatTile(game.selectedTile) : '' }}
            </n-button>
          </template>

          <!-- 碰杠决策 -->
          <template v-else-if="game.gamePhase === 'waiting_pong' || game.gamePhase === 'waiting_gang'">
            <div class="decision-buttons">
              <n-button
                v-if="game.gamePhase === 'waiting_pong'"
                type="success"
                size="large"
                @click="game.pong()"
              >
                ✅ 碰
              </n-button>
              <!-- 明杠：对手打出第 4 张（pendingFrom 有値） -->
              <n-button
                v-if="game.gamePhase === 'waiting_gang' && game.pendingFrom !== null"
                type="warning"
                size="large"
                @click="game.gang('exposed')"
              >
                🀄 明杠
              </n-button>
              <!-- 暗杠：自己摸到第 4 张（pendingFrom 为 null） -->
              <n-button
                v-if="game.gamePhase === 'waiting_gang' && game.pendingFrom === null"
                type="warning"
                size="large"
                @click="game.gang('concealed')"
              >
                🔒 暗杠
              </n-button>
              <!-- 跳过：根据阶段调用正确的 reject -->
              <n-button size="large" @click="game.gamePhase === 'waiting_gang' ? game.rejectGang() : game.rejectPong()">
                ❌ 跳过
              </n-button>
            </div>
          </template>

          <!-- 胡牌 -->
          <template v-else-if="game.gamePhase === 'waiting_win'">
            <n-button type="success" size="large" block class="win-btn" @click="game.win()">
              🎉 胡牌！
            </n-button>
            <n-button size="large" block @click="game.rejectWin()">
              继续
            </n-button>
          </template>

          <!-- 等待 -->
          <template v-else-if="game.gamePhase === 'opponent_turn'">
            <div class="waiting-indicator">
              <span class="pulse">⏳</span>
              <span>等待对手出牌...</span>
            </div>
          </template>

          <!-- 重开 -->
          <n-button
            v-if="game.gamePhase !== 'init'"
            type="default"
            size="small"
            block
            class="reset-btn"
            @click="game.reset()"
          >
            🔄 重新开始
          </n-button>
        </div>

        <!-- 记分面板 -->
        <ScorePanel
          v-if="game.totalRounds > 0 && game.gamePhase !== 'init'"
          :player-score="game.playerScore"
          :total-rounds="game.totalRounds"
          :current-round="game.currentRoundNumber"
          :round-history="game.roundHistory"
          :opponent-names="game.opponents.map((o: any) => o.name)"
        />
      </aside>

      <!-- ========== 中间面板 ========== -->
      <section class="center-panel">
        <!-- 河面 -->
        <div class="river-section">
          <div class="section-label">🌊 河面</div>
          <div class="opponents-grid">
            <div class="river-card me">
              <div class="river-header">
                <span class="river-name">我</span>
                <span class="river-count">{{ game.playerRiver.length }}张</span>
              </div>
              <div class="river-tiles">
                <TileView v-for="(tile, i) in game.playerRiver" :key="i" :tile="tile" small />
                <span v-if="!game.playerRiver.length" class="empty-hint">—</span>
              </div>
            </div>
            <div
              v-for="opp in game.opponents"
              :key="opp.id"
              class="river-card"
              :class="{ active: game.currentOpponent === opp.id }"
            >
              <div class="river-header">
                <span class="river-name">{{ opp.name }}</span>
                <span class="opp-hand-count">{{ opp.hand.length }}张</span>
                <span v-if="opp.lastDiscard" class="last-discard">
                  {{ formatTile(opp.lastDiscard) }}
                </span>
              </div>
              <!-- 对手副露展示 -->
              <div v-if="opp.melds.length > 0" class="opp-melds-row">
                <div v-for="(meld, mi) in opp.melds" :key="mi" class="opp-meld-item">
                  <span class="opp-meld-tag" :class="meld.type">{{ meldTypeLabel(meld.type) }}</span>
                  <div class="opp-meld-tiles">
                    <TileView
                      v-for="j in (meld.type === 'concealed_gang' ? 4 : 3)"
                      :key="j"
                      :tile="meld.tile"
                      mini
                    />
                  </div>
                </div>
              </div>
              <div class="river-tiles">
                <TileView v-for="(tile, i) in opp.river" :key="i" :tile="tile" small />
                <span v-if="!opp.river.length" class="empty-hint">—</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 概率面板（仅听牌时显示） -->
        <ProbPanel v-if="game.waiting.isReady" :probability="game.probability" />

        <!-- 有效进张面板 -->
        <EffectiveDrawPanel
          v-if="game.gamePhase !== 'init'"
          :shanten-result="game.shantenResult"
          :effective-result="game.effectiveDrawResult"
          :discard-result="game.discardRecommendation"
        />

        <!-- 碰决策 -->
        <DecisionPanel
          v-if="game.gamePhase === 'waiting_pong' && game.pongResult"
          type="pong"
          :decision="game.pongResult"
          :trigger-tile="game.pendingPongTile!"
          :round="game.round"
          :hand="game.playerHand"
          :visible-tiles="game.deck.visibleTiles"
          :deck-remaining="game.deck.remainingCount"
          :probability="game.probability"
          :llm-enabled="llm.isEnabled.value"
          @confirm="onPongConfirm"
          @request-a-i="openAIModal('pong_decision')"
        />

        <!-- 杠决策 -->
        <DecisionPanel
          v-if="game.gamePhase === 'waiting_gang' && game.gangResult"
          type="gang"
          :decision="game.gangResult"
          :trigger-tile="game.pendingGangTile!"
          :round="game.round"
          :hand="game.playerHand"
          :visible-tiles="game.deck.visibleTiles"
          :deck-remaining="game.deck.remainingCount"
          :probability="game.probability"
          :gang-type="currentGangType"
          :llm-enabled="llm.isEnabled.value"
          @confirm="onGangConfirm"
          @request-a-i="openAIModal('gang_decision')"
        />

        <!-- 模拟器 -->
        <div v-if="game.gamePhase !== 'init'" class="simulator-section">
          <div class="section-label">📈 蒙特卡洛模拟</div>
          <div class="sim-controls">
            <n-button size="small" :loading="sim.running.value" @click="runSimulator">
              {{ sim.running.value ? `模拟中 ${sim.progress.value}%` : '🔬 运行 10000 次' }}
            </n-button>
            <div v-if="sim.formattedResult.value" class="sim-result">
              <div class="sim-stat">
                <span class="stat-label">自摸率</span>
                <span class="stat-value prob-high">{{ sim.formattedResult.value.selfWinRate }}</span>
              </div>
              <div class="sim-stat">
                <span class="stat-label">平均巡数</span>
                <span class="stat-value">{{ sim.formattedResult.value.avgDraws }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 贝叶斯对手分析面板 -->
        <BayesianPanel
          v-if="game.gamePhase !== 'init'"
          :opponents="game.opponents"
          :history="game.history"
          :target-tiles="game.waiting.waitingTiles"
          :deck-remaining="game.deck.remainingCount"
        />
      </section>

      <!-- ========== 右侧面板 ========== -->
      <aside class="right-panel">
        <!-- AI 对话面板 -->
        <AIChatPanel
          :llm-enabled="llm.isEnabled.value"
          :current-hand="game.playerHand"
          :deck-remaining="game.deck.remainingCount"
          :melds="game.playerMelds"
          :round="game.round"
        />

        <div class="history-section">
          <div class="section-label">📜 操作记录</div>
          <div class="history-list">
            <div v-for="(action, i) in game.history.slice(-25)" :key="i" class="history-item">
              <span class="history-round">{{ action.round }}</span>
              <span class="history-type" :class="action.type">{{ actionLabel(action.type) }}</span>
              <span v-if="action.tile"><TileView :tile="action.tile" mini /></span>
              <span v-if="action.fromOpponent !== undefined" class="history-from">
                {{ game.opponents[action.fromOpponent]?.name }}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- AI 分析弹窗 -->
    <AIAnalysisModal
      v-if="showAIModal && aiModalContext"
      :visible="showAIModal"
      :context="aiModalContext"
      @close="showAIModal = false"
    />

    <!-- 对手胡牌亮牌弹窗 -->
    <OpponentWinModal
      v-if="game.opponentWinHand && game.gamePhase === 'ended'"
      :visible="!!game.opponentWinHand"
      :data="game.opponentWinHand"
      :opponent-name="getOpponentWinName()"
      :melds="getOpponentWinMelds()"
      :scoring-info="getScoringInfo()"
      @close="onWinModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'
import { useGameStore } from '@/stores/gameStore'
import { formatTile as _formatTile } from '@/algorithms/deck'

import TileView from '@/components/TileView.vue'
import ProbPanel from '@/components/ProbPanel.vue'
import DecisionPanel from '@/components/DecisionPanel.vue'
import EffectiveDrawPanel from '@/components/EffectiveDrawPanel.vue'
import BayesianPanel from '@/components/BayesianPanel.vue'
import AIAnalysisModal from '@/components/AIAnalysisModal.vue'
import AIChatPanel from '@/components/AIChatPanel.vue'
import GameSetupPanel from '@/components/GameSetupPanel.vue'
import ScorePanel from '@/components/ScorePanel.vue'
import OpponentWinModal from '@/components/OpponentWinModal.vue'
import { useLLM } from '@/composables/useLLM'
import { useSimulator } from '@/composables/useSimulator'
import type { Tile, LLMPromptContext, AIDifficulty, Meld } from '@/types'

const game = useGameStore()
const llm = useLLM()
const sim = useSimulator()

const showSettings = ref(false)
const copySuccess = ref(false)

// AI 弹窗状态
const showAIModal = ref(false)
const aiModalContext = ref<LLMPromptContext | null>(null)

const isPlayerTurn = computed(() =>
  ['my_draw', 'my_discard', 'waiting_pong', 'waiting_gang', 'waiting_win'].includes(game.gamePhase)
)

const statusIcon = computed(() => {
  const map: Record<string, string> = {
    init: '🎯',
    my_draw: '🀄',
    my_discard: '👆',
    opponent_turn: '⏳',
    waiting_pong: '❓',
    waiting_gang: '❓',
    waiting_win: '🎉',
    ended: '📊',
  }
  return map[game.gamePhase] || '🎯'
})

const phaseLabel = computed(() => {
  const map: Record<string, string> = {
    init: '等待开始',
    my_draw: '你的回合',
    my_discard: '你的回合',
    opponent_turn: '对手回合',
    waiting_pong: '碰杠决策',
    waiting_gang: '杠牌决策',
    waiting_win: '胡牌！',
    ended: '结束',
  }
  return map[game.gamePhase] || game.gamePhase
})

const phaseClass = computed(() => {
  const map: Record<string, string> = {
    init: '',
    my_draw: 'phase-draw',
    my_discard: 'phase-discard',
    opponent_turn: 'phase-opponent',
    waiting_pong: 'phase-decision',
    waiting_gang: 'phase-decision',
    waiting_win: 'phase-win',
    ended: 'phase-ended',
  }
  return map[game.gamePhase] || ''
})

async function copyHand() {
  const handText = game.playerHand.map(t => formatTile(t)).join('、')
  try {
    await navigator.clipboard.writeText(handText)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch (e) {
    console.error('复制失败', e)
  }
}


function selectTile(tile: any) {
  if (game.gamePhase !== 'my_discard') return
  game.selectedTile = game.selectedTile?.id === tile.id ? null : tile
}

function formatTile(tile: any): string { return _formatTile(tile) }

function meldTypeLabel(type: string): string {
  return { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠' }[type] || type
}

function actionLabel(type: string): string {
  return { draw: '摸', discard: '打', pong: '碰', gang: '杠', self_draw: '自摸' }[type] || type
}

function onPongConfirm(doIt: boolean) {
  doIt ? game.pong() : game.rejectPong()
}

function onGangConfirm(doIt: boolean) {
  // 根据 pendingFrom 判断明杠还是暗杠
  if (doIt) {
    const gangType = game.pendingFrom !== null ? 'exposed' : 'concealed'
    game.gang(gangType)
  } else {
    game.rejectGang()
  }
}

// 当前杠的类型（传给 DecisionPanel）
const currentGangType = computed(() =>
  game.pendingFrom !== null ? 'exposed' : 'concealed'
)

// 打开 AI 分析弹窗
function openAIModal(trigger: LLMPromptContext['trigger']) {
  aiModalContext.value = {
    trigger,
    currentHand: game.playerHand,
    visibleTiles: game.deck.visibleTiles,
    deckRemaining: game.deck.remainingCount,
    probabilityAnalysis: game.probability,
    pendingPong: game.pendingPongTile,
    pendingGang: game.pendingGangTile,
    melds: game.playerMelds,
    round: game.round,
  }
  showAIModal.value = true
}

async function runSimulator() {
  if (game.playerHand.length > 0) {
    await sim.runSimulator(game.playerHand as Tile[], 10000)
  }
}

const llmConfig = ref({ ...llm.config.value })
function saveLLMConfig() { llm.updateConfig(llmConfig.value) }

// 开局设置
function onGameStart(difficulty: AIDifficulty, rounds: number) {
  game.setAIDifficulty(difficulty)
  game.setTotalRounds(rounds)
  game.startGame()
}

// 对手胡牌亮牌弹窗辅助
function getOpponentWinName(): string {
  const data = game.opponentWinHand
  if (!data) return ''
  if (data.opponentId >= 3) return '你'
  return game.opponents[data.opponentId]?.name || '对手'
}

function getOpponentWinMelds(): Meld[] {
  const data = game.opponentWinHand
  if (!data) return []
  if (data.opponentId >= 3) return game.playerMelds
  return game.opponents[data.opponentId]?.melds || []
}

function getScoringInfo() {
  if (game.totalRounds === 0) return undefined
  const history = game.roundHistory
  if (history.length === 0) return undefined
  const last = history[history.length - 1]
  if (!last.bonusDrawTiles || last.bonusDrawTiles.length === 0) return undefined
  return {
    bonusDrawCount: last.bonusDrawCount || 0,
    bonusDrawTiles: last.bonusDrawTiles || [],
    hitCount: last.bonusHitCount || 0,
    hasRedZhong: last.hasRedZhong ?? true,
    winnerTotal: last.winnerScore || 0,
    streak: game.winStreak,
  }
}

function onWinModalClose() {
  game.confirmRoundEnd()
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);
}

/* ============================================================
   头部
   ============================================================ */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-icon {
  font-size: 28px;
  filter: drop-shadow(0 0 10px rgba(255,94,94,0.6));
}

.app-title {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.deck-counter {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 14px;
  background: var(--color-card);
  border-radius: 20px;
  border: 1px solid var(--color-border);
}

.deck-label {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.deck-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-accent);
  min-width: 28px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

.round-badge {
  padding: 5px 14px;
  background: var(--color-card);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.phase-badge {
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.phase-draw { background: var(--color-success); color: #0f0f1a; }
.phase-discard { background: var(--color-accent); color: #1a1a2e; }
.phase-opponent { background: var(--color-text-dim); color: #fff; }
.phase-decision { background: var(--color-primary); color: #fff; animation: pulse 1.5s infinite; }
.phase-win { background: var(--color-gold); color: #1a1a2e; animation: glow 1s infinite; }
.phase-ended { background: #57606f; color: #fff; }

.difficulty-select {
  background: rgba(255,255,255,0.1);
  color: #eaeaea;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
}
.difficulty-select:hover {
  background: rgba(255,255,255,0.18);
  border-color: rgba(255,255,255,0.3);
}
.difficulty-select option {
  background: #1a1f3a;
  color: #eaeaea;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover, .settings-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-card-hover);
}

/* ============================================================
   设置面板
   ============================================================ */
.settings-panel {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 20px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.settings-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
}

.settings-close:hover {
  background: var(--color-card);
  color: var(--color-text);
}

.settings-body {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-item.full {
  flex: 1;
  min-width: 200px;
}

.setting-label {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.setting-item input[type="text"],
.setting-item input[type="password"] {
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-card);
  color: var(--color-text);
  font-size: 12px;
  min-width: 180px;
}

.setting-item.full input {
  width: 100%;
}

.setting-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

/* ============================================================
   主布局 — 三栏升级版
   ============================================================ */
.app-main {
  display: grid;
  grid-template-columns: 360px 1fr 320px;
  gap: 14px;
  padding: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.left-panel, .right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
}

.center-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

/* ============================================================
   通用 Section 样式
   ============================================================ */
.section-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header .section-label {
  margin-bottom: 0;
}

/* ============================================================
   状态卡片
   ============================================================ */
.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-card);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  transition: all 0.3s;
}

.status-card.highlight {
  background: linear-gradient(135deg, var(--color-card), rgba(255,94,94,0.08));
  border-color: var(--color-primary);
  box-shadow: 0 0 20px rgba(255,94,94,0.18);
}

.status-icon {
  font-size: 30px;
  flex-shrink: 0;
}

.status-text {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

/* ============================================================
   副露
   ============================================================ */
.melds-section, .hand-section, .waiting-section, .switch-section, .action-section {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 16px 18px;
  border: 1px solid var(--color-border);
}

.count-tag {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
  background: var(--color-surface);
  padding: 2px 10px;
  border-radius: 10px;
  margin-left: 6px;
}

.ready-tag {
  font-size: 12px;
  color: var(--color-success);
  font-weight: 600;
  background: rgba(61,217,192,0.12);
  padding: 2px 10px;
  border-radius: 10px;
  margin-left: 6px;
  animation: pulse 2s infinite;
}

.melds-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.meld-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meld-tag {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
}

.meld-tag.pong { background: var(--color-success); color: #0f0f1a; }
.meld-tag.exposed_gang { background: var(--color-accent); color: #1a1a2e; }
.meld-tag.concealed_gang { background: var(--color-primary); color: #fff; }

.meld-tiles {
  display: flex;
  gap: 2px;
}

/* ============================================================
   手牌
   ============================================================ */
.hand-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.copy-btn {
  font-size: 13px;
  padding: 5px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 7px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.copy-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.copy-btn.copied {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}

/* ============================================================
   听牌
   ============================================================ */
.waiting-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ============================================================
   换向
   ============================================================ */
.switch-verdict {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 6px;
  color: var(--color-danger);
}

.switch-verdict.good {
  color: var(--color-success);
}

.switch-reason {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ============================================================
   操作区
   ============================================================ */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.start-btn, .action-btn {
  font-size: 18px;
  height: 54px;
  font-weight: 700;
}

.decision-buttons {
  display: flex;
  gap: 10px;
}

.decision-buttons .n-button {
  flex: 1;
  height: 52px;
  font-size: 17px;
  font-weight: 700;
}

.win-btn {
  font-size: 18px !important;
  font-weight: bold !important;
  background: linear-gradient(135deg, var(--color-gold), var(--color-accent)) !important;
  color: #1a1a2e !important;
}

.waiting-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.reset-btn {
  margin-top: 4px;
  color: #fff !important;
}

/* ============================================================
   河面
   ============================================================ */
.river-section {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 16px 18px;
  border: 1px solid var(--color-border);
}

.opponents-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.river-card {
  padding: 12px 14px;
  background: var(--color-surface);
  border-radius: 10px;
  border: 1px solid var(--color-border);
  min-height: 80px;
  transition: border-color 0.2s;
}

.river-card.me {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-card), rgba(255,94,94,0.06));
}

.river-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(247,201,72,0.2);
}

.river-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.river-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.river-count {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.last-discard {
  font-size: 12px;
  font-weight: bold;
  color: var(--color-primary);
}

.opp-hand-count {
  font-size: 11px;
  color: var(--color-text-dim);
  font-weight: 600;
  background: var(--color-card);
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: auto;
  margin-right: 4px;
}

/* 对手副露 */
.opp-melds-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  padding: 4px 0;
  border-bottom: 1px dashed var(--color-border);
}

.opp-meld-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opp-meld-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  text-align: center;
  font-weight: 600;
}

.opp-meld-tag.pong { background: var(--color-success); color: #0f0f1a; }
.opp-meld-tag.exposed_gang { background: var(--color-accent); color: #1a1a2e; }
.opp-meld-tag.concealed_gang { background: var(--color-primary); color: #fff; }

.opp-meld-tiles {
  display: flex;
  gap: 1px;
}

.river-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  min-height: 36px;
  align-items: center;
}

.empty-hint {
  color: var(--color-text-dim);
  font-size: 12px;
}

/* ============================================================
   模拟器
   ============================================================ */
.simulator-section {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 16px 18px;
  border: 1px solid var(--color-border);
}

.sim-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sim-result {
  display: flex;
  gap: 24px;
}

.sim-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
}

/* ============================================================
   历史记录
   ============================================================ */
.history-section {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.history-section .section-label {
  flex-shrink: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  flex: 1;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s;
}

.history-item:hover {
  background: var(--color-surface);
  border-radius: 6px;
}

.history-round {
  color: var(--color-text-muted);
  min-width: 20px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.history-type {
  min-width: 24px;
  font-weight: 700;
  font-size: 13px;
}

.history-type.draw { color: var(--color-success); }
.history-type.discard { color: var(--color-text-secondary); }
.history-type.pong { color: var(--color-primary); }
.history-type.gang { color: var(--color-accent); }
.history-type.self_draw { color: var(--color-gold); }

.history-from {
  color: var(--color-text-muted);
  font-size: 12px;
  margin-left: auto;
}

/* ============================================================
   动画
   ============================================================ */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px var(--color-gold); }
  50% { box-shadow: 0 0 20px var(--color-gold), 0 0 30px var(--color-gold); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeIn 0.3s ease forwards;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

@media (max-width: 1280px) {
  .app-main {
    grid-template-columns: 320px 1fr 290px;
  }
}

@media (max-width: 1024px) {
  .app-main {
    grid-template-columns: 290px 1fr;
    grid-template-rows: auto auto;
  }
  .right-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .app-header { padding: 10px 14px; gap: 8px; }
  .app-title { font-size: 16px; }
  .header-right { gap: 8px; }
  .deck-value { font-size: 16px; }
  .round-badge, .phase-badge { font-size: 11px; padding: 3px 10px; }

  .app-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
    padding: 10px;
    overflow-y: auto;
  }

  .left-panel, .center-panel, .right-panel { overflow: visible; }
  .status-icon { font-size: 24px; }
  .status-text { font-size: 15px; }
  .stat-value { font-size: 22px; }

  .settings-body { flex-direction: column; align-items: stretch; gap: 10px; }
  .setting-item.full { min-width: auto; }
}

@media (max-width: 480px) {
  .app-title { display: none; }
  .round-badge { display: none; }
}
</style>
