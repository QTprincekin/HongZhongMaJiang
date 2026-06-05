<template>
  <n-modal v-model:show="showModal" :mask-closable="false">
    <div class="god-view-box">
      <!-- 头部 -->
      <div class="god-view-header">
        <div class="header-left">
          <span class="header-logo">👁️</span>
          <span class="header-title">上帝视角对局复盘</span>
          <span class="header-mode-badge">{{ gameMode === 'hongzhong_gang' ? '红中杠麻' : '红中麻将' }}</span>
        </div>
        <button class="god-close-btn" @click="handleClose">✕</button>
      </div>

      <!-- 主体内容 -->
      <div class="god-view-body">
        <!-- 左侧：图形化回放区 -->
        <div class="replay-panel">
          <div class="panel-section-title">🕒 决策时序回放</div>
          
          <!-- 回放控制条 -->
          <div v-if="replaySteps.length > 0" class="replay-controls">
            <div class="control-buttons">
              <button 
                class="control-btn" 
                :disabled="currentStep === 0" 
                @click="prevStep"
              >
                ◀ 上一步
              </button>
              <span class="step-indicator">
                步骤 {{ currentStep + 1 }} / {{ replaySteps.length }}
              </span>
              <button 
                class="control-btn" 
                :disabled="currentStep === replaySteps.length - 1" 
                @click="nextStep"
              >
                下一步 ▶
              </button>
            </div>
            
            <!-- 滑动进度条 -->
            <input 
              v-model.number="currentStep"
              type="range" 
              min="0" 
              :max="replaySteps.length - 1" 
              class="step-slider"
            />
          </div>

          <!-- 当前步骤详情 -->
          <div v-if="activeStep" class="step-detail-card">
            <!-- 动作标签 -->
            <div class="step-meta">
              <span class="step-round-badge">第 {{ activeStep.round }} 巡</span>
              <span class="step-action-tag" :class="activeStep.type">
                {{ getActionName(activeStep) }}
              </span>
            </div>

            <!-- 当前手牌 -->
            <div class="snapshot-area">
              <div class="snapshot-label">当时手牌 ({{ activeStep.handSnapshot?.length || 0 }}张)</div>
              <div class="snapshot-tiles">
                <TileView 
                  v-for="tile in activeStep.handSnapshot" 
                  :key="tile.id" 
                  :tile="tile" 
                  :class="{ Highlighted: isActionTile(tile, activeStep) }"
                />
              </div>
            </div>

            <!-- 当前副露 -->
            <div v-if="activeStep.meldsSnapshot && activeStep.meldsSnapshot.length > 0" class="snapshot-area">
              <div class="snapshot-label">当时副露 ({{ activeStep.meldsSnapshot.length }}组)</div>
              <div class="snapshot-melds">
                <div v-for="(meld, i) in activeStep.meldsSnapshot" :key="i" class="meld-group">
                  <span class="meld-tag" :class="meld.type">{{ meldLabel(meld.type) }}</span>
                  <div class="meld-tiles">
                    <TileView 
                      v-for="j in getMeldTileCount(meld.type)" 
                      :key="j" 
                      :tile="meld.tile" 
                      mini
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-steps-placeholder">
            暂无记录的对局操作步骤。
          </div>
        </div>

        <!-- 右侧：AI 诊断区 -->
        <div class="ai-report-panel">
          <div class="panel-section-title">🤖 AI 总教练诊断书</div>

          <!-- 加载中 -->
          <div v-if="loading" class="ai-loading-state">
            <div class="skeleton-ring"></div>
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p class="loading-text">上帝分析中，正在推算最优出牌路径...</p>
          </div>

          <!-- 分析出错 -->
          <div v-else-if="errorMsg" class="ai-error-state">
            <span class="error-icon">⚠️</span>
            <p class="error-msg-text">{{ errorMsg }}</p>
            <button class="retry-btn" @click="runGodReview">重新分析</button>
          </div>

          <!-- 分析成功 -->
          <div v-else class="ai-content-scroll">
            <!-- 大局观环形评分 -->
            <div v-if="score !== null" class="score-circle-wrapper">
              <div class="score-circle">
                <div class="score-glow"></div>
                <span class="score-num">{{ score }}</span>
                <span class="score-unit">分</span>
              </div>
              <div class="score-title">本局大局观决策评分</div>
            </div>

            <!-- AI 诊断详情 -->
            <div class="ai-report-markdown" v-html="formattedReport"></div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="god-view-footer">
        <n-button type="primary" @click="copyReport">📋 复制复盘报告</n-button>
        <n-button @click="handleClose">关闭</n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NButton } from 'naive-ui'
