# 上帝视角复盘数据与 Prompt 优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展上帝视角复盘的数据链路，在对局记录中加入每巡向听数、有效进张及自摸概率等精准数据，优化牌名为中文表记，并升级 AI 复盘 Prompt，使其以客观中立语气指出失误与理由。

**Architecture:** 
1. 在 `GameAction` 接口中加入数据快照字段；
2. 在 `gameStore.ts` 中添加 `captureDataSnapshot` 函数，并于每次历史记录 push 时混入该快照；
3. 在 `useLLM.ts` 中修改牌名紧凑格式为中文，并在历史记录文本化中拼入数据快照；
4. 升级复盘 System Prompt 为纯客观数据分析语气，取消 350 字数上限。

**Tech Stack:** Vue 3, TypeScript, Pinia (Vue Store)

---

### Task 1: 扩展 GameAction 类型定义

**Files:**
- Modify: `src/types/index.ts:370-380`

- [ ] **Step 1: 增加数据快照字段定义**
  修改 [src/types/index.ts](file:///h:/01-Project/2026/21-%20HongZhongMaJiang/src/types/index.ts) 中的 `GameAction` 接口，在原有属性后加入 6 个局势数据快照属性。
  
  修改前的代码：
  ```typescript
  export interface GameAction {
    type: GameActionType
    tile?: Tile
    fromOpponent?: number
    round: number
    meld?: Meld
    handSnapshot?: Tile[]
    meldsSnapshot?: Meld[]
  }
  ```
  
  修改后的代码：
  ```typescript
  export interface GameAction {
    type: GameActionType
    tile?: Tile
    fromOpponent?: number
    round: number
    meld?: Meld
    handSnapshot?: Tile[]
    meldsSnapshot?: Meld[]
    
    // 额外数据快照（用于上帝视角精准复盘）
    shantenSnapshot?: number              // 当巡向听数
    effectiveDrawCountSnapshot?: number   // 当巡有效进张张数
    effectiveDrawTilesSnapshot?: Tile[]   // 当巡有效进张牌型列表
    singleDrawProbSnapshot?: number       // 当巡自摸概率
    deckRemainingSnapshot?: number        // 当巡牌堆剩余张数
    visibleTilesSnapshot?: Tile[]         // 当巡已见牌列表
  }
  ```

- [ ] **Step 2: 验证编译**
  运行：`npm run build`
  确认没有类型错误或构建报错。

- [ ] **Step 3: 提交 Git**
  ```bash
  git add src/types/index.ts
  git commit -m "feat: 扩展 GameAction 接口以存储上帝视角局势数据快照"
  ```

---

### Task 2: 局势快照捕获与写入

**Files:**
- Modify: `src/stores/gameStore.ts`

- [ ] **Step 1: 新增捕获函数 captureDataSnapshot**
  在 [src/stores/gameStore.ts](file:///h:/01-Project/2026/21-%20HongZhongMaJiang/src/stores/gameStore.ts) 的 `useGameStore` 内部，定义 `captureDataSnapshot` 私有助手函数。我们可将此函数放置在 `startGame` 上方。
  
  ```typescript
  function captureDataSnapshot() {
    const shanten = shantenResult.value.shanten
    const handLen = getEffectiveHandLength()
    const is13 = handLen === 13

    let effCount = 0
    let effTiles: Tile[] = []

    if (is13) {
      const res = analyzeEffectiveDraws(playerHand.value, playerMelds.value, deck.value)
      if (res) {
        effCount = res.totalEffectiveCount
        effTiles = res.effectiveDraws.map(d => d.tile)
      }
    } else if (handLen === 14) {
      const res = analyzeDiscardOptions(playerHand.value, playerMelds.value, deck.value)
      if (res && res.bestDiscard) {
        effCount = res.bestDiscard.effectiveCount
        effTiles = res.bestDiscard.effectiveDraws.map(d => d.tile)
      }
    }

    const waitingRes = analyzeWaiting(playerHand.value, playerMelds.value)
    let targetTiles = waitingRes.waitingTiles
    if (gameMode.value === 'hongzhong_gang') {
      targetTiles = targetTiles.filter(t => t.suit !== TileSuit.RED_ZHONG)
    }
    const probRes = calcProbability(deck.value, targetTiles, playerHand.value, playerMelds.value)
    const singleDrawProb = probRes.singleDrawProb

    return {
      shantenSnapshot: shanten,
      effectiveDrawCountSnapshot: effCount,
      effectiveDrawTilesSnapshot: JSON.parse(JSON.stringify(effTiles)),
      singleDrawProbSnapshot: singleDrawProb,
      deckRemainingSnapshot: deck.value.tiles.length,
      visibleTilesSnapshot: JSON.parse(JSON.stringify(deck.value.visibleTiles || []))
    }
  }
  ```

- [ ] **Step 2: 混入 history.value.push 写入逻辑**
  在 `gameStore.ts` 中混入对该函数的解构调用（共 7 处修改）：
  
  1. **`startGame` 中 (约第202行)**:
     ```diff
          history.value.push({
            type: 'starting_hand',
            round: 0,
            handSnapshot: JSON.parse(JSON.stringify(playerHand.value)),
-           meldsSnapshot: []
+           meldsSnapshot: [],
+           ...captureDataSnapshot()
          })
     ```
  2. **`draw` 中 (约第249行)**:
     ```diff
          history.value.push({
            type: 'draw',
            tile,
            round: round.value,
            handSnapshot: JSON.parse(JSON.stringify(playerHand.value)),
-           meldsSnapshot: JSON.parse(JSON.stringify(playerMelds.value))
+           meldsSnapshot: JSON.parse(JSON.stringify(playerMelds.value)),
+           ...captureDataSnapshot()
          })
     ```
  3. **`redZhongGang` 中 (约第342行)**:
     ```diff
          history.value.push({
            type: 'gang',
            tile,
            round: round.value,
            meld: playerMelds.value[playerMelds.value.length - 1],
            handSnapshot: handBeforeRedZhongGang,
-           meldsSnapshot: meldsBeforeRedZhongGang
+           meldsSnapshot: meldsBeforeRedZhongGang,
+           ...captureDataSnapshot()
          })
     ```
  4. **`win` 中 (约第386行)**:
     ```diff
          history.value.push({
            type: 'self_draw',
            tile,
            round: round.value,
            handSnapshot: JSON.parse(JSON.stringify(playerHand.value)),
-           meldsSnapshot: JSON.parse(JSON.stringify(playerMelds.value))
+           meldsSnapshot: JSON.parse(JSON.stringify(playerMelds.value)),
+           ...captureDataSnapshot()
          })
     ```
  5. **`discard` 中 (约第413行)**:
     ```diff
          history.value.push({
            type: 'discard',
            tile,
            round: round.value,
            handSnapshot: handBeforeDiscard,
-           meldsSnapshot: meldsBeforeDiscard
+           meldsSnapshot: meldsBeforeDiscard,
+           ...captureDataSnapshot()
          })
     ```
  6. **`pong` 中 (约第656行)**:
     ```diff
          history.value.push({
            type: 'pong',
            tile,
            round: round.value,
            meld: playerMelds.value[playerMelds.value.length - 1],
            handSnapshot: handBeforePong,
-           meldsSnapshot: meldsBeforePong
+           meldsSnapshot: meldsBeforePong,
+           ...captureDataSnapshot()
          })
     ```
  7. **`gang` 中 (约第741行)**:
     ```diff
          history.value.push({
            type: 'gang',
            tile,
            round: round.value,
            meld: playerMelds.value[playerMelds.value.length - 1],
            handSnapshot: handBeforeGang,
-           meldsSnapshot: meldsBeforeGang
+           meldsSnapshot: meldsBeforeGang,
+           ...captureDataSnapshot()
          })
     ```

- [ ] **Step 3: 运行测试并验证**
  运行：`npm run test`
  确认红中听牌、向听等测试全部顺利通过，以保证 `gameStore.ts` 的算法注入未引发负面副作用。

- [ ] **Step 4: 提交 Git**
  ```bash
  git add src/stores/gameStore.ts
  git commit -m "feat: 在玩家操作记录写入时捕获并追加局势数据快照"
  ```

---

### Task 3: useLLM 对局历史输出与 Prompt 升级

**Files:**
- Modify: `src/composables/useLLM.ts`

- [ ] **Step 1: 优化 formatTileCompact 牌名表记**
  在 [src/composables/useLLM.ts](file:///h:/01-Project/2026/21-%20HongZhongMaJiang/src/composables/useLLM.ts) 中，将牌名紧凑化函数修改为输出中文短牌名：
  
  修改前的代码（约第408行）：
  ```typescript
  function formatTileCompact(t: Tile): string {
    if (t.suit === 'red_zhong') return 'RZ'
    const suffixMap: Record<string, string> = {
      character: 'W',
      bamboo: 'T',
      dot: 'B'
    }
    return `${t.number}${suffixMap[t.suit] || ''}`
  }
  ```
  
  修改后的代码：
  ```typescript
  function formatTileCompact(t: Tile): string {
    if (t.suit === 'red_zhong') return '红中'
    const suffixMap: Record<string, string> = {
      character: '万',
      bamboo: '条',
      dot: '筒'
    }
    return `${t.number}${suffixMap[t.suit] || ''}`
  }
  ```

- [ ] **Step 2: 注入多维快照至 formatGameHistoryCompact**
  重构 `formatGameHistoryCompact`，将其每巡的输出格式中加上我们新记录的 `shantenSnapshot`、`effectiveDrawCountSnapshot` 等数据。
  
  修改前的代码（约第434行）：
  ```typescript
  function formatGameHistoryCompact(history: GameAction[]): string {
    if (!history || history.length === 0) return '无对局记录'
    
    const lines: string[] = []
    
    for (const act of history) {
      if (act.type === 'starting_hand') {
        lines.push(`【配牌/初始手牌】: ${formatHandCompact(act.handSnapshot)}`)
        continue
      }
      
      const prefix = `第 ${act.round} 巡:`
      if (act.type === 'draw' && act.tile) {
        lines.push(`${prefix} 摸牌: ${formatTileCompact(act.tile)} | 此时手牌: ${formatHandCompact(act.handSnapshot)} | 副露: ${formatMeldsCompact(act.meldsSnapshot)}`)
      } else if (act.type === 'discard' && act.tile) {
        if (act.fromOpponent !== undefined) {
          const oppNames = ['东', '南', '西']
          lines.push(`${prefix} 对手[${oppNames[act.fromOpponent] || act.fromOpponent}] 打出: ${formatTileCompact(act.tile)}`)
        } else {
          lines.push(`${prefix} 打出: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)}`)
        }
      } else if (act.type === 'pong' && act.tile) {
        lines.push(`${prefix} 碰牌: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)}`)
      } else if (act.type === 'gang' && act.tile) {
        lines.push(`${prefix} 杠牌: ${formatTileCompact(act.tile)} | 决策前手牌: ${formatHandCompact(act.handSnapshot)}`)
      } else if (act.type === 'self_draw' && act.tile) {
        lines.push(`${prefix} 🎉 自摸胡牌! 胡牌张: ${formatTileCompact(act.tile)} | 最终手牌: ${formatHandCompact(act.handSnapshot)} | 最终副露: ${formatMeldsCompact(act.meldsSnapshot)}`)
      }
    }
    
    return lines.join('\n')
  }
  ```
  
  修改后的代码：
  ```typescript
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
  ```

