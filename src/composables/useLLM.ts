// ============================================================
// LLM AI 辅助分析 composable
// 支持 OpenAI 兼容接口（OpenAI / Claude / 国产模型）
// 本地调用，数据不外传
// ============================================================

import { ref, computed } from 'vue'
import type { LLMConfig, LLMPromptContext, LLMAnalysisResult, Tile, MeldType, Meld, GameAction } from '@/types'
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
  showReasoning: true,
  enabledTriggers: ['pong_decision', 'gang_decision', 'switch_decision', 'low_probability', 'manual'],
}

// 格式化 API 地址为标准的 OpenAI 兼容 completions 端点
export function formatApiUrl(url: string): string {
  let cleanUrl = url.trim()
  if (!cleanUrl) return ''
  
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl
  }
  
  cleanUrl = cleanUrl.replace(/\/+$/, '')
  
  if (cleanUrl.endsWith('/chat/completions')) {
    return cleanUrl
  }
  
  if (cleanUrl.endsWith('/v1')) {
    return cleanUrl + '/chat/completions'
  }
  
  if (!cleanUrl.includes('/chat/completions')) {
    if (cleanUrl.includes('/v1')) {
      cleanUrl = cleanUrl + '/chat/completions'
    } else {
      cleanUrl = cleanUrl + '/v1/chat/completions'
    }
  }
  
  return cleanUrl
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
      const typeMap: Record<MeldType, string> = { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠', red_zhong_gang: '红中杠' }
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

  const modeLabel = ctx.gameMode === 'hongzhong_gang' ? '红中杠麻模式' : '传统红中麻将'
  return `【${modeLabel} - AI 辅助分析】
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
    if (updates.apiUrl !== undefined) {
      updates.apiUrl = formatApiUrl(updates.apiUrl)
    }
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

      const isHongZhongGang = ctx.gameMode === 'hongzhong_gang'
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

      const messages = [
        {
          role: 'system' as const,
          content: `你是红中麻将的概率分析专家，红中麻将总共条、筒、万、各九种牌型，每种4张，红中4张，共112张，其中红中是万能牌，可以代替任何牌，只能碰牌和杠牌，不能吃牌，胡牌只能自摸胡牌。帮助用户做出最优决策。
${rulesPrompt}

你的分析应该：
- 简洁专业，直接给出建议，中文回答，300字以内
- 结合概率数据和麻将经验
- 指出关键牌的影响
- 诚实评估风险

只输出分析内容，不要输出额外说明。`
        },
        { role: 'user' as const, content: prompt }
      ]
      const requestPayload = {
        model: config.value.model,
        messages,
        max_tokens: config.value.maxTokens || 2048,
        ...(config.value.model.includes('kimi-k') ? { temperature: 1 } : { temperature: config.value.temperature }),
      };
      console.log('🚀 [useLLM] 发送给 AI 的完整请求体:', requestPayload);

      const response = await fetch(formatApiUrl(config.value.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.value.apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json()
      console.log('🎯 [useLLM] AI 完整返回结果:', data);
      if (response.ok) {
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
        
        // 依据用户设置的 showReasoning 状态进行格式化或过滤剔除
        if (config.value.showReasoning) {
          if (tempReasoning) {
            reasoning = `**【AI 思考过程】**\n_${tempReasoning.trim()}_\n\n`
          }
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        } else {
          reasoning = ''
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        }
        
        const finalContent = (reasoning + text).trim()
        result.value = {
          success: true,
          content: finalContent || '未返回任何分析内容',
          latency: Date.now() - start,
          model: data.model || config.value.model
        }
        return result.value
      } else {
        const errorMsg = data.error?.message || data.message || data.msg || JSON.stringify(data) || `HTTP ${response.status}`;
        const errorResult = {
          success: false as const,
          error: errorMsg,
          latency: Date.now() - start
        }
        result.value = errorResult
        return errorResult
      }
    } catch (err: any) {
      const latency = Date.now() - start
      return { success: false, error: err.message || '网络错误', latency }
    } finally {
      loading.value = false
    }
  }

  // 上帝视角对局复盘分析
  async function analyzeGodView(history: GameAction[], gameMode: string): Promise<LLMAnalysisResult> {
    if (!isEnabled.value) {
      return { success: false, error: 'LLM 未配置或未启用' }
    }

    loading.value = true
    const start = Date.now()

    try {
      const historyText = formatGameHistoryCompact(history)
      const isHongZhongGang = gameMode === 'hongzhong_gang'
      
      const systemPrompt = `你需要扮演红中麻将概率分析与复盘专家，以中立、客观、严谨的态度，对用户的这一局所有决策进行上帝视角的深度复盘分析。
当前对局模式：${isHongZhongGang ? '【红中杠麻】（规则：红中不能当赖子，必须单杠补摸，只能自摸胡牌）' : '【传统红中麻将】（规则：红中是万能赖子牌，只能自摸胡牌）'}。

用户打完了一局游戏，你需要结合对局时序历史以及每巡的向听数、有效进张等精准数据，给出你作为顶级 AI 专家的独立深度复盘分析报告。

【关键要求】在进行打法对比时，请不要盲目迷信或直接抄袭历史记录中的系统推荐打法（底层的系统算法是固定算法，存在局限性）。你应当作为拥有更高维决策能力的 AI，结合瞬时概率、向听数走势、河面以及防守/听牌走向，独立思考出最优打法作为“AI 推荐打出”，并与“玩家实际打出”进行深入比对。

复盘报告格式必须以 Markdown 展现，内容分成以下 4 个部分：

1. **【大局观评分】**：在开头显式给出一个评分（例如：85分），分值区间 0-100，客观评估玩家本局的综合决策水平。
2. **【关键决策对比】**：扫描对局时序，一旦发现玩家的选择在概率、向听数或长远局势上不是你所推演出的最优解时，必须明确对比指出：
   - **第X巡**
   - **玩家打出**：具体牌名（如“5筒”）（玩家保留有效进张：Y张）
   - **AI 推荐打出**：你（AI）推演出的最优推荐牌名（如“3筒”）（最大可能进张：W张）
   - **详细的理由**：从向听数走势、概率高低、防守逻辑及麻将牌理逻辑，客观详细对比分析玩家打错的原因。
3. **【初始配牌解析】**：点评起手牌的质量，并建议最佳的胡牌番型 and 听牌走向。
4. **【战术总结与教练建议】**：总结本局玩家体现出的决策倾向，给出 2-3 条基于数据与概率的提升建议。

分析要求与限制：
- 语气要求：中立、客观、严谨，打错的决策必须一针见血地结合概率数据清晰指出来，无倾向性情绪。
- 必须统一使用中文牌名表达（如“3筒”、“5条”、“1万”、“红中”），严禁在分析中使用“3T”、“5B”、“RZ”等英文缩写。
- 字数不限，请对整局的概率与数据演化进行极其详尽、全面的结构化分析。`

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: `这是本局的对局时序记录，请总教练进行复盘评估：\n\n${historyText}` }
      ]

      const requestPayload = {
        model: config.value.model,
        messages,
        max_tokens: 4096,
        ...(config.value.model.includes('kimi-k') ? { temperature: 1 } : { temperature: config.value.temperature }),
      }
      console.log('🚀 [useLLM] 发送上帝视角复盘请求:', requestPayload)

      const response = await fetch(formatApiUrl(config.value.apiUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.value.apiKey}`,
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json()
      console.log('🎯 [useLLM] 上帝视角复盘返回结果:', data)
      
      if (response.ok) {
        const msg = data.choices?.[0]?.message || {}
        let reasoning = ''
        let text = msg.content || ''
        
        let tempReasoning = msg.reasoning_content || ''
        if (!tempReasoning && /<think>([\s\S]*?)<\/think>/i.test(text)) {
          const match = text.match(/<think>([\s\S]*?)<\/think>/i)
          if (match) tempReasoning = match[1]
        }
        
        if (config.value.showReasoning) {
          if (tempReasoning) {
            reasoning = `**【AI 思考过程】**\n_${tempReasoning.trim()}_\n\n`
          }
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        } else {
          reasoning = ''
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        }
        
        return {
          success: true,
          content: (reasoning + text).trim() || '未返回复盘内容',
          latency: Date.now() - start,
          model: data.model || config.value.model
        }
      } else {
        const errorMsg = data.error?.message || data.message || data.msg || JSON.stringify(data) || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMsg,
          latency: Date.now() - start
        }
      }
    } catch (err: any) {
      let errMsg = err.message || '网络错误'
      if (errMsg.includes('Failed to fetch') || errMsg.includes('fetch')) {
        errMsg = `大模型请求失败（Failed to fetch）。这通常是由于浏览器跨域（CORS）限制或网络连接问题导致。请确保您的 API 地址允许跨域访问，或尝试使用支持 CORS 的代理端点，也可以检查本地代理工具的代理设置。`
      }
      return { success: false, error: errMsg, latency: Date.now() - start }
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
    analyzeGodView,
    shouldAutoTrigger,
    clearResult,
  }
}

