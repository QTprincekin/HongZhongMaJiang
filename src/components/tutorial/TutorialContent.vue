<template>
  <div class="tutorial-content">
    <template v-for="(block, idx) in blocks" :key="idx">
      <!-- 文本 -->
      <p v-if="block.type === 'text'" class="block-text">{{ block.content }}</p>

      <!-- 标题 -->
      <h1 v-else-if="block.type === 'heading' && block.level === 1" class="block-h1">{{ block.text }}</h1>
      <h2 v-else-if="block.type === 'heading' && block.level === 2" class="block-h2">{{ block.text }}</h2>
      <h3 v-else-if="block.type === 'heading' && block.level === 3" class="block-h3">{{ block.text }}</h3>

      <!-- 提示 -->
      <div
        v-else-if="block.type === 'tip'"
        class="block-tip"
        :class="block.style"
      >
        <span class="tip-icon">{{ tipIcon(block.style) }}</span>
        <span class="tip-text">{{ block.text }}</span>
      </div>

      <!-- 牌型演示 -->
      <TileGroupDemo
        v-else-if="block.type === 'tileDemo'"
        :tiles="block.tiles"
        :label="block.label"
        :highlight-ids="block.highlightIds"
      />

      <!-- 对比 -->
      <div v-else-if="block.type === 'compare'" class="block-compare">
        <div class="compare-side">
          <div class="compare-label">{{ block.labelA }}</div>
          <TileGroupDemo :tiles="block.tilesA" />
        </div>
        <div class="compare-vs">VS</div>
        <div class="compare-side">
          <div class="compare-label">{{ block.labelB }}</div>
          <TileGroupDemo :tiles="block.tilesB" />
        </div>
      </div>

      <!-- 列表 -->
      <ul v-else-if="block.type === 'list'" class="block-list">
        <li v-for="(item, i) in block.items" :key="i">{{ item }}</li>
      </ul>

      <!-- 规则 -->
      <div v-else-if="block.type === 'rule'" class="block-rule">
        <div class="rule-title">{{ block.title }}</div>
        <div class="rule-desc">{{ block.desc }}</div>
      </div>

      <!-- 测验 -->
      <div v-else-if="block.type === 'quiz'" class="block-quiz">
        <div class="quiz-question">{{ block.question }}</div>
        <div class="quiz-options">
          <button
            v-for="(opt, i) in block.options"
            :key="i"
            class="quiz-option"
            :class="quizOptionClass(idx, i, block.answer)"
            @click="selectAnswer(idx, i)"
          >
            {{ String.fromCharCode(65 + i) }}. {{ opt }}
          </button>
        </div>
        <div v-if="quizRevealed[idx]" class="quiz-explanation">
          <span class="quiz-result">{{ quizCorrect[idx] ? '✅ 回答正确！' : '❌ 回答错误' }}</span>
          {{ block.explanation }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { ContentBlock } from '@/types'
import TileGroupDemo from './TileGroupDemo.vue'

const props = defineProps<{
  blocks: ContentBlock[]
}>()

const quizRevealed = reactive<Record<number, boolean>>({})
const quizCorrect = reactive<Record<number, boolean>>({})
const quizSelected = reactive<Record<number, number>>({})

function tipIcon(style: string): string {
  const map: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅' }
  return map[style] || 'ℹ️'
}

function selectAnswer(blockIdx: number, optionIdx: number) {
  if (quizRevealed[blockIdx]) return
  const block = props.blocks[blockIdx]
  if (block.type !== 'quiz') return
  quizSelected[blockIdx] = optionIdx
  quizCorrect[blockIdx] = optionIdx === block.answer
  quizRevealed[blockIdx] = true
}

function quizOptionClass(blockIdx: number, optionIdx: number, answer: number) {
  if (!quizRevealed[blockIdx]) return ''
  if (optionIdx === answer) return 'correct'
  if (optionIdx === quizSelected[blockIdx] && !quizCorrect[blockIdx]) return 'wrong'
  return ''
}
</script>

<style scoped>
.tutorial-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 28px;
  max-width: 800px;
}

.block-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text);
  margin: 0;
}

.block-h1 {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  margin: 8px 0 4px;
  letter-spacing: -0.3px;
}

.block-h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin: 6px 0 4px;
}

.block-h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin: 6px 0 2px;
}

.block-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.6;
}

.block-tip.info {
  background: rgba(9, 132, 227, 0.08);
  border: 1px solid rgba(9, 132, 227, 0.25);
  color: #74b9ff;
}

.block-tip.warning {
  background: rgba(247, 201, 72, 0.08);
  border: 1px solid rgba(247, 201, 72, 0.25);
  color: #f7c948;
}

.block-tip.success {
  background: rgba(61, 217, 192, 0.08);
  border: 1px solid rgba(61, 217, 192, 0.25);
  color: #3dd9c0;
}

.tip-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.tip-text {
  flex: 1;
}

.block-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin: 12px 0;
}

.compare-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compare-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-align: center;
}

.compare-vs {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-primary);
  background: var(--color-card);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.block-list {
  margin: 4px 0;
  padding-left: 22px;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.9;
}

.block-list li::marker {
  color: var(--color-primary);
}

.block-rule {
  padding: 14px 18px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin: 8px 0;
}

.rule-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.rule-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.block-quiz {
  padding: 18px 20px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin: 12px 0;
}

.quiz-question {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-option {
  text-align: left;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.quiz-option:hover {
  border-color: var(--color-primary);
  background: rgba(255, 94, 94, 0.06);
}

.quiz-option.correct {
  border-color: var(--color-success);
  background: rgba(61, 217, 192, 0.1);
  color: var(--color-success);
  font-weight: 700;
}

.quiz-option.wrong {
  border-color: var(--color-danger);
  background: rgba(255, 71, 87, 0.1);
  color: var(--color-danger);
}

.quiz-explanation {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.quiz-result {
  font-weight: 700;
  margin-right: 6px;
}

@media (max-width: 768px) {
  .tutorial-content {
    padding: 16px;
  }

  .block-compare {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .compare-vs {
    text-align: center;
  }
}
</style>
