// ============================================================
// LLM AI 辅助分析 composable
// 支持 OpenAI 兼容接口（OpenAI / Claude / 国产模型）
// 本地调用，数据不外传
// ============================================================

import { ref, computed } from 'vue'
import type { LLMConfig, LLMPromptContext, LLMAnalysisResult, Tile } from '@/types'
import { formatTile } from '@/algorithms/deck'

// 存储在 localStorage 的 key
const STORAGE_KEY = 'hzmj-llm-config'

// 默认配置
const DEFAULT_CONFIG: LLMConfig = {
  enabled: false,
  apiUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  maxTokens: 1024,
  temperature: 0.7,
  enabledTriggers: ['pong_decision', 'gang_decision', 'switch_decision', 'low_probability', 'manual'],
}

// 加载保存的配置
function loadConfig(): LLMConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG }
}

// 保存配置
function saveConfig(config: LLMConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
}

// 牌列表格式化
function formatHand(tiles: Tile[]): string {
  if (!tiles.length) return '无'
  // 按花色分组
  const groups: Record<string, string[]> = {}
  for (const t of tiles) {
    const key = t.suit
    if (!groups[key]) groups[key] = []
    groups[key].push(formatTile(t))
  }
  return Object.entries(groups).map(([k, v]) => `${k}: ${v.join(',')}`).join(' | ')
}

// 构造提示词
function buildPrompt(ctx: LLMPromptContext): string {
  const triggerLabels: Record<string, string> = {
    pong_decision: '碰牌决策',
    gang_decision: '杠牌决策',
    switch_decision: '听牌换向',
    low_probability: '低概率评估',
    manual: '手动分析',
    game_review: '对局复盘',
  }

  const trigger = triggerLabels[ctx.trigger] || ctx.trigger
  const hand = formatHand(ctx.currentHand)
  const visible = formatHand(ctx.visibleTiles)
  const prob = ctx.probabilityAnalysis
  const deck = ctx.deckRemaining

  let triggerDetail = ''
  if (ctx.trigger === 'pong_decision' && ctx.pendingPong) {
    triggerDetail = `对手打出了【${formatTile(ctx.pendingPong)}】，你在考虑是否碰。`
  } else if (ctx.trigger === 'gang_decision' && ctx.pendingGang) {
    triggerDetail = `你可以对【${formatTile(ctx.pendingGang)}】进行明杠/暗杠。`
  }

  let meldsInfo = ''
  if (ctx.melds.length > 0) {
    meldsInfo = '你的副露：' + ctx.melds.map(m => {
      const typeMap = { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠' }
      return `${typeMap[m.type]}${formatTile(m.tile)}`
    }).join('、')
  }

  let probInfo = ''
  if (prob) {
    const waitingTiles = prob.targetTiles.map(t => formatTile(t)).join('、')
    probInfo = `当前听牌：${waitingTiles || '未听牌'}（${waitingTiles ? prob.targetCount + '张' : ''}）
单巡自摸概率：${prob.singleDrawProb > 0 ? (prob.singleDrawProb * 100).toFixed(1) + '%' : '—'}
期望自摸巡数：${prob.expectedDraws === Infinity ? '—' : prob.expectedDraws.toFixed(1) + '巡'}`
  }

  return `【红中麻将概率训练 - AI 辅助分析】
触发时机：${trigger}
${triggerDetail}
第 ${ctx.round} 巡 | 牌堆剩余：${deck} 张

📋 当前手牌（${ctx.currentHand.length}张）：
${hand}

📋 副露信息：
${meldsInfo || '无'}

📊 河面（已见牌）：
${visible || '无'}

${probInfo}

请给出：
1. 当前局势评估（手牌质量、听牌状态）
2. 决策建议（基于概率和经验）
3. 可能的风险和机会
4. 如果你建议等待，请给出继续等待的理由

分析要求：
- 简洁明了，专业麻将术语
- 适当引用概率数据支撑决策
- 兼顾短期（当巡）和长期（未来几巡）视角`
}

export function useLLM() {
  const config = ref<LLMConfig>(loadConfig())
  const result = ref<LLMAnalysisResult | null>(null)
  const loading = ref(false)

  const isEnabled = computed(() => config.value.enabled && !!config.value.apiUrl && !!config.value.apiKey)

  // 保存配置
  function updateConfig(updates: Partial<LLMConfig>) {
    config.value = { ...config.value, ...updates }
    saveConfig(config.value)
  }

  // 调用 LLM
  async function analyze(ctx: LLMPromptContext): Promise<LLMAnalysisResult> {
    if (!isEnabled.value) {
      return { success: false, error: 'LLM 未配置或未启用' }
    }

    loading.value = true
    result.value = null
    const start = Date.now()

    try {
      const prompt = buildPrompt(ctx)

      const messages = [
        {
          role: 'system' as const,
          content: `你是红中麻将的概率分析专家，帮助用户做出最优决策。
你的分析应该：
- 简洁专业，直接给出建议
- 结合概率数据和麻将经验
- 指出关键牌的影响
- 诚实评估风险

只输出分析内容，不要输出额外说明。`
        },
        { role: 'user' as const, content: prompt }
      ]

      const response = await fetch(config.value.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.value.apiKey}`,
        },
        body: JSON.stringify({
          model: config.value.model,
          messages,
          max_tokens: config.value.maxTokens,
          temperature: config.value.temperature,
        }),
      })

      const data = await response.json()
      const latency = Date.now() - start

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`,
          latency,
        }
      }

      const content = data.choices?.[0]?.message?.content || ''
      result.value = {
        success: true,
        content,
        latency,
        model: data.model || config.value.model,
      }
      return result.value

    } catch (err: any) {
      const latency = Date.now() - start
      return { success: false, error: err.message || '网络错误', latency }
    } finally {
      loading.value = false
    }
  }

  // 判断是否应该自动触发
  function shouldAutoTrigger(trigger: LLMPromptContext['trigger']): boolean {
    if (!isEnabled.value) return false
    return config.value.enabledTriggers.includes(trigger)
  }

  // 重置结果
  function clearResult() {
    result.value = null
  }

  return {
    config,
    result,
    loading,
    isEnabled,
    updateConfig,
    analyze,
    shouldAutoTrigger,
    clearResult,
  }
}