// ============================================================
// 上帝视角辅助格式化函数
// ============================================================

// 格式化牌名表记为中文简写形式（如红中、5万、3条、2筒）
function formatTileCompact(t: Tile): string {
  if (t.suit === 'red_zhong') return '红中'
  const suffixMap: Record<string, string> = {
    character: '万',
    bamboo: '条',
    dot: '筒'
  }
  return `${t.number}${suffixMap[t.suit] || ''}`
}

function formatHandCompact(tiles?: Tile[]): string {
  if (!tiles || tiles.length === 0) return '无'
  return tiles.map(t => formatTileCompact(t)).join(' ')
}

function formatMeldsCompact(melds?: Meld[]): string {
  if (!melds || melds.length === 0) return '无'
  const typeMap: Record<string, string> = {
    pong: '碰',
    exposed_gang: '明杠',
    concealed_gang: '暗杠',
    red_zhong_gang: '红中杠'
  }
  return melds.map(m => `${typeMap[m.type] || m.type}${formatTileCompact(m.tile)}`).join('、')
}

function formatGameHistoryCompact(history: GameAction[]): string {
  if (!history || history.length === 0) return '无对局记录'
  
  const lines: string[] = []
  const oppNames = ['东', '南', '西']
  
  for (const act of history) {
    if (act.type === 'starting_hand') {
      const shantenText = act.shantenSnapshot !== undefined ? `${act.shantenSnapshot}向听` : '未知'
      const effCount = act.effectiveDrawCountSnapshot || 0
      const effTiles = formatHandCompact(act.effectiveDrawTilesSnapshot)
      const prob = act.singleDrawProbSnapshot !== undefined ? `${(act.singleDrawProbSnapshot * 100).toFixed(1)}%` : '0%'
      
      lines.push(`【配牌/初始手牌】: ${formatHandCompact(act.handSnapshot)} [向听数: ${shantenText} | 有效进张: ${effTiles} (共 ${effCount} 张) | 自摸概率: ${prob}]`)
      continue
    }
    
    const prefix = `第 ${act.round} 巡:`
    const shantenText = act.shantenSnapshot !== undefined ? `${act.shantenSnapshot}向听` : '未知'
    const effCount = act.effectiveDrawCountSnapshot || 0
    const effTiles = formatHandCompact(act.effectiveDrawTilesSnapshot)
    const prob = act.singleDrawProbSnapshot !== undefined ? `${(act.singleDrawProbSnapshot * 100).toFixed(1)}%` : '0%'
    const deckRem = act.deckRemainingSnapshot !== undefined ? ` (牌堆剩 ${act.deckRemainingSnapshot} 张)` : ''
    
    if (act.type === 'draw' && act.tile) {
      lines.push(`${prefix} 摸牌: ${formatTileCompact(act.tile)} | 此时手牌: ${formatHandCompact(act.handSnapshot)} | 副露: ${formatMeldsCompact(act.meldsSnapshot)} [向听数: ${shantenText} | 有效进张: ${effTiles} (共 ${effCount} 张) | 自摸概率: ${prob}${deckRem}]`)
    } else if (act.type === 'discard' && act.tile) {
      if (act.fromOpponent !== undefined) {
        lines.push(`${prefix} 对手[${oppNames[act.fromOpponent] || act.fromOpponent}] 打出: ${formatTileCompact(act.tile)}`)
      } else {
        lines.push(`${prefix} 打出: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)} [玩家此手保留有效进张: ${effCount} 张 | 向听数: ${shantenText}${deckRem}]`)
      }
    } else if (act.type === 'pong' && act.tile) {
      lines.push(`${prefix} 碰牌: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)} [碰后向听数: ${shantenText} | 碰后有效进张: ${effCount} 张]`)
    } else if (act.type === 'gang' && act.tile) {
      lines.push(`${prefix} 杠牌: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)} [杠后向听数: ${shantenText} | 杠后有效进张: ${effCount} 张]`)
    } else if (act.type === 'self_draw' && act.tile) {
      lines.push(`${prefix} 🎉 自摸胡牌! 胡牌张: ${formatTileCompact(act.tile)} | 最终手牌: ${formatHandCompact(act.handSnapshot)} | 最终副露: ${formatMeldsCompact(act.meldsSnapshot)}`)
    }
  }
  
  return lines.join('\n')
}
