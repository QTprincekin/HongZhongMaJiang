<template>
  <div class="decision-panel panel" :class="type">
    <div class="panel-header">
      <span class="panel-icon">{{ type === 'pong' ? '🤔' : '⚡' }}</span>
      <span class="panel-title">{{ type === 'pong' ? '碰牌决策' : '杠牌决策' }}</span>
    </div>

    <!-- 触发信息 -->
    <div class="trigger-info">
      <span class="trigger-label">对手打出</span>
      <TileView :tile="triggerTile" small />
    </div>

    <!-- 决策对比 -->
    <div class="decision-comparison">
      <!-- 碰 选项 -->
      <template v-if="type === 'pong' && pongDecision">
        <div class="decision-option action" :class="{ recommended: pongDecision.shouldPong }">
          <div class="option-header">
            <span class="option-badge do">碰</span>
            <span class="option-label">碰这张牌</span>
          </div>
          <div class="option-detail">
            <div class="detail-row">
              <span>碰后手牌</span>
              <span>{{ pongDecision.pongHand?.length || 0 }}张</span>
            </div>
            <div class="detail-row">
              <span>碰后听牌</span>
              <span :class="pongDecision.pongWaiting?.waitingCount ? 'text-success' : 'text-danger'">
                {{ pongDecision.pongWaiting?.waitingCount || 0 }}张
              </span>
            </div>
            <div class="detail-row">
              <span>单巡概率</span>
              <span class="prob-value" :class="probClass(pongDecision.pongProb)">
                {{ formatProb(pongDecision.pongProb) }}
              </span>
            </div>
          </div>
          <div class="option-reason">{{ pongDecision.reason }}</div>
        </div>
        <div class="decision-option" :class="{ recommended: !pongDecision.shouldPong }">
          <div class="option-header">
            <span class="option-badge skip">跳过</span>
            <span class="option-label">不碰</span>
          </div>
          <div class="option-detail">
            <div class="detail-row">
              <span>当前手牌</span>
              <span>{{ hand?.length || 0 }}张</span>
            </div>
            <div class="detail-row">
              <span>当前听牌</span>
              <span>{{ probability?.targetCount || 0 }}张</span>
            </div>
            <div class="detail-row">
              <span>单巡概率</span>
              <span class="prob-value" :class="probClass(pongDecision.noPongProb)">
                {{ formatProb(pongDecision.noPongProb) }}
              </span>
            </div>
          </div>
          <div class="option-reason muted">保持当前手牌，继续摸牌</div>
        </div>
      </template>

      <!-- 杠 选项 -->
      <template v-if="type === 'gang' && gangDecision">
        <div class="decision-option action" :class="{ recommended: gangDecision.shouldGang }">
          <div class="option-header">
            <span class="option-badge do">杠</span>
            <span class="option-label">明杠</span>
          </div>
          <div class="option-detail">
            <div class="detail-row">
              <span>杠后手牌</span>
              <span>{{ gangDecision.handAfterGang?.length || 0 }}张</span>
            </div>
            <div class="detail-row">
              <span>单巡概率</span>
              <span class="prob-value" :class="probClass(gangDecision.gangProb)">
                {{ formatProb(gangDecision.gangProb) }}
              </span>
            </div>
          </div>
          <div class="option-reason">{{ gangDecision.reason }}</div>
        </div>
        <div class="decision-option" :class="{ recommended: !gangDecision.shouldGang }">
          <div class="option-header">
            <span class="option-badge skip">跳过</span>
            <span class="option-label">不杠</span>
          </div>
          <div class="option-detail">
            <div class="detail-row">
              <span>当前手牌</span>
              <span>{{ hand?.length || 0 }}张</span>
            </div>
            <div class="detail-row">
              <span>单巡概率</span>
              <span class="prob-value" :class="probClass(gangDecision.noGangProb)">
                {{ formatProb(gangDecision.noGangProb) }}
              </span>
            </div>
          </div>
          <div class="option-reason muted">跳过杠，保持继续摸牌机会</div>
        </div>
      </template>
    </div>

    <!-- 碰后杠提示 -->
    <div v-if="type === 'pong' && pongDecision?.canGang && pongDecision?.gangDecision" class="gang-hint">
      <span class="gang-hint-icon">💡</span>
      <span>碰后若再摸到 {{ formatTile(triggerTile) }} 可选择明杠</span>
    </div>

    <!-- 操作按钮 -->
    <div class="decision-actions">
      <n-button
        :type="(type === 'pong' ? pongDecision?.shouldPong : gangDecision?.shouldGang) ? 'primary' : 'default'"
        size="large"
        @click="$emit('confirm', true)"
      >
        {{ type === 'pong' ? '✅ 碰' : '✅ 杠' }}
      </n-button>
      <n-button
        size="large"
        @click="$emit('confirm', false)"
      >
        {{ type === 'pong' ? '❌ 不碰' : '❌ 不杠' }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'
import TileView from './TileView.vue'
import { formatTile } from '@/algorithms/deck'
import type { PongDecision, GangDecision, Tile, ProbabilityState } from '@/types'

const props = defineProps<{
  type: 'pong' | 'gang'
  decision: PongDecision | GangDecision
  triggerTile: Tile
  round: number
  hand: Tile[]
  visibleTiles: Tile[]
  deckRemaining: number
  probability: ProbabilityState
}>()

defineEmits<{ confirm: [doIt: boolean] }>()

const pongDecision = computed(() =>
  props.type === 'pong' ? (props.decision as PongDecision) : null
)
const gangDecision = computed(() =>
  props.type === 'gang' ? (props.decision as GangDecision) : null
)

function formatProb(p: number): string {
  if (!isFinite(p) || p <= 0) return '0%'
  return `${(p * 100).toFixed(1)}%`
}

function probClass(p: number): string {
  if (p >= 0.1) return 'high'
  if (p >= 0.03) return 'mid'
  return 'low'
}
</script>

<style scoped>
.decision-panel {
  padding: 16px;
  background: var(--color-card);
  border-radius: var(--radius);
  border: 2px solid var(--color-primary);
  animation: slideIn 0.3s ease;
}

.decision-panel.gang {
  border-color: var(--color-accent);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-icon { font-size: 22px; }

.panel-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text);
}