import type { Tile, GameAction } from '@/types'
import { useLLM } from '@/composables/useLLM'
import TileView from './TileView.vue'

const props = defineProps<{
  visible: boolean
  history: GameAction[]
  gameMode: string
}>()

const emit = defineEmits<{
  close: []
}>()

const llm = useLLM()
const loading = ref(false)
const aiReport = ref('')
const errorMsg = ref('')

// 弹窗可见性绑定
const showModal = computed({
  get: () => props.visible,
  set: (val) => {
    if (!val) emit('close')
  }
})

// 过滤出有手牌快照的记录步骤，供时序播放
const replaySteps = computed(() => {
  return props.history.filter(act => act.handSnapshot !== undefined && act.handSnapshot.length > 0)
})

// 当前回放到的步骤索引
const currentStep = ref(0)
const activeStep = computed(() => replaySteps.value[currentStep.value] || null)

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function nextStep() {
  if (currentStep.value < replaySteps.value.length - 1) currentStep.value++
}

// 动作标签汉化
function getActionName(act: GameAction): string {
  if (act.type === 'starting_hand') return '初始配牌'
  if (act.type === 'draw') return act.tile ? `摸牌 🀄 ${formatTileName(act.tile)}` : '摸牌'
  if (act.type === 'discard') return act.tile ? `打出 📤 ${formatTileName(act.tile)}` : '出牌'
  if (act.type === 'pong') return act.tile ? `碰牌 👥 ${formatTileName(act.tile)}` : '碰牌'
  if (act.type === 'gang') return act.tile ? `杠牌 🀄 ${formatTileName(act.tile)}` : '杠牌'
  if (act.type === 'self_draw') return '🎉 自摸胡牌!'
  return act.type
}

function formatTileName(tile: Tile): string {
  if (tile.suit === 'red_zhong') return '红中'
  const names: Record<string, string> = { character: '万', bamboo: '条', dot: '筒' }
  return `${tile.number}${names[tile.suit] || ''}`
}

function isActionTile(tile: Tile, act: GameAction): boolean {
  if (!act.tile) return false
  return tile.id === act.tile.id
}

function meldLabel(type: string): string {
  return { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠', red_zhong_gang: '红中杠' }[type] || type
}

function getMeldTileCount(type: string): number {
  if (type === 'red_zhong_gang') return 1
  if (type === 'concealed_gang') return 4
  return 3
}

// 大局观评分正则提取
const score = computed(() => {
  if (!aiReport.value) return null
  // 匹配 【大局观评分】：85分 或 大局观评分 85分
  const match = aiReport.value.match(/【大局观评分】[：\s]*(?:分)?(\d+)/i)
  if (match) return Number(match[1])
  
  const match2 = aiReport.value.match(/(?:评分|得分)[：\s]*(\d+)/i)
  if (match2) return Number(match2[1])
  
  return null
})

// Markdown 格式化（换行，粗体，斜体等）
const formattedReport = computed(() => {
  if (!aiReport.value) return ''
  return aiReport.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_THINK_START_([\s\S]*?)_THINK_END_/g, '<span class="ai-reasoning">$1</span>')
    .replace(/\n/g, '<br>')
})

// 运行 AI 复盘诊断
async function runGodReview() {
  if (props.history.length === 0) return
  loading.value = true
  errorMsg.value = ''
  aiReport.value = ''
  
  try {
    const res = await llm.analyzeGodView(props.history, props.gameMode)
    if (res.success && res.content) {
      aiReport.value = res.content
    } else {
      errorMsg.value = res.error || '大模型复盘出错'
    }
  } catch (err: any) {
    errorMsg.value = err.message || '网络连接失败，请重试'
  } finally {
    loading.value = false
  }
}

