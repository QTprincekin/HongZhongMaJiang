<template>
  <div class="score-panel">
    <!-- 紧凑模式：游戏进行中 -->
    <div v-if="!showDetail" class="score-compact">
      <div class="score-header">
        <span class="score-icon">📊</span>
        <span class="score-title">积分</span>
        <span v-if="totalRounds > 0" class="round-progress">
          第 {{ currentRound }} / {{ totalRounds }} 把
        </span>
        <button class="expand-btn" @click="showDetail = true" title="查看详情">
          📋
        </button>
      </div>
      <div class="score-row">
        <div
          v-for="(entry, idx) in scoreEntries"
          :key="idx"
          class="score-item"
          :class="{ highlight: entry.isPlayer, leading: entry.isLeading }"
        >
          <span class="score-name">{{ entry.name }}</span>
          <span class="score-value" :class="{ positive: entry.score > 0, negative: entry.score < 0 }">
            {{ entry.score > 0 ? '+' : '' }}{{ entry.score }}
          </span>
        </div>
      </div>
    </div>

    <!-- 详细模式：展示每局结果 -->
    <div v-else class="score-detail">
      <div class="detail-header">
        <span class="score-title">📊 积分详情</span>
        <button class="collapse-btn" @click="showDetail = false">✕</button>
      </div>

      <!-- 当前总分 -->
      <div class="total-scores">
        <div
          v-for="(entry, idx) in scoreEntries"
          :key="idx"
          class="total-item"
          :class="{ highlight: entry.isPlayer, leading: entry.isLeading }"
        >
          <span class="total-name">{{ entry.name }}</span>
          <span class="total-value" :class="{ positive: entry.score > 0, negative: entry.score < 0 }">
            {{ entry.score > 0 ? '+' : '' }}{{ entry.score }}
          </span>
        </div>
      </div>

      <!-- 每局记录 -->
      <div v-if="roundHistory.length > 0" class="history-table">
        <div class="table-header">
          <span class="th">局</span>
          <span class="th">赢家</span>
          <span class="th">方式</span>
          <span class="th">抓马</span>
          <span class="th">得分</span>
        </div>
        <div v-for="(result, i) in roundHistory" :key="i" class="table-row">
          <span class="td">{{ result.roundNumber }}</span>
          <span class="td winner">{{ getWinnerName(result.winner) }}</span>
          <span class="td method">{{ result.winner < 0 ? '流局' : (result.isSelfDraw ? '自摸' : '胡牌') }}</span>
          <span class="td bonus">
            <template v-if="result.bonusDrawCount">
              {{ result.bonusHitCount }}/{{ result.bonusDrawCount }}
              <span v-if="!result.hasRedZhong" class="no-zhong-tag">无中</span>
            </template>
            <template v-else>—</template>
          </span>
          <span class="td changes">
            <span class="winner-score positive" v-if="result.winnerScore">
              +{{ result.winnerScore }}
            </span>
          </span>
        </div>
      </div>
      <div v-else class="no-history">暂无记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RoundResult } from '@/types'

const props = defineProps<{
  playerScore: Record<number, number>
  totalRounds: number
  currentRound: number
  roundHistory: RoundResult[]
  opponentNames: string[]
}>()

const showDetail = ref(false)

// 积分条目
const scoreEntries = computed(() => {
  const maxScore = Math.max(...Object.values(props.playerScore))
  return [
    ...props.opponentNames.map((name, i) => ({
      name,
      score: props.playerScore[i] || 0,
      isPlayer: false,
      isLeading: props.playerScore[i] === maxScore && maxScore > 0,
    })),
    {
      name: '你',
      score: props.playerScore[3] || 0,
      isPlayer: true,
      isLeading: props.playerScore[3] === maxScore && maxScore > 0,
    },
  ]
})

function getWinnerName(winner: number): string {
  if (winner < 0) return '流局'
  if (winner >= 3) return '你'
  return props.opponentNames[winner] || `对手${winner}`
}
</script>

<style scoped>
.score-panel {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 12px 16px;
  border: 1px solid var(--color-border);
}

/* ===== 紧凑模式 ===== */
.score-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.score-icon {
  font-size: 14px;
}

.score-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.round-progress {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-accent);
  font-weight: 600;
  background: rgba(247, 201, 72, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.expand-btn:hover {
  background: var(--color-surface);
}

.score-row {
  display: flex;
  gap: 6px;
}

.score-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.score-item.highlight {
  border-color: var(--color-primary);
  background: rgba(255, 94, 94, 0.06);
}

.score-item.leading {
  border-color: var(--color-gold);
  box-shadow: 0 0 10px rgba(247, 201, 72, 0.15);
}

.score-name {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.score-value {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
}

.score-value.positive { color: var(--color-success); }
.score-value.negative { color: var(--color-primary); }

/* ===== 详细模式 ===== */
.score-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.total-scores {
  display: flex;
  gap: 8px;
}

.total-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  background: var(--color-surface);
  border-radius: 10px;
  border: 1.5px solid transparent;
}

.total-item.highlight {
  border-color: var(--color-primary);
}

.total-item.leading {
  border-color: var(--color-gold);
  background: rgba(247, 201, 72, 0.06);
}

.total-name {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 600;
}

.total-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  font-family: 'JetBrains Mono', monospace;
}

.total-value.positive { color: var(--color-success); }
.total-value.negative { color: var(--color-primary); }

/* 历史表格 */
.history-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}

.table-header {
  display: grid;
  grid-template-columns: 35px 55px 45px 60px 55px;
  gap: 8px;
  padding: 6px 8px;
  background: var(--color-surface);
  border-radius: 6px;
  position: sticky;
  top: 0;
}

.th {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.table-row {
  display: grid;
  grid-template-columns: 35px 55px 45px 60px 55px;
  gap: 8px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  align-items: center;
}

.td {
  color: var(--color-text);
}

.td.winner {
  font-weight: 700;
  color: var(--color-accent);
}

.td.method {
  color: var(--color-text-muted);
}

.td.changes {
  display: flex;
  gap: 6px;
}

.change-tag {
  font-size: 11px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.change-tag.positive { color: var(--color-success); }
.change-tag.negative { color: var(--color-primary); }

.no-history {
  text-align: center;
  color: var(--color-text-dim);
  font-size: 13px;
  padding: 12px;
}

.td.bonus {
  font-size: 11px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-accent);
}

.no-zhong-tag {
  font-size: 9px;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
  padding: 0 4px;
  border-radius: 4px;
  margin-left: 2px;
}

.winner-score {
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.winner-score.positive { color: var(--color-success); }
</style>
