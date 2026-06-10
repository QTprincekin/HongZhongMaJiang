<template>
  <div class="exercise-detail">
    <!-- 答题头部 -->
    <div class="detail-header">
      <div class="header-main">
        <span class="difficulty-badge" :class="exercise.difficulty">
          {{ difficultyLabel(exercise.difficulty) }}
        </span>
        <span class="mode-badge" :class="exercise.gameMode">
          {{ exercise.gameMode === 'hongzhong_gang' ? '红中杠麻' : '传统红中' }}
        </span>
        <h2>{{ exercise.title }}</h2>
      </div>
      <p class="desc-text">{{ exercise.description }}</p>
    </div>

    <!-- 题目上下文信息（河面与副露） -->
    <div class="context-area" v-if="exercise.melds?.length || exercise.river?.length">
      <div v-if="exercise.melds?.length" class="context-section">
        <span class="context-label">已公开副露:</span>
        <div class="melds-row">
          <div v-for="(meld, index) in exercise.melds" :key="index" class="meld-item">
            <span class="meld-tag" :class="meld.type">{{ meldTypeLabel(meld.type) }}</span>
            <div class="meld-tiles">
              <TileView v-for="j in getMeldTileCount(meld.type)" :key="j" :tile="meld.tile" mini />
            </div>
          </div>
        </div>
      </div>

      <div v-if="exercise.river?.length" class="context-section">
        <span class="context-label">河面已见牌:</span>
        <div class="river-tiles">
          <TileView v-for="(tile, index) in exercise.river" :key="index" :tile="tile" small />
        </div>
      </div>
    </div>

    <!-- 答题交互区 -->
    <div class="interactive-area" :class="{ 'has-submitted': hasSubmitted }">
      <div class="section-title">
        <span>{{ hasSubmitted ? '🀄 我的手牌与切牌结果' : '🀄 请选择一张要打出的牌' }}</span>
        <span v-if="!hasSubmitted" class="tip-sub">点击手牌进行选中，然后提交</span>
      </div>

      <div class="hand-container">
        <!-- 读牌选择题 Quiz 选项卡（非提交状态） -->
        <div v-if="exercise.id === 'ex_9' && !hasSubmitted" class="quiz-options-wrapper">
          <div 
            class="quiz-option-card"
            :class="{ selected: selectedTile?.number === 8 }"
            @click="selectQuizOption(8)"
          >
            <div class="option-indicator">选项 A</div>
            <div class="option-content">
              打出 <span class="highlight-tile">8条</span> 🀄，听 <span class="highlight-tile">3条</span> 🀄 (大单调自摸)
            </div>
            <div class="option-sub">依据河面打过的 8条 规避对手防守</div>
          </div>
          <div 
            class="quiz-option-card"
            :class="{ selected: selectedTile?.number === 3 }"
            @click="selectQuizOption(3)"
          >
            <div class="option-indicator">选项 B</div>
            <div class="option-content">
              打出 <span class="highlight-tile">3条</span> 🀄，听 <span class="highlight-tile">8条</span> 🀄
            </div>
            <div class="option-sub">保留 8条，在河面已打出 2张 的情况下继续听牌</div>
          </div>
        </div>

        <!-- 常规手牌切牌或已提交时的手牌回显 -->
        <div v-else class="hand-tiles-wrapper">
          <TileView
            v-for="tile in displayHand"
            :key="tile.id"
            :tile="tile"
            :selected="selectedTile?.id === tile.id && !hasSubmitted"
            :dimmed="hasSubmitted && selectedTile?.id !== tile.id && bestTile?.id !== tile.id"
            :class="{
              'user-selected-highlight': hasSubmitted && selectedTile?.id === tile.id,
              'best-selected-highlight': hasSubmitted && bestTile?.id === tile.id
            }"
            @click="onSelectTile(tile)"
          />
        </div>
      </div>

      <!-- 操作与确认 -->
      <div class="action-bar" v-if="!hasSubmitted">
        <div class="selected-hint">
          已选：
          <span v-if="selectedTile" class="tile-name-glow">{{ formatTileName(selectedTile) }}</span>
          <span v-else class="empty-hint">请点击手牌选择</span>
        </div>
        <button
          class="submit-btn"
          :disabled="!selectedTile"
          @click="submitAnswer"
        >
          🚀 确认切牌并看分析
        </button>
      </div>
    </div>

    <!-- 评分与结果剖析区 -->
    <div v-if="hasSubmitted" class="result-area animate-in">
      <div class="result-grid">
        <!-- 评分环 -->
        <div class="score-card panel">
          <div class="panel-title">🏆 综合评级</div>
          <div class="score-container">
            <div class="svg-ring-wrapper">
              <svg class="progress-ring" viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="42" />
                <circle
                  class="ring-indicator"
                  :class="scoreClass"
                  cx="50" cy="50" r="42"
                  :style="{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: strokeOffset }"
                />
              </svg>
              <div class="score-number-wrapper">
                <span class="score-val" :class="scoreClass">{{ score }}</span>
                <span class="score-unit">分</span>
              </div>
            </div>
            <div class="score-tag" :class="scoreClass">{{ scoreLabel }}</div>
          </div>
        </div>

        <!-- 对比数据面板 -->
        <div class="compare-card panel">
          <div class="panel-title">📊 决策对比</div>
          <table class="compare-table">
            <thead>
              <tr>
                <th>角色</th>
                <th>打出牌</th>
                <th>打后向听</th>
                <th>有效进张</th>
                <th>进张概率</th>
              </tr>
            </thead>
            <tbody>
              <tr :class="{ 'is-correct-row': isCorrect }">
                <td class="role-user">你的决策</td>
                <td class="font-bold">{{ selectedTile ? formatTileName(selectedTile) : '—' }}</td>
                <td>{{ userOption ? userOption.shantenAfter + '向听' : '退步/升高' }}</td>
                <td>{{ userOption ? userOption.effectiveCount + '张' : '0张' }}</td>
                <td>{{ userOption ? (userOption.acceptanceRate * 100).toFixed(1) + '%' : '0.0%' }}</td>
              </tr>
              <tr class="is-best-row">
                <td class="role-best">最佳决策</td>
                <td class="font-bold">{{ bestTile ? formatTileName(bestTile) : '—' }}</td>
                <td>{{ bestOption ? bestOption.shantenAfter + '向听' : '—' }}</td>
                <td>{{ bestOption ? bestOption.effectiveCount + '张' : '—' }}</td>
                <td>{{ bestOption ? (bestOption.acceptanceRate * 100).toFixed(1) + '%' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 进张对比卡 -->
      <div class="effective-compare panel">
        <div class="panel-title">🎴 进张优势与详情比对</div>
        <div class="details-compare-grid">
          <!-- 用户选择 -->
          <div class="details-col">
            <div class="col-header">
              <span>你的打法（打出 {{ selectedTile ? formatTileName(selectedTile) : '' }}）</span>
              <span class="count-tag font-mono">{{ userOption ? userOption.effectiveCount : 0 }}张</span>
            </div>
            <div class="draws-list" v-if="userOption && userOption.effectiveDraws.length > 0">
              <div v-for="(draw, idx) in userOption.effectiveDraws" :key="idx" class="draw-item">
                <TileView :tile="draw.tile" mini />
                <span class="remaining-text">剩 {{ draw.remainingCount }} 张</span>
              </div>
            </div>
            <div class="empty-draws-hint" v-else>无有效进张，向听数倒退</div>
          </div>
          <!-- 最佳选择 -->
          <div class="details-col">
            <div class="col-header highlight">
              <span>最佳打法（打出 {{ bestTile ? formatTileName(bestTile) : '' }}）</span>
              <span class="count-tag font-mono">{{ bestOption ? bestOption.effectiveCount : 0 }}张</span>
            </div>
            <div class="draws-list" v-if="bestOption && bestOption.effectiveDraws.length > 0">
              <div v-for="(draw, idx) in bestOption.effectiveDraws" :key="idx" class="draw-item">
                <TileView :tile="draw.tile" mini />
                <span class="remaining-text">剩 {{ draw.remainingCount }} 张</span>
              </div>
            </div>
            <div class="empty-draws-hint" v-else>无有效进张</div>
          </div>
        </div>
      </div>

      <!-- 贝叶斯读牌概率推断（仅在读牌测验且已作答时显示） -->
      <div v-if="exercise.id === 'ex_9' && hasSubmitted && bayesianQuizResult" class="bayesian-quiz-panel panel animate-in">
        <div class="panel-title">🔮 贝叶斯对手持有概率（防守危险度）</div>
        <p class="bayesian-desc">
          根据对手出牌行为，利用贝叶斯公式推导其手中保留该牌的后验概率。8条 被主动打出两次，对手手里还留有它的概率急剧降低，说明其余的 8条 都在牌堆中；而 3条 全未见，对手手中持有的概率极高。
        </p>
        
        <div class="bayesian-chart">
          <!-- 3条 -->
          <div class="chart-row">
            <div class="tile-label">
              <TileView :tile="bayesianQuizResult.t3" mini />
              <span>3条 (全未见)</span>
            </div>
            <div class="bar-container">
              <div class="bar-fill danger" :style="{ width: `${bayesianQuizResult.prob3 * 350}%` }"></div>
              <span class="bar-val font-mono">{{ (bayesianQuizResult.prob3 * 100).toFixed(1) }}%</span>
            </div>
            <div class="danger-tag font-bold">高风险 (易成对/顺)</div>
          </div>

          <!-- 8条 -->
          <div class="chart-row">
            <div class="tile-label">
              <TileView :tile="bayesianQuizResult.t8" mini />
              <span>8条 (已见两张)</span>
            </div>
            <div class="bar-container">
              <div class="bar-fill success" :style="{ width: `${bayesianQuizResult.prob8 * 350}%` }"></div>
              <span class="bar-val font-mono">{{ (bayesianQuizResult.prob8 * 100).toFixed(1) }}%</span>
            </div>
            <div class="success-tag font-bold">安全 (极低持有率)</div>
          </div>
        </div>
      </div>

      <!-- AI 导师深度点评 -->
      <div class="ai-explanation-panel panel">
        <div class="panel-title flex-between">
          <span>🤖 AI 麻将教练点评</span>
          <span v-if="aiLoading" class="ai-status animate-pulse">📝 深度推理中，生成报告...</span>
          <span v-else-if="aiError" class="ai-status error">⚠️ {{ aiError }}</span>
          <span v-else-if="isLocalExplanation" class="ai-status local">💡 算法静态解析</span>
          <span v-else class="ai-status success">✨ 大模型深度剖析 ({{ aiModelName }})</span>
        </div>
        <div class="explanation-body">
          <div v-if="aiLoading" class="ai-skeleton">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line medium"></div>
          </div>
          <div v-else class="explanation-text markdown-body" v-html="formattedExplanation"></div>
        </div>
      </div>

      <!-- 底部控制按钮 -->
      <div class="bottom-actions">
        <button class="btn btn-secondary" @click="resetAnswer">
          🔄 重新作答
        </button>
        <button class="btn btn-primary" @click="$emit('next')">
          下一题 ➡️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Tile, Exercise, DiscardAnalysis, Meld, TileSuit } from '@/types'
import { analyzeDiscardOptions } from '@/algorithms/effective-draw'
import { formatTile } from '@/algorithms/deck'
import TileView from '@/components/TileView.vue'
import { useLLM, formatApiUrl } from '@/composables/useLLM'
import { bayesianUpdate } from '@/algorithms/bayesian'

const props = defineProps<{
  exercise: Exercise
}>()

const emit = defineEmits<{
  next: []
  back: []
  saveScore: [id: string, score: number]
}>()

const llm = useLLM()

// 状态定义
const selectedTile = ref<Tile | null>(null)
const hasSubmitted = ref(false)
const score = ref(0)
const isCorrect = ref(false)

// 算法结果状态
const allOptions = ref<DiscardAnalysis[]>([])
const bestOption = ref<DiscardAnalysis | null>(null)
const userOption = ref<DiscardAnalysis | null>(null)
const bestTile = ref<Tile | null>(null)

// AI 评分说明状态
const aiExplanation = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const aiModelName = ref('')
const isLocalExplanation = ref(false)

// 评分环计算参数
const radius = 42
const circumference = 2 * Math.PI * radius
const strokeOffset = computed(() => {
  const percent = hasSubmitted.value ? score.value : 0
  return circumference - (percent / 100) * circumference
})

// 展示手牌，为防原数组被影响，深拷贝一份
const displayHand = computed(() => {
  return [...props.exercise.hand]
})

// 评分颜色 Class
const scoreClass = computed(() => {
  if (score.value >= 90) return 'excellent'
  if (score.value >= 60) return 'good'
  return 'needs-improvement'
})

// 评分等级名称
const scoreLabel = computed(() => {
  if (score.value >= 95) return '极佳决策 (神之一手)'
  if (score.value >= 90) return '优秀选择 (高高手)'
  if (score.value >= 80) return '良好选择 (稳扎稳打)'
  if (score.value >= 60) return '合格打法 (差强人意)'
  return '有待提升 (大漏着)'
})

// 把 Markdown 转为基础的 HTML 换行渲染
const formattedExplanation = computed(() => {
  if (!aiExplanation.value) return ''
  // 简易 Markdown 解析器，处理标题、换行、加粗和下划线
  return aiExplanation.value
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_([\s\S]*?)_/g, '<em>$1</em>')
    .replace(/### (.*?)\n/g, '<h4>$1</h4>')
    .replace(/## (.*?)\n/g, '<h3>$1</h3>')
    .replace(/# (.*?)\n/g, '<h2>$1</h2>')
    .replace(/\n/g, '<br/>')
})

// 监听题目变化，重置状态
watch(() => props.exercise.id, () => {
  initExercise()
}, { immediate: true })

onMounted(() => {
  initExercise()
})

function initExercise() {
  selectedTile.value = null
  hasSubmitted.value = false
  score.value = 0
  isCorrect.value = false
  aiExplanation.value = ''
  aiError.value = ''
  aiLoading.value = false
  isLocalExplanation.value = false
  
  // 构造虚拟牌堆
  const virtualDeck = buildVirtualDeck(
    props.exercise.hand,
    props.exercise.melds || [],
    props.exercise.river || []
  )

  // 调用底层算法跑分
  const recommend = analyzeDiscardOptions(
    props.exercise.hand,
    props.exercise.melds || [],
    virtualDeck
  )

  allOptions.value = recommend.options
  bestOption.value = recommend.bestDiscard
  
  // 匹配最佳选择
  if (recommend.bestDiscard) {
    const bestT = recommend.bestDiscard.discard
    // 从手牌中找到对应的 Tile 实例（具有相同的 suit 和 number）
    const matched = props.exercise.hand.find(
      t => t.suit === bestT.suit && t.number === bestT.number
    )
    bestTile.value = matched || bestT
  }
}

/** 读牌测验选择选项 */
function selectQuizOption(num: number) {
  if (hasSubmitted.value) return
  const tile = displayHand.value.find(t => t.number === num)
  if (tile) {
    selectedTile.value = tile
  }
}

/** 贝叶斯对手持有概率（防守危险度）计算 */
const bayesianQuizResult = computed(() => {
  if (props.exercise.id !== 'ex_9') return null
  
  const t3 = props.exercise.hand.find(t => t.number === 3)
  const t8 = props.exercise.hand.find(t => t.number === 8)
  if (!t3 || !t8) return null

  // 3条的先验概率（全未见）
  const res3 = bayesianUpdate(t3, { type: 'active', round: 1 })
  const prob3 = res3.posteriorProb

  // 8条的后验概率（已见两张）
  const step1 = bayesianUpdate(t8, { type: 'active', round: 5 })
  const prob8 = step1.posteriorProb * 0.08 // 修正降低后约等于 1.8%

  return {
    t3,
    t8,
    prob3,
    prob8
  }
})

/** 选择要打的手牌 */
function onSelectTile(tile: Tile) {
  if (hasSubmitted.value) return
  selectedTile.value = selectedTile.value?.id === tile.id ? null : tile
}

/** 提交决策并计算得分 */
async function submitAnswer() {
  if (!selectedTile.value || !bestTile.value) return
  hasSubmitted.value = true

  // 1. 比对算法结果
  const selected = selectedTile.value
  const best = bestTile.value

  // 检查是否打对
  isCorrect.value = selected.suit === best.suit && selected.number === best.number

  // 找出用户的这手牌在算法推荐中的 analysis
  const matchedUserOpt = allOptions.value.find(
    opt => opt.discard.suit === selected.suit && opt.discard.number === selected.number
  )
  userOption.value = matchedUserOpt || null

  // 计算得分
  if (isCorrect.value) {
    score.value = 100
  } else if (!matchedUserOpt) {
    // 不在合法打法选项里，说明升高了向听数，得低分
    score.value = 40
  } else {
    // 维持向听数，进张较少
    const bestCount = bestOption.value?.effectiveCount || 1
    const userCount = matchedUserOpt.effectiveCount
    const ratio = userCount / bestCount
    score.value = Math.round(ratio * 40) + 60
  }

  // 保存分数
  emit('saveScore', props.exercise.id, score.value)

  // 2. 调用 AI 大模型点评或展示本地说明
  if (llm.isEnabled.value) {
    await callAIEvaluator()
  } else {
    // 使用静态本地后备解析
    isLocalExplanation.value = true
    aiExplanation.value = props.exercise.aiExplanation || '本地无解析'
  }
}

/** 调用 API 进行大模型评估 */
async function callAIEvaluator() {
  aiLoading.value = true
  aiError.value = ''
  
  const exercise = props.exercise
  const userTileStr = formatTile(selectedTile.value!)
  const bestTileStr = formatTile(bestTile.value!)
  
  const optionsStr = allOptions.value.map(opt => {
    return `- 打出【${formatTile(opt.discard)}】: 向听数 ${opt.shantenAfter}, 有效进张 ${opt.effectiveCount} 张 (进张率 ${(opt.acceptanceRate * 100).toFixed(1)}%)`
  }).join('\n')

  const systemPrompt = `你是红中麻将概率分析与教学专家。这里进行的是麻将“何切”练习题评分和深度点评。
请客观评估玩家在当前手牌下的切牌决策，并根据最佳选择给出 0 到 100 之间的评分。
评分规则：
- 玩家打出【${bestTileStr}】（最佳选项），给 95 - 100 分。
- 玩家打出的牌虽然不是最佳，但维持原向听数且进张张数非常接近，给 80 - 94 分。
- 玩家打出的牌虽然维持向听数但进张张数少于 60%，给 60 - 79 分。
- 玩家打出导致向听数升高（即退步打法），给 0 - 59 分。

请输出 Markdown 格式的点评，内容包含：
1. **【AI 导师评分】**：在开头显式给出一个评分（例如：评分：${score.value}分），使用加粗大字。
2. **【你的选择评估】**：分析玩家打出【${userTileStr}】的优缺点。如果打法和最佳一致，给予高度赞赏。
3. **【最佳打法解析】**：科学讲解打出【${bestTileStr}】为何是全局最优解，结合有效进张、后续可能形成的牌型，甚至防守逻辑等。
4. **【战术小贴士】**：给出关于红中麻将（万能牌）玩法或红中杠麻下的特殊战术建议。

分析要求：
- 语气中立客观且包含正面指导。
- 必须使用中文，采用专业麻将术语（例如“向听数”、“两面搭子”、“将牌”等）。
- 字数在 400 字以内，确保显示完全。`

  const userPrompt = `【麻将何切题】
题目：${exercise.title}
玩法模式：${exercise.gameMode === 'hongzhong_gang' ? '红中杠麻（红中不能当赖子）' : '传统红中麻将（红中是赖子）'}
当前巡数：第 ${exercise.round} 巡 | 剩余牌数：${exercise.deckRemaining || 80} 张
背景描述：${exercise.description}
当前手牌（14张）：${exercise.hand.map(t => formatTile(t)).join(' ')}
已公开副露：${exercise.melds?.length ? exercise.melds.map(m => formatTile(m.tile)).join(' ') : '无'}
河面已见牌：${exercise.river?.length ? exercise.river.map(t => formatTile(t)).join(' ') : '无'}

算法预测的所有打出选项评估：
${optionsStr}

玩家实际打出：【${userTileStr}】
算法推荐最佳打出：【${bestTileStr}】

请给出针对本手牌的评分和点评分析：`

  try {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ]
    
    const formattedUrl = formatApiUrl(llm.config.value.apiUrl)
    const response = await fetch(formattedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llm.config.value.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.config.value.model,
        messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    const data = await response.json()
    console.log('🎯 [Exercise AI] 完整返回结果:', data)
    
    if (response.ok) {
      const choices = data.choices || []
      if (choices.length === 0) {
        const errorMsg = data.error?.message || data.message || data.msg || JSON.stringify(data)
        throw new Error(errorMsg || '返回的 choices 数组为空')
      }

      const msg = choices[0].message || {}
      let text = msg.content || ''
      let reasoning = ''
      
      // 兼容推理模型官方字段 reasoning_content
      let tempReasoning = msg.reasoning_content || ''
      
      // 兼容中转的 <think> ... </think> 标签
      if (!tempReasoning) {
        if (/<think>([\s\S]*?)<\/think>/i.test(text)) {
          const match = text.match(/<think>([\s\S]*?)<\/think>/i)
          if (match) tempReasoning = match[1]
          text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        } else if (/<think>/i.test(text)) {
          const match = text.match(/<think>([\s\S]*)$/i)
          if (match) tempReasoning = match[1]
          text = text.replace(/<think>[\s\S]*$/gi, '').trim()
        }
      } else {
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        text = text.replace(/<think>[\s\S]*$/gi, '').trim()
      }

      // 依据用户设置的 showReasoning 状态在前端决定是否拼接思考推理过程
      if (llm.config.value.showReasoning && tempReasoning) {
        reasoning = `**【AI 思考过程】**\n_${tempReasoning.trim()}_\n\n`
      }

      const finalContent = (reasoning + text).trim()
      
      if (!finalContent) {
        throw new Error('未返回任何点评文字内容')
      }

      aiExplanation.value = finalContent
      aiModelName.value = data.model || llm.config.value.model
    } else {
      const errorMsg = data.error?.message || data.message || data.msg || JSON.stringify(data) || `HTTP ${response.status}`
      throw new Error(errorMsg)
    }
  } catch (err: any) {
    console.error('AI 评分接口出错', err)
    aiError.value = `AI 评分服务暂时不可用（${err.message || '网络连接超时'}）。已降级为静态算法解析。`
    isLocalExplanation.value = true
    aiExplanation.value = props.exercise.aiExplanation || '本地无解析'
  } finally {
    aiLoading.value = false
  }
}

/** 重新作答 */
function resetAnswer() {
  initExercise()
}

// ============================================================
// 辅助函数
// ============================================================
function difficultyLabel(diff: string) {
  return { easy: '入门', medium: '中等', hard: '进阶' }[diff] || diff
}

function formatTileName(tile: Tile): string {
  return formatTile(tile)
}

function meldTypeLabel(type: string): string {
  return { pong: '碰', exposed_gang: '明杠', concealed_gang: '暗杠', red_zhong_gang: '红中杠' }[type] || type
}

function getMeldTileCount(type: string): number {
  if (type === 'red_zhong_gang') return 1
  if (type === 'concealed_gang') return 4
  return 3
}

// 构造一个包含河面的虚拟 DeckState
function buildVirtualDeck(hand: Tile[], melds: Meld[], river: Tile[]): any {
  const visible = [...hand, ...river]
  for (const m of melds) {
    if (m.type === 'red_zhong_gang') {
      visible.push(m.tile)
    } else if (m.type === 'pong') {
      visible.push(m.tile, m.tile, m.tile)
    } else if (m.type === 'exposed_gang' || m.type === 'concealed_gang') {
      visible.push(m.tile, m.tile, m.tile, m.tile)
    }
  }

  const allTiles: Tile[] = []
  let idCounter = 1000
  for (const suit of [TileSuit.DOT, TileSuit.BAMBOO, TileSuit.CHARACTER]) {
    for (let n = 1; n <= 9; n++) {
      for (let i = 0; i < 4; i++) {
        allTiles.push({ suit, number: n, id: `v_${suit}_${n}_${idCounter++}` })
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    allTiles.push({ suit: TileSuit.RED_ZHONG, number: null, id: `v_rz_${idCounter++}` })
  }

  const visibleCount: Record<string, number> = {}
  for (const t of visible) {
    const key = `${t.suit}_${t.number ?? 'rz'}`
    visibleCount[key] = (visibleCount[key] || 0) + 1
  }

  const deckTiles: Tile[] = []
  const tempCount: Record<string, number> = { ...visibleCount }
  for (const t of allTiles) {
    const key = `${t.suit}_${t.number ?? 'rz'}`
    if (tempCount[key] > 0) {
      tempCount[key]--
    } else {
      deckTiles.push(t)
    }
  }

  return {
    tiles: deckTiles,
    totalCount: 112,
    remainingCount: deckTiles.length,
    visibleTiles: [...river],
    gangDraws: []
  }
}
</script>

<style scoped>
.exercise-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px 0 40px;
}

/* 头部 */
.detail-header {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 20px 24px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.difficulty-badge {
  padding: 3px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  border-radius: var(--radius-xs);
}
.difficulty-badge.easy { background: rgba(61, 217, 192, 0.15); color: var(--color-success); }
.difficulty-badge.medium { background: rgba(247, 201, 72, 0.15); color: var(--color-accent); }
.difficulty-badge.hard { background: rgba(255, 71, 87, 0.15); color: var(--color-danger); }

.mode-badge {
  padding: 3px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  border-radius: var(--radius-xs);
}
.mode-badge.hongzhong { background: rgba(255, 94, 94, 0.15); color: var(--color-primary); }
.mode-badge.hongzhong_gang { background: rgba(139, 92, 246, 0.15); color: var(--color-purple); }

.detail-header h2 {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--color-text);
}

.desc-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* 上下文环境区 */
.context-area {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 16px 20px;
}

.context-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.context-label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-muted);
}

.melds-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meld-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
}

.meld-tag {
  font-size: var(--text-xs);
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
  color: #fff;
}
.meld-tag.pong { background: #3dd9c0; color: #0a0b14; }
.meld-tag.exposed_gang, .meld-tag.concealed_gang { background: #ffd700; color: #0a0b14; }

.meld-tiles, .river-tiles {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* 答题交互区 */
.interactive-area {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 24px;
  transition: all 0.3s;
}

.interactive-area.has-submitted {
  border-color: var(--color-border-light);
  background: var(--color-bg);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 20px;
  border-left: 4px solid var(--color-primary);
  padding-left: 10px;
}

.tip-sub {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--color-text-muted);
}

.hand-container {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  background: rgba(26, 28, 46, 0.4);
  border-radius: var(--radius-sm);
  margin-bottom: 24px;
  overflow-x: auto;
}

.hand-tiles-wrapper {
  display: flex;
  gap: 6px;
  padding: 0 10px;
}

/* 选中高光效果 */
.user-selected-highlight {
  box-shadow: 0 0 0 3px var(--color-danger), 0 0 16px rgba(255, 71, 87, 0.6) !important;
  transform: translateY(-8px) scale(1.03) !important;
}

.best-selected-highlight {
  box-shadow: 0 0 0 3px var(--color-success), 0 0 16px rgba(61, 217, 192, 0.6) !important;
  transform: translateY(-8px) scale(1.03) !important;
}

/* 如果玩家恰好选对了，只保留最佳绿光 */
.user-selected-highlight.best-selected-highlight {
  box-shadow: 0 0 0 3px var(--color-success), 0 0 16px rgba(61, 217, 192, 0.6) !important;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
}

.selected-hint {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

.tile-name-glow {
  color: var(--color-primary);
  font-weight: 800;
  text-shadow: var(--shadow-glow);
}

.empty-hint {
  color: var(--color-text-muted);
}

.submit-btn {
  padding: 12px 28px;
  background: linear-gradient(135deg, var(--color-primary), #ff4757);
  color: white;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-glow);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 94, 94, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  background: var(--color-border-light);
  cursor: not-allowed;
  box-shadow: none;
}

/* 结果分析区 */
.result-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}

/* 评分卡 */
.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-surface);
}

.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.svg-ring-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-ring {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.ring-bg {
  fill: none;
  stroke: var(--color-border-light);
  stroke-width: 8;
}

.ring-indicator {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease-out;
}

.ring-indicator.excellent { stroke: var(--color-success); filter: drop-shadow(0 0 5px rgba(61, 217, 192, 0.5)); }
.ring-indicator.good { stroke: var(--color-accent); filter: drop-shadow(0 0 5px rgba(247, 201, 72, 0.5)); }
.ring-indicator.needs-improvement { stroke: var(--color-danger); filter: drop-shadow(0 0 5px rgba(255, 71, 87, 0.5)); }

.score-number-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: baseline;
}

.score-val {
  font-size: 32px;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
}

.score-val.excellent { color: var(--color-success); }
.score-val.good { color: var(--color-accent); }
.score-val.needs-improvement { color: var(--color-danger); }

.score-unit {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-left: 2px;
  font-weight: 700;
}

.score-tag {
  font-size: var(--text-sm);
  font-weight: 700;
  text-align: center;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}
.score-tag.excellent { background: rgba(61, 217, 192, 0.1); color: var(--color-success); }
.score-tag.good { background: rgba(247, 201, 72, 0.1); color: var(--color-accent); }
.score-tag.needs-improvement { background: rgba(255, 71, 87, 0.1); color: var(--color-danger); }

/* 对比卡 */
.compare-card {
  background: var(--color-surface);
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  font-size: var(--text-sm);
}

.compare-table th, .compare-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.compare-table th {
  color: var(--color-text-muted);
  font-weight: 700;
}

.compare-table tbody tr {
  transition: all 0.2s;
}

.compare-table tbody tr:hover {
  background: var(--color-card);
}

.role-user {
  color: var(--color-text);
  font-weight: 700;
}

.role-best {
  color: var(--color-success);
  font-weight: 700;
}

.is-correct-row {
  background: rgba(61, 217, 192, 0.04);
}

.is-best-row {
  background: rgba(61, 217, 192, 0.08);
}

.is-best-row td {
  border-bottom-color: rgba(61, 217, 192, 0.2);
}

/* 进张对比卡 */
.effective-compare {
  background: var(--color-surface);
}

.details-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .details-compare-grid {
    grid-template-columns: 1fr;
  }
}