// 复制报告
async function copyReport() {
  if (!aiReport.value) return
  try {
    // 移除 think 占位符
    const cleanText = aiReport.value.replace(/_THINK_START_[\s\S]*?_THINK_END_/gi, '').trim()
    await navigator.clipboard.writeText(cleanText)
    alert('📋 复盘诊断报告已成功复制到剪贴板！')
  } catch (e) {
    console.error(e)
  }
}

function handleClose() {
  emit('close')
}

// 弹窗打开时自动执行复盘
watch(() => props.visible, (visible) => {
  if (visible) {
    currentStep.value = 0
    runGodReview()
  }
}, { immediate: true })
</script>

<style scoped>
/* 由于 Teleport，必须使用 :global 来突破 scope 限制定义 Modal 背景 */
:global(.god-view-box) {
  width: 960px;
  max-width: 95vw;
  height: 85vh;
  background: var(--color-surface);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 20px;
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.75), 0 0 40px rgba(139, 92, 246, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
}

/* 头部 */
:global(.god-view-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
}

:global(.god-view-header .header-left) {
  display: flex;
  align-items: center;
  gap: 12px;
}

:global(.god-view-header .header-logo) {
  font-size: 24px;
}

:global(.god-view-header .header-title) {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1.5px;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.god-view-header .header-mode-badge) {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-accent);
  background: rgba(247, 201, 72, 0.15);
  border: 1px solid rgba(247, 201, 72, 0.3);
  padding: 2px 10px;
  border-radius: 12px;
}

:global(.god-view-header .god-close-btn) {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;
}

:global(.god-view-header .god-close-btn:hover) {
  color: var(--color-primary);
}

/* 主体 layout */
:global(.god-view-body) {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧：回放面板 */
:global(.replay-panel) {
  flex: 1.1;
  border-right: 1px solid var(--color-border);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: rgba(0, 0, 0, 0.15);
}

:global(.panel-section-title) {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-secondary);
  border-left: 3px solid var(--color-purple);
  padding-left: 10px;
  letter-spacing: 1px;
}

