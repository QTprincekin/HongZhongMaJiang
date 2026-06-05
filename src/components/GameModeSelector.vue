<template>
  <div class="game-mode-selector">
    <div class="selector-header">
      <div class="logo-container">
        <span class="logo-icon">🀄</span>
        <h1 class="app-title">红中麻将概率训练系统</h1>
      </div>
    </div>

    <div class="mode-cards">
      <!-- 红中麻将 -->
      <div
        class="mode-card"
        :class="{ selected: selectedMode === 'hongzhong' }"
        @click="selectMode('hongzhong')"
      >
        <div class="mode-icon hongzhong-icon">🎯</div>
        <h3 class="mode-title">{{ GAME_MODE_LABELS.hongzhong }}</h3>
        <p class="mode-desc">传统红中赖子麻将规则</p>
        <ul class="mode-features">
          <li>• 112张牌（含4张红中）</li>
          <li>• 杠后补摸1张</li>
          <li>• 不支持抢杠胡</li>
          <li>• 经典计分规则</li>
        </ul>
      </div>

      <!-- 红中杠麻 -->
      <div
        class="mode-card"
        :class="{ selected: selectedMode === 'hongzhong_gang' }"
        @click="selectMode('hongzhong_gang')"
      >
        <div class="mode-icon gang-icon">⚡</div>
        <h3 class="mode-title">{{ GAME_MODE_LABELS.hongzhong_gang }}</h3>
        <p class="mode-desc">杠牌为王的策略麻将</p>
        <ul class="mode-features">
          <li>• 红中单张可杠（补摸1张）</li>
          <li>• 抓马倍率特殊规则</li>
          <li>• 四红中直接胡牌</li>
          <li>• 对对胡/大单调翻倍</li>
        </ul>
      </div>
    </div>

    <div class="selector-footer">
      <div class="settings-link" @click="$emit('openSettings')">
        ⚙️ 设置
      </div>
      <n-button
        type="primary"
        size="large"
        :disabled="!selectedMode"
        class="start-btn"
        @click="startGame"
      >
        🎮 开始游戏
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { GAME_MODE_LABELS } from '@/types'
import type { GameMode } from '@/types'

const emit = defineEmits<{
  (e: 'start', mode: GameMode): void
  (e: 'openSettings'): void
}>()

const selectedMode = ref<GameMode | null>(null)

function selectMode(mode: GameMode) {
  selectedMode.value = mode
}

function startGame() {
  if (selectedMode.value) {
    emit('start', selectedMode.value)
  }
}
</script>

<style scoped>
.game-mode-selector {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%);
}

.selector-header {
  text-align: center;
  margin-bottom: 50px;
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 64px;
  filter: drop-shadow(0 0 20px rgba(255,94,94,0.4));
}

.app-title {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  max-width: 800px;
  width: 100%;
  margin-bottom: 40px;
}

.mode-card {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  padding: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.mode-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  transition: background 0.3s ease;
}

.mode-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255,94,94,0.15);
}

.mode-card.selected {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-card), rgba(255,94,94,0.06));
}

.mode-card.selected::before {
  background: var(--color-primary);
}

.mode-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.hongzhong-icon {
  filter: drop-shadow(0 4px 8px rgba(61,217,192,0.3));
}

.gang-icon {
  filter: drop-shadow(0 4px 8px rgba(247,201,72,0.3));
}

.mode-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 8px 0;
}

.mode-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0 0 20px 0;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mode-features li {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 6px 0;
  border-bottom: 1px dashed var(--color-border);
}

.mode-features li:last-child {
  border-bottom: none;
}

.selector-footer {
  display: flex;
  align-items: center;
  gap: 20px;
}

.settings-link {
  padding: 12px 20px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: color 0.2s;
}

.settings-link:hover {
  color: var(--color-primary);
}

.start-btn {
  min-width: 180px;
  height: 52px;
  font-size: 18px;
  font-weight: 700;
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .app-title {
    font-size: 24px;
  }

  .mode-cards {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .mode-card {
    padding: 24px;
  }

  .selector-footer {
    flex-direction: column;
    width: 100%;
  }

  .settings-link {
    order: 2;
  }

  .start-btn {
    order: 1;
    width: 100%;
  }
}
</style>