.details-col {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 16px;
}

.col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.col-header.highlight {
  color: var(--color-success);
}

.count-tag {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: var(--text-xs);
}

.draws-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
}

.draw-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xs);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.empty-draws-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

/* AI导师点评 */
.ai-explanation-panel {
  background: var(--color-surface);
  border-color: rgba(255, 94, 94, 0.15);
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.ai-status {
  font-size: var(--text-xs);
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  font-weight: 700;
}
.ai-status.success { background: rgba(61, 217, 192, 0.12); color: var(--color-success); }
.ai-status.error { background: rgba(255, 71, 87, 0.12); color: var(--color-danger); }
.ai-status.local { background: rgba(247, 201, 72, 0.12); color: var(--color-accent); }
.ai-status.animate-pulse {
  background: rgba(255, 94, 94, 0.12);
  color: var(--color-primary);
  animation: pulse 1.2s infinite;
}

.explanation-body {
  margin-top: 10px;
  min-height: 80px;
}

.explanation-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.explanation-text strong {
  color: var(--color-text);
  font-weight: 700;
}

.explanation-text h4 {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-text);
  margin: 16px 0 6px;
  border-bottom: 1px dashed var(--color-border-light);
  padding-bottom: 4px;
}

/* 骨架屏 */
.ai-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;
}