/* 进度条与播放控制 */
:global(.replay-controls) {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

:global(.control-buttons) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:global(.control-btn) {
  padding: 8px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

:global(.control-btn:hover:not(:disabled)) {
  border-color: var(--color-purple);
  color: #fff;
  background: rgba(139, 92, 246, 0.1);
}

:global(.control-btn:disabled) {
  opacity: 0.35;
  cursor: not-allowed;
}

:global(.step-indicator) {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

:global(.step-slider) {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  outline: none;
}

:global(.step-slider::-webkit-slider-thumb) {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-purple);
  cursor: pointer;
  box-shadow: 0 0 10px var(--color-purple);
  transition: transform 0.1s;
}

:global(.step-slider::-webkit-slider-thumb:hover) {
  transform: scale(1.2);
}

/* 步骤手牌详情 */
:global(.step-detail-card) {
  flex: 1;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

:global(.step-meta) {
  display: flex;
  gap: 12px;
  align-items: center;
}

:global(.step-round-badge) {
  font-size: 13px;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 3px 10px;
  border-radius: 6px;
}

:global(.step-action-tag) {
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  color: #fff;
}

:global(.step-action-tag.starting_hand) { background: #475569; }
:global(.step-action-tag.draw) { background: #0284c7; }
:global(.step-action-tag.discard) { background: #4b5563; }
:global(.step-action-tag.pong) { background: var(--color-success); color: #0f172a; }
:global(.step-action-tag.gang) { background: var(--color-accent); color: #1e1b4b; }
:global(.step-action-tag.self_draw) { background: var(--color-primary); }

:global(.snapshot-area) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:global(.snapshot-label) {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

:global(.snapshot-tiles) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 10px;
  justify-content: center;
}

/* 高亮手牌中刚刚操作的那张牌 */
:global(.snapshot-tiles .tile.Highlighted) {
  transform: translateY(-8px);
  box-shadow: 0 0 0 2px var(--color-purple), 0 10px 20px rgba(139, 92, 246, 0.45);
}

:global(.snapshot-melds) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 10px;
}

:global(.snapshot-melds .meld-group) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:global(.snapshot-melds .meld-tag) {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
  color: #fff;
}

:global(.snapshot-melds .meld-tag.pong) { background: var(--color-success); color: #0f172a; }
:global(.snapshot-melds .meld-tag.exposed_gang) { background: var(--color-accent); color: #1e1b4b; }
:global(.snapshot-melds .meld-tag.concealed_gang) { background: var(--color-primary); }
:global(.snapshot-melds .meld-tag.red_zhong_gang) { background: #ec4899; }

:global(.snapshot-melds .meld-tiles) {
  display: flex;
  gap: 2px;
}

:global(.no-steps-placeholder) {
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

/* 右侧：AI 诊断面板 */
:global(.ai-report-panel) {
  flex: 1.2;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
}

:global(.ai-content-scroll) {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
}

/* 骨架屏加载状态 */
:global(.ai-loading-state) {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 40px;
}

:global(.skeleton-ring) {
  width: 70px;
  height: 70px;
  border: 4px dashed var(--color-purple);
  border-radius: 50%;
  animation: rotateRing 4s linear infinite;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
}

@keyframes rotateRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:global(.ai-loading-state .loading-dots) {
  display: flex;
  gap: 6px;
}

:global(.ai-loading-state .loading-dots span) {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-purple);
  animation: dotPulse 1.4s ease-in-out infinite;
}

:global(.ai-loading-state .loading-dots span:nth-child(2)) { animation-delay: 0.2s; }
:global(.ai-loading-state .loading-dots span:nth-child(3)) { animation-delay: 0.4s; }

:global(.loading-text) {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}

/* 错误与重试 */
:global(.ai-error-state) {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

:global(.ai-error-state .error-icon) { font-size: 36px; }

:global(.ai-error-state .error-msg-text) {
  color: var(--color-primary);
  font-size: 14px;
  background: rgba(255, 94, 94, 0.08);
  border: 1px solid rgba(255, 94, 94, 0.2);
  border-radius: 8px;
  padding: 12px 18px;
  max-width: 80%;
  word-break: break-all;
  text-align: center;
}

:global(.ai-error-state .retry-btn) {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

:global(.ai-error-state .retry-btn:hover) {
  background: rgba(139, 92, 246, 0.25);
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
}

/* 环形评分样式 */
:global(.score-circle-wrapper) {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

:global(.score-circle) {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 4px solid var(--color-purple);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: rgba(139, 92, 246, 0.06);
}

:global(.score-glow) {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid var(--color-purple);
  opacity: 0.35;
  animation: scorePulse 2.5s ease-in-out infinite;
}

@keyframes scorePulse {
  0%, 100% { transform: scale(1); opacity: 0.35; }
  50% { transform: scale(1.12); opacity: 0; }
}

:global(.score-num) {
  font-size: 36px;
  font-weight: 850;
  color: var(--color-accent);
  text-shadow: 0 0 10px rgba(247, 201, 72, 0.55);
}

:global(.score-unit) {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-left: 2px;
  margin-top: 14px;
  font-weight: 600;
}

:global(.score-title) {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
  margin-top: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Markdown 富文本诊断书 */
:global(.ai-report-markdown) {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text);
}

:global(.ai-report-markdown strong) {
  color: #a78bfa;
  font-weight: 700;
  display: inline-block;
  margin-top: 12px;
}

:global(.ai-report-markdown strong:first-child) {
  margin-top: 0;
}

:global(.ai-report-markdown em) {
  color: var(--color-accent);
  font-style: normal;
}

:global(.ai-report-markdown .ai-reasoning) {
  color: var(--color-text-dim);
  font-size: 13px;
  line-height: 1.6;
  display: block;
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid rgba(139, 92, 246, 0.4);
  padding: 10px 14px;
  border-radius: 4px;
  margin-bottom: 12px;
}

/* 底部 */
:global(.god-view-footer) {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
}
</style>
