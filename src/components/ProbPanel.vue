<template>
  <div class="prob-panel panel">
    <div class="panel-header">
      <span class="panel-icon">📊</span>
      <span class="panel-title">自摸概率</span>
    </div>

    <!-- 未听牌 -->
    <div v-if="!isReady" class="not-ready">
      <div class="not-ready-icon">🎯</div>
      <div class="not-ready-text">尚未听牌</div>
      <div class="not-ready-hint">凑成顺子/刻子即可听牌</div>
    </div>

    <!-- 已听牌 -->
    <template v-else>
      <!-- 目标牌展示 -->
      <div class="target-section">
        <div class="target-header">
          <span>目标牌</span>
          <span class="target-total" :class="{ zero: targetCount === 0 }">
            {{ targetCount }} 张
            <span v-if="targetCount === 0" class="zero-alert">已断张！</span>
          </span>
        </div>
        <div class="target-tiles">
          <div
            v-for="tile in waitingTiles"
            :key="tile.id"
            class="target-tile-item"
            :class="{ zero: getTileCount(tile) === 0 }"
          >
            <TileView :tile="tile" mini />
            <span class="tile-remaining" :class="{ zero: getTileCount(tile) === 0 }">
              {{ getTileCount(tile) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 概率数据 -->
      <div class="prob-section">
        <div class="prob-row main-prob">
          <div class="prob-card single">
            <div class="prob-label">单巡</div>
            <div class="prob-value" :class="probClass(singleDrawProb)">
              {{ formatProb(singleDrawProb) }}
            </div>
          </div>
          <div class="prob-card">
            <div class="prob-label">5巡内</div>
            <div class="prob-value" :class="probClass(multiDraw(5))">
              {{ formatProb(multiDraw(5)) }}
            </div>
          </div>
          <div class="prob-card">
            <div class="prob-label">10巡内</div>
            <div class="prob-value" :class="probClass(multiDraw(10))">
              {{ formatProb(multiDraw(10)) }}
            </div>
          </div>
          <div class="prob-card">
            <div class="prob-label">20巡内</div>
            <div class="prob-value" :class="probClass(multiDraw(20))">
              {{ formatProb(multiDraw(20)) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 期望值 -->
      <div class="expect-section">
        <div class="expect-label">期望自摸巡数</div>
        <div class="expect-value" :class="expectClass(expectedDraws)">
          <span class="expect-number">{{ expectedDraws === Infinity ? '∞' : expectedDraws.toFixed(1) }}</span>
          <span class="expect-unit">巡</span>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="prob-bar-section">
        <div class="prob-bar-label">20巡自摸进度</div>
        <div class="prob-bar">
          <div class="prob-bar-fill" :class="probClass(multiDraw(20))" :style="{ width: formatProb(multiDraw(20)) }"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TileView from './TileView.vue'
import type { ProbabilityState } from '@/types'

const props = defineProps<{
  probability: ProbabilityState
}>()

const isReady = computed(() => props.probability.targetTiles.length > 0)
const waitingTiles = computed(() => props.probability.targetTiles)
const targetCount = computed(() => props.probability.targetCount)
const singleDrawProb = computed(() => props.probability.singleDrawProb)
const expectedDraws = computed(() => props.probability.expectedDraws)
const tileCounts = computed(() => props.probability.targetTileCounts || new Map())

function getTileCount(tile: { suit: string; number: number | null }): number {
  const key = `${tile.suit}_${tile.number}`
  return tileCounts.value.get(key) || 0
}

function multiDraw(n: number): number {
  return props.probability.multiDrawProb?.get(n) || 0
}

function formatProb(p: number): string {
  if (!isFinite(p) || p <= 0) return '0%'
  return `${(p * 100).toFixed(1)}%`
}

function probClass(p: number): string {
  if (p >= 0.1) return 'high'
  if (p >= 0.03) return 'mid'
  return 'low'
}

function expectClass(d: number): string {
  if (d <= 10) return 'good'
  if (d <= 20) return 'mid'
  return 'bad'
}
</script>

<style scoped>
.prob-panel {
  padding: 16px;
  background: var(--color-card);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

/* ============================================================
   未听牌
   ============================================================ */
.not-ready {
  text-align: center;
  padding: 20px 0;
}

.not-ready-icon {
  font-size: 36px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.not-ready-text {
  font-size: 16px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.not-ready-hint {
  font-size: 12px;
  color: var(--color-text-dim);
}

/* ============================================================
   目标牌
   ============================================================ */
.target-section {
  margin-bottom: 14px;
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.target-total {
  font-weight: 600;
  color: var(--color-success);
}

.target-total.zero {
  color: var(--color-danger);
}

.zero-alert {
  color: var(--color-danger);
  font-size: 10px;
  margin-left: 4px;
}

.target-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.target-tile-item {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  opacity: 1;
  transition: all 0.2s;
}

.target-tile-item.zero {
  opacity: 0.3;
}

.tile-remaining {
  font-size: 10px;
  font-weight: bold;
  color: var(--color-accent);
  background: rgba(0,0,0,0.4);
  border-radius: 4px;
  padding: 0 4px;
  min-width: 16px;
  text-align: center;
}

.tile-remaining.zero {
  color: var(--color-danger);
}

/* ============================================================
   概率卡片
   ============================================================ */
.prob-section {
  margin-bottom: 14px;
}

.prob-row {
  display: grid;
  gap: 8px;
}

.prob-row.main-prob {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.prob-card {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  border: 1px solid var(--color-border);
  transition: all 0.2s;
}

.prob-card:hover {
  border-color: var(--color-border-light);
  transform: translateY(-2px);
}

.prob-card.single {
  background: linear-gradient(135deg, var(--color-surface), var(--color-card-hover));
  border-color: var(--color-primary);
}

.prob-label {
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.prob-value {
  font-size: 18px;
  font-weight: bold;
}

.prob-value.high { color: var(--color-success); text-shadow: 0 0 10px rgba(72,219,251,0.4); }
.prob-value.mid { color: var(--color-accent); text-shadow: 0 0 10px rgba(254,202,87,0.4); }
.prob-value.low { color: var(--color-danger); }

/* ============================================================
   期望值
   ============================================================ */
.expect-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-surface);
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
}

.expect-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.expect-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.expect-number {
  font-size: 24px;
  font-weight: bold;
}

.expect-unit {
  font-size: 12px;
  color: var(--color-text-muted);
}

.expect-value.good .expect-number { color: var(--color-success); }
.expect-value.mid .expect-number { color: var(--color-accent); }
.expect-value.bad .expect-number { color: var(--color-danger); }

/* ============================================================
   进度条
   ============================================================ */
.prob-bar-section {
  margin-top: 8px;
}

.prob-bar-label {
  font-size: 10px;
  color: var(--color-text-dim);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prob-bar {
  height: 8px;
  background: var(--color-surface);
  border-radius: 4px;
  overflow: hidden;
}

.prob-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.prob-bar-fill.high { background: linear-gradient(90deg, var(--color-success), #48dbfb); }
.prob-bar-fill.mid { background: linear-gradient(90deg, var(--color-accent), #feca57); }
.prob-bar-fill.low { background: linear-gradient(90deg, var(--color-danger), #ff4757); }
</style>
