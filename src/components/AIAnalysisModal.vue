<template>
  <!-- 弹窗遮罩 -->
  <transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box">
        <!-- 标题栏 -->
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">🤖</span>
            <span>AI 深度分析</span>
            <span class="trigger-badge">{{ triggerLabel }}</span>
          </div>
          <div class="modal-actions">
            <button
              v-if="result && !loading"
              class="action-btn refresh-btn"
              title="重新生成"
              @click="runAnalysis"
            >
              🔄
            </button>
            <button class="action-btn close-btn" @click="$emit('close')">✕</button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="modal-content">
          <!-- 加载动画 -->
          <div v-if="loading" class="loading-state">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p class="loading-text">正在分析当前局势...</p>
          </div>

          <!-- 成功结果 -->
          <div v-else-if="result?.success && result.content" class="result-content">
            <div class="result-text" v-html="formattedContent"></div>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="result && !result.success" class="error-state">
            <div class="error-icon">⚠️</div>
            <div class="error-message">{{ result.error || 'AI 分析失败' }}</div>
            <button class="retry-btn" @click="runAnalysis">重试</button>
          </div>

          <!-- 未配置 -->
          <div v-else-if="!llmEnabled" class="unconfigured-state">
            <div class="unconfigured-icon">🔧</div>
            <div class="unconfigured-text">
              请先在右上角 ⚙️ 设置中配置 AI（API 地址 + Key）
            </div>
          </div>
        </div>

        <!-- 底部信息 -->
        <div v-if="result?.success" class="modal-footer">
          <span class="meta-item">⏱ {{ result.latency }}ms</span>
          <span class="meta-separator">·</span>
          <span class="meta-item">模型：{{ result.model }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLLM } from '@/composables/useLLM'
import type { LLMPromptContext, LLMAnalysisResult } from '@/types'

const props = defineProps<{
  visible: boolean
  context: LLMPromptContext
}>()

defineEmits<{ close: [] }>()

const llm = useLLM()
const loading = ref(false)
const result = ref<LLMAnalysisResult | null>(null)
const llmEnabled = computed(() => llm.isEnabled.value)

// 触发时机标签
const triggerLabels: Record<string, string> = {
  pong_decision: '碰牌决策',
  gang_decision: '杠牌决策',
  switch_decision: '听牌换向',
  low_probability: '低概率评估',
  manual: '手动分析',
  game_review: '对局复盘',
}
const triggerLabel = computed(() => triggerLabels[props.context.trigger] || '分析')

// 把换行转为 HTML（简单 Markdown）
const formattedContent = computed(() => {
  if (!result.value?.content) return ''
  return result.value.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
})

// 自动触发分析
async function runAnalysis() {
  if (!llmEnabled.value) return
  loading.value = true
  result.value = null
  result.value = await llm.analyze(props.context)
  loading.value = false
}

// 弹窗打开时自动调用
watch(() => props.visible, (visible) => {
  if (visible && llmEnabled.value) {
    runAnalysis()
  }
}, { immediate: true })
</script>

<style scoped>
/* 遮罩 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 弹窗容器 */
.modal-box {
  width: 560px;
  max-width: 100%;
  max-height: 80vh;
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid rgba(139,92,246,0.3);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139,92,246,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标题栏 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08));
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.modal-icon { font-size: 20px; }

.trigger-badge {
  font-size: 11px;
  background: rgba(139,92,246,0.15);
  color: #a78bfa;
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 20px;
  padding: 2px 10px;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-muted);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--color-card);
  color: var(--color-text);
}

/* 内容区 */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  min-height: 200px;
}

/* 加载动画 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  gap: 16px;
}

.loading-dots {
  display: flex;
  gap: 8px;
}

.loading-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #a78bfa;
  animation: dotPulse 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}

/* 分析内容 */
.result-content {
  animation: fadeIn 0.3s ease;
}

.result-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--color-text);
}

.result-text :deep(strong) {
  color: #a78bfa;
  font-weight: 700;
}

.result-text :deep(em) {
  color: var(--color-accent);
  font-style: normal;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  text-align: center;
}

.error-icon { font-size: 32px; }

.error-message {
  font-size: 13px;
  color: var(--color-primary);
  background: rgba(255,107,107,0.08);
  border: 1px solid rgba(255,107,107,0.2);
  border-radius: 8px;
  padding: 10px 16px;
  max-width: 100%;
  word-break: break-all;
}

.retry-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid rgba(139,92,246,0.4);
  background: rgba(139,92,246,0.1);
  color: #a78bfa;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(139,92,246,0.2);
}

/* 未配置状态 */
.unconfigured-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 32px 20px;
  text-align: center;
}

.unconfigured-icon { font-size: 40px; }

.unconfigured-text {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* 底部元数据 */
.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid var(--color-border);
  background: rgba(0,0,0,0.1);
}

.meta-item {
  font-size: 11px;
  color: var(--color-text-muted);
}

.meta-separator {
  color: var(--color-border);
}

/* 进入/离开动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-box,
.modal-fade-leave-active .modal-box {
  transition: transform 0.25s ease;
}

.modal-fade-enter-from .modal-box {
  transform: scale(0.95) translateY(-10px);
}

.modal-fade-leave-to .modal-box {
  transform: scale(0.95) translateY(10px);
}
</style>