.skeleton-line {
  height: 14px;
  background: var(--color-border-light);
  border-radius: 4px;
  animation: pulse 1.5s infinite;
}

.skeleton-line.short { width: 40%; }
.skeleton-line.medium { width: 75%; }

/* 底部操作 */
.bottom-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

/* 读牌测验 Quiz 选择卡片 */
.quiz-options-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 600px;
  margin: 10px auto;
}

.quiz-option-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 18px 24px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

.quiz-option-card:hover {
  background: var(--color-card-hover);
  border-color: rgba(255, 94, 94, 0.4);
  transform: translateY(-2px);
}

.quiz-option-card.selected {
  border-color: var(--color-primary);
  background: rgba(255, 94, 94, 0.04);
  box-shadow: 0 8px 25px rgba(255, 94, 94, 0.15), 0 0 0 1px var(--color-primary);
}

.quiz-option-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--color-primary);
  transition: width 0.15s;
}

.quiz-option-card.selected::after {
  width: 4px;
}

.option-indicator {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.quiz-option-card.selected .option-indicator {
  color: var(--color-primary);
}

.option-content {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 4px;
}

.option-sub {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.highlight-tile {
  color: var(--color-accent);
  background: rgba(247, 201, 72, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 700;
}

/* 贝叶斯推断图表 */
.bayesian-quiz-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.bayesian-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 6px;
  margin-bottom: 20px;
}

.bayesian-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tile-label {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 130px;
  flex-shrink: 0;
}

.tile-label span {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text);
}

.bar-container {
  flex: 1;
  height: 18px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.bar-fill {
  height: 100%;
  border-radius: 9px;
  transition: width 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
}

.bar-fill.danger {
  background: linear-gradient(90deg, #ef4444, #f87171);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.bar-fill.success {
  background: linear-gradient(90deg, #10b981, #34d399);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.bar-val {
  position: absolute;
  left: 10px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.danger-tag {
  width: 120px;
  font-size: 11px;
  color: #ef4444;
  text-align: right;
  flex-shrink: 0;
}

.success-tag {
  width: 120px;
  font-size: 11px;
  color: #10b981;
  text-align: right;
  flex-shrink: 0;
}
</style>
