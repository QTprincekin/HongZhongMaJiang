<template>
  <div class="setup-panel">
    <div class="setup-header">
      <span class="setup-icon">🀄</span>
      <h2 class="setup-title">红中麻将</h2>
      <p class="setup-subtitle">概率训练系统</p>
    </div>

    <!-- AI 难度 -->
    <div class="setup-section">
      <div class="setup-label">🤖 AI 难度</div>
      <div class="option-group">
        <label
          v-for="(cfg, key) in AI_DIFFICULTY_CONFIG"
          :key="key"
          class="option-item"
          :class="{ active: selectedDifficulty === key }"
        >
          <input
            type="radio"
            :value="key"
            v-model="selectedDifficulty"
            class="hidden-radio"
          />
          <span class="option-label">{{ cfg.label }}</span>
          <span class="option-desc">{{ difficultyDesc(key as string) }}</span>
        </label>
      </div>
    </div>

    <!-- 圈数设置 -->
    <div class="setup-section">
      <div class="setup-label">🔄 圈数设置</div>
      <div class="option-group">
        <label
          v-for="opt in ROUND_OPTIONS"
          :key="opt.value"
          class="option-item"
          :class="{ active: selectedRoundOption === opt.value }"
        >
          <input
            type="radio"
            :value="opt.value"
            v-model="selectedRoundOption"
            class="hidden-radio"
          />
          <span class="option-label">{{ opt.label }}</span>
        </label>
      </div>
      <!-- 自定义输入 -->
      <div v-if="selectedRoundOption === -1" class="custom-input-row">
        <span class="custom-label">自定义圈数：</span>
        <input
          type="number"
          v-model.number="customRounds"
          min="1"
          max="100"
          class="custom-input"
        />
        <span class="custom-unit">把</span>
      </div>
    </div>

    <!-- 开始按钮 -->
    <button class="start-btn" @click="handleStart">
      🎮 开始游戏
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  AIDifficulty, AI_DIFFICULTY_CONFIG,
  ROUND_OPTIONS,
} from '@/types'
import type { RoundSetting } from '@/types'

const emit = defineEmits<{
  start: [difficulty: AIDifficulty, rounds: number]
}>()

const selectedDifficulty = ref<AIDifficulty>(AIDifficulty.NOVICE)
const selectedRoundOption = ref<RoundSetting>(0)
const customRounds = ref(10)

function difficultyDesc(key: string): string {
  const map: Record<string, string> = {
    novice: '永远不胡，让你练手',
    beginner: '偶尔胡牌，简单策略',
    expert: '经常胡牌，较好策略',
    master: '必胡，最优策略',
  }
  return map[key] || ''
}

function handleStart() {
  const rounds = selectedRoundOption.value === -1
    ? customRounds.value
    : selectedRoundOption.value
  emit('start', selectedDifficulty.value, rounds)
}
</script>

<style scoped>
.setup-panel {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 28px 24px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 头部 */
.setup-header {
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.setup-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
  filter: drop-shadow(0 0 16px rgba(255, 94, 94, 0.5));
}

.setup-title {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.setup-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 4px 0 0;
}

/* 区块 */
.setup-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setup-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

/* 选项组 */
.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-item {
  flex: 1;
  min-width: 100px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-item:hover {
  border-color: rgba(255, 94, 94, 0.4);
  background: var(--color-card-hover);
}

.option-item.active {
  border-color: var(--color-primary);
  background: rgba(255, 94, 94, 0.08);
  box-shadow: 0 0 12px rgba(255, 94, 94, 0.15);
}

.hidden-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.option-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}

.option-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.3;
}

/* 自定义输入 */
.custom-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.custom-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.custom-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  outline: none;
}

.custom-input:focus {
  border-color: var(--color-primary);
}

.custom-unit {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* 开始按钮 */
.start-btn {
  width: 100%;
  padding: 16px;
  font-size: 20px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary), #ff6b6b);
  color: #fff;
  cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 1px;
  box-shadow: 0 4px 16px rgba(255, 94, 94, 0.3);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(255, 94, 94, 0.5);
}

.start-btn:active {
  transform: translateY(0);
}
</style>