/* 触发信息 */
.trigger-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: 8px;
  margin-bottom: 14px;
  border: 1px solid var(--color-border);
}

.trigger-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 决策对比 */
.decision-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.decision-option {
  padding: 12px;
  background: var(--color-surface);
  border-radius: 10px;
  border: 2px solid var(--color-border);
  transition: all 0.2s;
}

.decision-option.action.recommended {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-surface), rgba(255,107,107,0.1));
}

.decision-option.recommended {
  border-color: var(--color-success);
}

.option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.option-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
}

.option-badge.do {
  background: var(--color-primary);
  color: #fff;
}

.option-badge.skip {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.option-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.option-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-muted);
}

.detail-row span:last-child {
  font-weight: 600;
  color: var(--color-text);
}

.prob-value {
  font-size: 14px;
  font-weight: bold;
}

.prob-value.high { color: var(--color-success); }
.prob-value.mid { color: var(--color-accent); }
.prob-value.low { color: var(--color-danger); }

.option-reason {
  font-size: 11px;
  color: var(--color-text);
  line-height: 1.5;
  padding: 8px;
  background: var(--color-card);
  border-radius: 6px;
}

.option-reason.muted {
  color: var(--color-text-muted);
}

/* 杠提示 */
.gang-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(254,202,87,0.1);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--color-accent);
}

.gang-hint-icon { font-size: 16px; }

/* 操作按钮 */
.decision-actions {
  display: flex;
  gap: 10px;
}

.decision-actions .n-button {
  flex: 1;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}
</style>
