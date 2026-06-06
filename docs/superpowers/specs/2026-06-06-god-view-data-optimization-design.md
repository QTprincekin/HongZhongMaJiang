# 上帝视角复盘数据与 Prompt 优化设计规范

**时间**：2026-06-06
**状态**：已批准（待实施）
**修改背景**：用户反馈目前“上帝复盘”AI表现为过度挑刺，且没有充分了解每巡的实时局势数据（如向听数、河面已见牌、最大进张差异等），复盘中对牌名的称呼也是英文缩写（如 3T、5B）影响阅读。限制 350 字导致分析数据缺失。

---

## 一、 优化目标
1. **中立、客观的数据分析语气**：取代原有的主观教练口吻，打错的决策明确指出，并附带详尽的数据依据与对比。
2. **多维概率数据快照注入**：在记录对局历史动作（`history`）时，通过前端算法注入每巡的**向听数**、**有效进张总张数**、**有效进张牌列表**、**单巡自摸概率**、**牌堆剩余张数**以及**当前河面已见牌**等硬数据，解决大模型在复盘中算错牌、漏看牌的问题。
3. **中文牌名称呼**：将发送给 AI 的数据及 AI 输出格式中的牌名统一为符合中文习惯的表达（如 `3筒`、`5条`、`1万`、`红中`）。
4. **取消字数上限**：废除 350 字的极短限制，支持生成 800 - 1500 字左右的详尽结构化复盘报告。

---

## 二、 详细修改方案

### 1. `GameAction` 类型定义优化
在 `src/types/index.ts` 中，为 `GameAction` 接口注入多维数据快照字段：

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

### 2. `gameStore.ts` 局势快照捕获与注入
在 `src/stores/gameStore.ts` 中增加一个私有工具函数 `captureDataSnapshot`，在写入 `history` 时调用以记录当前牌局的数据状态：

```typescript
function captureDataSnapshot() {
  const shanten = calculateShanten(playerHand.value, playerMelds.value).shanten
  const is13 = (playerHand.value.length + playerMelds.value.filter(m => m.type !== 'red_zhong_gang').length * 3) === 13
  
  let effCount = 0
  let effTiles: Tile[] = []
  
  if (is13) {
    const res = analyzeEffectiveDraws(playerHand.value, playerMelds.value, deck.value)
    effCount = res.totalEffectiveCount
    effTiles = res.effectiveDraws.map(d => d.tile)
  } else {
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

在 `startGame`、`draw`、`redZhongGang`、`win`、`discard`、`pong`、`gang` 等所有 `history.value.push` 调用处，解构注入该快照数据。

### 3. `useLLM.ts` 对局历史格式化与 Prompt 改造
- **中文牌名格式化**：
  修改 `formatTileCompact` 函数，直接返回短中文名称（如 `3筒`、`5条`、`1万`、`红中`）。
- **详尽历史输出**：
  重构 `formatGameHistoryCompact` 函数，在每巡动作后拼装其对应的 `shantenSnapshot`、`effectiveDrawCountSnapshot`、`singleDrawProbSnapshot`、`visibleTilesSnapshot` 等数据，让大模型获取最充分的信息。
- **Prompt 升级**：
  重写 `analyzeGodView` 里的 System Prompt，将 AI 设定为“中立、客观的复盘专家”，要求明确列出打错决策的具体巡数、玩家打出与推荐打出牌对比，并给出基于概率数据的理由，字数放宽不限。

---

## 三、 验证计划
1. **构建与编译验证**：运行 `npm run build`，确保 TypeScript 类型无报错且 Vite 构建正常。
2. **单元测试验证**：运行 `npm run test`，保证游戏的核心听牌/胡牌/向听数算法运行正常。
3. **数据流录制验证**：在本地开启开发服务器，模拟玩完一局对局，检查最终在对局结算时点击“上帝复盘”后发送给 AI 的 payload，验证其是否包含了完整的中文牌名以及每巡的向听数、自摸概率等快照数据。
4. **AI 复盘输出检查**：查看 AI 生成的 Markdown 报告，核实其语气是否中立客观、打错的牌是否被明确指出、理由是否详尽，且无 `3T` / `5B` 等英文格式。