- [ ] **Step 3: 优化上帝视角 System Prompt**
  重构 `analyzeGodView` 内部的 `systemPrompt` (约第297行)，将其角色语气定为“中立、客观的数据复盘专家”，完全去除字数 350 字的极短上限，并要求指出打错的选择：
  
  修改前的 systemPrompt (约297-312行)：
  ```typescript
        const systemPrompt = `你是红中麻将概率分析与复盘专家，帮助用户找出对局中的失误与薄弱点。
  当前对局模式：${isHongZhongGang ? '【红中杠麻】（规则：红中不能当赖子，必须单杠补摸，只能自摸胡牌）' : '【传统红中麻将】（规则：红中是万能赖子牌，只能自摸胡牌）'}。
  
  现在用户打完了一局游戏，你需要扮演“金牌教练”，对其这一局所有的决策进行上帝视角的深度复盘分析。
  
  ... (大局观评分、关键决策分析、薄弱点等) ...
  
  分析要求：
  - 严格客观，中文回答，350字左右
  - 指出第几巡时要具体对照用户当时的操作
  - 专业精炼，不讲废话`
  ```
  
  修改后的 systemPrompt：
  ```typescript
        const systemPrompt = `你需要扮演红中麻将概率分析与复盘专家，以中立、客观、严谨的态度，对用户的这一局所有决策进行上帝视角的深度复盘分析。
  当前对局模式：${isHongZhongGang ? '【红中杠麻】（规则：红中不能当赖子，必须单杠补摸，只能自摸胡牌）' : '【传统红中麻将】（规则：红中是万能赖子牌，只能自摸胡牌）'}。
  
  用户打完了一局游戏，你需要结合对局时序历史以及每巡的向听数、有效进张等精准概率快照，给出数据驱动的复盘分析报告。
  
  复盘报告格式必须以 Markdown 展现，内容分成以下 4 个部分：
  
  1. **【大局观评分】**：在开头显式给出一个评分（例如：85分），分值区间 0-100，客观评估玩家本局的综合决策水平。
  2. **【关键决策对比】**：扫描对局时序，一旦发现玩家的选择不是理论上保留最大有效进张或最低向听数的打法（即有明显“打错”的选择时），必须明确对比指出：
     - **第X巡**
     - **玩家打出**：具体牌名（如“5筒”）（玩家保留有效进张：Y张）
     - **系统推荐打出**：最优推荐牌名（如“3筒”）（最大可能进张：W张）
     - **详细的理由**：从向听数走势、概率高低及麻将牌理逻辑，客观详细分析该手打错的原因。
  3. **【初始配牌解析】**：点评起手牌的质量，并建议最佳的胡牌番型和听牌走向。
  4. **【战术总结与教练建议】**：总结本局玩家体现出的决策倾向（如追求速度的极致进攻、抑或规避点炮的防守），给出 2-3 条基于数据与概率的提升建议。
  
  分析要求与限制：
  - 语气要求：中立、客观、严谨，打错的决策必须一针见血地结合概率数据清晰指出来，无倾向性情绪。
  - 必须统一使用中文牌名表达（如“3筒”、“5条”、“1万”、“红中”），严禁在分析中使用“3T”、“5B”、“RZ”等英文缩写。
  - 字数不限，请对整局的概率与数据演化进行极其详尽、全面的结构化分析。`
  ```

