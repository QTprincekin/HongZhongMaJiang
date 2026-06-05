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
              <div v-if="msg.role === 'ai'" class="bubble-actions">
                <button class="action-btn zoom-btn" @click="zoomMessage(msg.content)">🔍 放大查看</button>
              </div>
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

    <!-- 放大查看长回复弹窗 -->
    <n-modal v-model:show="showZoomModal">
      <div class="zoom-modal-box">
        <!-- 标题栏 -->
        <div class="zoom-modal-header">
          <span class="zoom-modal-title">🤖 AI 分析详情</span>
          <button class="zoom-close-btn" @click="showZoomModal = false">✕</button>
        </div>

        <!-- 内容区 -->
        <div class="zoom-content-wrapper">
          <div class="zoom-content" v-html="formatMessage(zoomedContent)"></div>
        </div>

        <!-- 底部 -->
        <div class="zoom-modal-footer">
          <n-button type="primary" @click="copyZoomContent">📋 复制内容</n-button>
          <n-button @click="showZoomModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { NModal, NButton } from 'naive-ui'
import { useLLM, formatApiUrl } from '@/composables/useLLM'
import { formatTile } from '@/algorithms/deck'
import type { Tile, Meld } from '@/types'

const props = defineProps<{
  llmEnabled: boolean
  currentHand: Tile[]
  deckRemaining: number
  melds: Meld[]
  round: number
  gameMode: string
  visibleTiles: Tile[]
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

// 放大查看弹窗状态
const showZoomModal = ref(false)
const zoomedContent = ref('')

function zoomMessage(content: string) {
  zoomedContent.value = content
  showZoomModal.value = true
}

async function copyZoomContent() {
  try {
    await navigator.clipboard.writeText(zoomedContent.value)
    alert('📋 内容已成功复制到剪贴板！')
  } catch (e) {
    console.error('复制失败', e)
  }
}

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
    // 构造携带手牌上下文的 Prompt
    const handStr = props.currentHand.map(t => formatTile(t)).join(' ')
    const meldsStr = props.melds.length > 0
      ? props.melds.map(m => {
          const typeMap: Record<string, string> = { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠', red_zhong_gang: '红中杠' }
          return `${typeMap[m.type] || m.type}${formatTile(m.tile)}`
        }).join('、')
      : '无'
    
    // 适配提示词模式
    const isHongZhongGang = props.gameMode === 'hongzhong_gang'
    const rulesPrompt = isHongZhongGang
      ? `【特别规则】当前对局是“红中杠麻”玩法！
- 红中【绝不能】当成万能赖子牌来凑顺子或刻子，也不参与任何胡牌组合。
- 手牌里有红中时绝对不能直接胡牌，必须打出红中进行“红中单杠”操作并补摸一张牌。
- 胡牌只能自摸。番型倍率：大单调（单调一对）为 3 倍，四红中、暗杠杠开、对对胡为 2 倍，普通胡牌 1 倍。
- 抓马采用“一码全中”，即抓 1 张马牌，若为 1 点则为 100 分，为 2 点为 20 分，为 3 点为 30 分，其余为 N*10 分。马牌得分会乘以胡牌倍率。
- 非四红中胡牌时，每张红中额外加 10 分。`
      : `【特别规则】当前对局是常规“红中麻将”玩法！
- 红中是万能赖子牌，可以代替任何牌来组成顺子、刻子或将牌。
- 胡牌只能自摸。`

    const contextPrompt = `【游戏上下文】当前模式：${isHongZhongGang ? '红中杠麻' : '红中麻将'} | 第${props.round}巡 | 牌堆剩余${props.deckRemaining}张\n手牌（${props.currentHand.length}张）：${handStr || '无'}\n副露：${meldsStr}\n已被打出/公开暴露的牌：${formatVisibleTiles(props.visibleTiles)}\n\n【用户问题】${trimmed}`

    const requestPayload = {
      model: llm.config.value.model,
      messages: [
        { role: 'system', content: `你是红中麻将概率分析专家，红中麻将总共条、筒、万、各九种牌型，每种4张，红中4张，共112张，其中红中是万能牌，可以代替任何牌，只能碰牌 and 杠牌，不能吃牌，胡牌只能自摸胡牌。帮助用户做出最优决策。
${rulesPrompt}

你的分析应该：
- 简洁专业，直接给出建议，中文回答，300字以内
- 结合概率数据和麻将经验
- 指出关键牌的影响
- 诚实评估风险

只输出分析内容，不要输出额外说明。` },
        { role: 'user', content: contextPrompt },
      ],
      max_tokens: 8192,
      ...(llm.config.value.model.includes('kimi-k') ? { temperature: 1 } : { temperature: llm.config.value.temperature }),
    };
    console.log('🚀 [AIChatPanel] 发送给 AI 的完整请求体:', requestPayload);

    const resp = await fetch(formatApiUrl(llm.config.value.apiUrl), {
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
      let reasoning = ''
      let text = msg.content || ''
      
      // 优先获取官方接口的 reasoning_content
      let tempReasoning = msg.reasoning_content || ''
      
      // 兼容第三方中转，从正文中分离出 <think> ... </think> 标签内容
      if (!tempReasoning && /<think>([\s\S]*?)<\/think>/i.test(text)) {
        const match = text.match(/<think>([\s\S]*?)<\/think>/i)
        if (match) {
          tempReasoning = match[1]
        }
      }
      
      // 依据用户设置 of showReasoning 状态进行格式化或过滤剔除
      if (llm.config.value.showReasoning) {
        if (tempReasoning) {
          reasoning = `*【AI 思考过程】*\n_THINK_START_${tempReasoning.trim()}_THINK_END_\n\n`
        }
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      } else {
        reasoning = ''
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
      }
      
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

// 格式化消息（换行 → <br>，**bold**，*italic*，_THINK_START_思考过程_THINK_END_）
function formatMessage(content: string): string {
  if (!content) return ''
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_THINK_START_([\s\S]*?)_THINK_END_/g, '<span class="ai-reasoning">$1</span>')
    .replace(/\n/g, '<br>')
}

// 格式化当前所有公开可见（已被打出、副露暴露）的牌，供大模型进行精细分析
function formatVisibleTiles(tiles: Tile[]): string {
  if (!tiles || tiles.length === 0) return '无'
  
  const groups: Record<string, Record<number, number>> = {
    character: {},
    bamboo: {},
    dot: {},
    red_zhong: {},
  }
  
  for (const t of tiles) {
    if (t.suit === 'red_zhong') {
      groups.red_zhong[0] = (groups.red_zhong[0] || 0) + 1
    } else {
      const suit = t.suit
      const num = t.number || 0
      if (groups[suit]) {
        groups[suit][num] = (groups[suit][num] || 0) + 1
      }
    }
  }
  
  const parts: string[] = []
  
  if (groups.red_zhong[0] > 0) {
    parts.push(`红中*${groups.red_zhong[0]}`)
  }
  
  const suitNames: Record<string, string> = {
    character: '万',
    bamboo: '条',
    dot: '筒',
  }
  
  for (const suit of ['character', 'bamboo', 'dot']) {
    const list: string[] = []
    for (let num = 1; num <= 9; num++) {
      const count = groups[suit][num] || 0
      if (count > 0) {
        list.push(`${num}${suitNames[suit]}*${count}`)
      }
    }
    if (list.length > 0) {
      parts.push(`${suitNames[suit]}牌: ${list.join('、')}`)
    }
  }
  
  return parts.join(' | ')
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

.bubble :deep(.ai-reasoning) {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  display: block;
  margin-top: 6px;
  margin-bottom: 6px;
  border-left: 2px solid rgba(139, 92, 246, 0.4);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  padding: 8px 10px;
}

.bubble :deep(em) {
  font-style: normal;
  color: var(--color-accent);
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.bubble :deep(strong) {
  color: var(--color-primary);
  font-weight: 700;
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

/* 气泡动作 */
.bubble-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  border-top: 1px dashed var(--color-border);
  padding-top: 6px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(255, 94, 94, 0.1);
}

/* 放大查看弹窗 */
:global(.zoom-modal-box) {
  width: 650px;
  max-width: 90vw;
  background: var(--color-card);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.zoom-modal-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
}

:global(.zoom-modal-title) {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

:global(.zoom-close-btn) {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px;
}

:global(.zoom-close-btn:hover) {
  color: var(--color-text);
}

:global(.zoom-content-wrapper) {
  padding: 24px;
  overflow-y: auto;
  max-height: 60vh;
}

:global(.zoom-content) {
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-all;
}

:global(.zoom-content strong) {
  color: #a78bfa;
  font-weight: 700;
}

:global(.zoom-content em) {
  font-style: normal;
  color: var(--color-accent);
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

:global(.zoom-content .ai-reasoning) {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
  display: block;
  margin-bottom: 12px;
  border-left: 3px solid rgba(139, 92, 246, 0.4);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  padding: 10px 14px;
}

:global(.zoom-modal-footer) {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.1);
}
</style>
