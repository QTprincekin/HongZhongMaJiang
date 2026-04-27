<template>
  <div class="chat-panel">
    <!-- 标题栏（可折叠） -->
    <div class="panel-header" @click="collapsed = !collapsed">
      <div class="header-left">
        <span class="panel-icon">💬</span>
        <span class="panel-title">问 AI</span>
        <span v-if="!llmEnabled" class="disabled-badge">未配置</span>
        <span v-else class="online-badge">●</span>
      </div>
      <span class="collapse-icon">{{ collapsed ? '▶' : '▼' }}</span>
    </div>

    <!-- 折叠内容 -->
    <div v-if="!collapsed" class="panel-body">
      <!-- 未配置提示 -->
      <div v-if="!llmEnabled" class="unconfigured">
        <span>🔧 请在 ⚙️ 设置中配置 AI 后使用</span>
      </div>

      <template v-else>
        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef">
          <!-- 欢迎消息 -->
          <div v-if="messages.length === 0" class="welcome-msg">
            <span class="ai-avatar">🤖</span>
            <div class="bubble ai-bubble">
              你好！我是 AI 麻将助手。你可以问我：
              <ul>
                <li>该不该碰这张牌？</li>
                <li>我的胜率大概有多少？</li>
                <li>现在应该打哪张牌？</li>
              </ul>
            </div>
          </div>

          <!-- 历史消息 -->
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="message-row"
            :class="msg.role"
          >
            <span v-if="msg.role === 'ai'" class="ai-avatar">🤖</span>
            <div class="bubble" :class="msg.role === 'user' ? 'user-bubble' : 'ai-bubble'">
              <span v-html="formatMessage(msg.content)"></span>
            </div>
          </div>

          <!-- 加载中 -->
          <div v-if="chatLoading" class="message-row ai">
            <span class="ai-avatar">🤖</span>
            <div class="bubble ai-bubble loading-bubble">
              <div class="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷提问按钮 -->
        <div class="quick-btns">
          <button
            v-for="q in quickQuestions"
            :key="q"
            class="quick-btn"
            :disabled="chatLoading"
            @click="sendMessage(q)"
          >{{ q }}</button>
        </div>

        <!-- 输入区 -->
        <div class="input-area">
          <input
            v-model="inputText"
            type="text"
            class="chat-input"
            placeholder="输入你的问题..."
            :disabled="chatLoading"
            @keydown.enter="sendMessage(inputText)"
          />
          <button
            class="send-btn"
            :disabled="!inputText.trim() || chatLoading"
            @click="sendMessage(inputText)"
          >
            {{ chatLoading ? '⏳' : '→' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useLLM } from '@/composables/useLLM'
import { formatTile } from '@/algorithms/deck'
import type { Tile, Meld } from '@/types'

const props = defineProps<{
  llmEnabled: boolean
  currentHand: Tile[]
  deckRemaining: number
  melds: Meld[]
  round: number
}>()

const llm = useLLM()

// 折叠状态（默认收起节省空间）
const collapsed = ref(true)
const inputText = ref('')
const chatLoading = ref(false)
const messageListRef = ref<HTMLElement | null>(null)

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

// 保留最近 20 条
const messages = ref<ChatMessage[]>([])

// 快捷问题
const quickQuestions = ['该出哪张？', '我现在胜率多少？', '怎么提高自摸率？']

// 发送消息（直接构造 prompt + fetch，携带手牌上下文）
async function sendMessage(text: string) {
  const trimmed = text.trim()
  if (!trimmed || chatLoading.value || !props.llmEnabled) return

  messages.value.push({ role: 'user', content: trimmed })
  inputText.value = ''
  chatLoading.value = true

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  try {
    // 构造携带手牌上下文的 Prompt
    const handStr = props.currentHand.map(t => formatTile(t)).join(' ')
    const meldsStr = props.melds.length > 0
      ? props.melds.map(m => {
          const typeMap: Record<string, string> = { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠' }
          return `${typeMap[m.type] || m.type}${formatTile(m.tile)}`
        }).join('、')
      : '无'
    const contextPrompt = `【游戏上下文】第${props.round}巡 | 牌堆剩余${props.deckRemaining}张\n手牌（${props.currentHand.length}张）：${handStr || '无'}\n副露：${meldsStr}\n\n【用户问题】${trimmed}`

    const requestPayload = {
      model: llm.config.value.model,
      messages: [
        { role: 'system', content: '你是红中麻将概率分析专家，红中麻将总共条、筒、万、各九种牌型，每种4张，红中4张，共112张，其中红中是万能牌，可以代替任何牌，只能碰牌和杠牌，不能吃牌，胡牌只能自摸胡牌。帮助用户做出最优决策。简洁专业，中文回答，300字以内。' },
        { role: 'user', content: contextPrompt },
      ],
      max_tokens: 8192,
      ...(llm.config.value.model.includes('kimi-k') ? { temperature: 1 } : { temperature: llm.config.value.temperature }),
    };
    console.log('🚀 [AIChatPanel] 发送给 AI 的完整请求体:', requestPayload);

    const resp = await fetch(llm.config.value.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.config.value.apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    })
    const data = await resp.json()
    console.log('🎯 [AIChatPanel] AI 完整返回结果:', data);
    if (resp.ok) {
      const msg = data.choices?.[0]?.message || {}
      const reasoning = (llm.config.value.showReasoning && msg.reasoning_content) 
        ? `<em>【AI 思考过程】</em><br><span style="color:var(--color-text-dim)">${msg.reasoning_content.replace(/\\n/g, '<br>')}</span><br><br>` 
        : ''
      const text = msg.content || ''
      const aiReply = (reasoning + text).trim() || '分析完成（该模型未返回任何正文内容）'
      messages.value.push({ role: 'ai', content: aiReply })
    } else {
      messages.value.push({ role: 'ai', content: `分析失败：${data.error?.message || `HTTP ${resp.status}`}` })
    }
  } catch (e: any) {
    messages.value.push({ role: 'ai', content: `出错了：${e.message || '未知错误'}` })
  } finally {
    chatLoading.value = false
    // 超过 20 条则裁剪
    if (messages.value.length > 20) {
      messages.value = messages.value.slice(-20)
    }
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 格式化消息（换行 → <br>，**bold**）
function formatMessage(content: string): string {
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.chat-panel {
  background: var(--color-card);
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

/* 标题栏 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.panel-header:hover {
  background: var(--color-card-hover);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-icon { font-size: 20px; }

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.online-badge {
  font-size: 12px;
  color: var(--color-success);
}

.disabled-badge {
  font-size: 12px;
  color: var(--color-text-muted);
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1px 7px;
}

.collapse-icon {
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 面板体 */
.panel-body {
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 未配置 */
.unconfigured {
  padding: 14px 16px;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* 消息列表 */
.message-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scroll-behavior: smooth;
}

.message-list::-webkit-scrollbar {
  width: 4px;
}

.message-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

/* 欢迎消息 */
.welcome-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

/* 消息行 */
.message-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.message-row.user {
  flex-direction: row-reverse;
}

.ai-avatar {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 气泡 */
.bubble {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.ai-bubble {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-top-left-radius: 4px;
}

.ai-bubble ul {
  margin: 6px 0 0;
  padding-left: 16px;
}

.ai-bubble li {
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.user-bubble {
  background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
  border: 1px solid rgba(139,92,246,0.3);
  color: var(--color-text);
  border-top-right-radius: 4px;
}

.loading-bubble {
  padding: 12px 16px;
}

/* 加载点 */
.loading-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.loading-dots span {
  width: 7px;
  height: 7px;
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

/* 快捷按钮 */
.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--color-border);
}

.quick-btn {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(139,92,246,0.3);
  background: rgba(99,102,241,0.08);
  color: #a78bfa;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.quick-btn:hover:not(:disabled) {
  background: rgba(99,102,241,0.18);
  border-color: #a78bfa;
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 输入区 */
.input-area {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: rgba(139,92,246,0.5);
}

.chat-input::placeholder {
  color: var(--color-text-muted);
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99,102,241,0.4);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
</style>