- [ ] **Step 4: 验证编译**
  运行：`npm run build`
  确认整个代码包编译无报错。

- [ ] **Step 5: 提交 Git**
  ```bash
  git add src/composables/useLLM.ts
  git commit -m "feat: useLLM 统一中文牌名输出，并在上帝复盘时注入每巡数据快照且重塑 Prompt"
  ```

---

### Task 4: 整体对局与 AI 复盘联动测试

**Files:**
- Test: 运行本地网页进行黑盒功能测试

- [ ] **Step 1: 启动开发服务器**
  运行：`npm run dev`
  打开浏览器查看页面。

- [ ] **Step 2: 模拟对局并获取上帝复盘**
  在网页上正常打完一局麻将对局（如自摸胡牌或流局），结束后在弹窗中点击“AI上帝复盘”按钮。
  
- [ ] **Step 3: 检查输出结果与格式**
  检查弹出的上帝视角复盘内容：
  1. 是否拥有大局观评分与关键决策对比；
  2. 报告中的牌名全部为中文牌名（如“3筒”、“5条”），没有英文缩写；
  3. AI 报告语气中立、不带刺，但准确指出打错的巡数，并且理由中包含了真实的向听数和进张对比数据；
  4. 报告长短适宜（未在 350 字发生截断，内容详尽）。
