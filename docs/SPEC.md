# 🀄 红中麻将概率训练系统 - 开发文档

**项目名称：** HongZhongMaJiang（红中麻将概率训练系统）
**版本：** V1.2（新增杠牌决策分析）
**目录：** `H:\01-Project\2026\21- HongZhongMaJiang`
**状态：** 待开发

---

## 一、项目目标

### 1.1 核心定位
一个**交互式红中麻将概率训练工具**，将我们讨论的算法模型落地为可操作的应用程序，并集成 **LLM AI 辅助分析**，在关键决策点提供深度分析。

### 1.2 用户价值
| 角色 | 使用场景 |
|------|---------|
| 杰哥自己 | 边打边验证概率直觉，培养概率思维；AI帮你深度分析复杂决策 |
| 同事/朋友 | 把它当成"麻将教练"，帮你做决策建议和AI解读 |
| 学习者 | 理解概率论、贝叶斯推断在游戏中的实际应用；看AI如何推理 |

### 1.3 关键目标
1. **算法精确**：所有概率计算基于正确的数学模型
2. **可交互**：像真实打麻将一样输入手牌，实时输出概率和建议
3. **可验证**：模拟器模式验证你的决策长期是否正确
4. **可学习**：每个建议都附带解释，不只是给答案
5. **AI增强**：在关键决策点，可调用LLM做深度分析（可选功能）

---

## 二、核心功能清单

### 2.1 基础模块

#### F1：牌堆管理
- 生成112张牌（1-9 筒/万/条各4张 = 108张 + 红中4张）
- 洗牌算法（Fisher-Yates 洗牌）
- 发牌（每家13张，模拟真实开局）
- 摸牌（不放回抽样）
- 追踪已见牌（河面 + 碰杠亮出的）

#### F2：手牌管理
- 手牌展示（可视化麻将牌界面）
- 手牌输入（点击/拖拽操作）
- 手牌分析：
  - 当前听牌数
  - 听牌方向（等哪几张）
  - 刻子/顺子/搭子/孤张 统计
  - 是否已经听牌

#### F3：自摸概率计算
- **输入**：当前手牌 + 已见牌
- **输出**：
  - 各张目标牌剩余数量
  - 单巡自摸概率
  - N巡内自摸概率（3/5/10/15/20巡）
  - 平均自摸巡数
- **模型**：超几何分布

#### F4：碰/杠牌决策分析
- **输入**：当前手牌 + 河面 + 某张对手打出的牌
- **输出（碰）**：
  - 碰 vs 不碰 的胜率对比
  - 碰后手牌变化
  - 碰后听牌方向
  - 碰后是否可杠（已有该牌碰刻子时）
  - 决策建议及理由
- **输出（杠）**：
  - 明杠：碰后是否加杠
  - 暗杠：手牌有4张相同牌时，是否暗杠
  - 杠 vs 不杠 的概率对比
  - 杠后补摸的期望收益分析
  - 决策建议及理由

#### F5：贝叶斯推断（对手手牌估计）
- **输入**：对手打出的牌序列 + 巡数 + 是否碰杠
- **输出**：
  - 某张牌在对手手里的概率分布
  - 顺子缺失推断（对手不可能有的组合）
  - 修正后的牌堆剩余概率
- **模型**：贝叶斯条件概率

#### F6：听牌换向分析
- **输入**：当前手牌 + 最近N次摸牌记录
- **输出**：
  - 当前听牌方向及概率
  - 换向后的听牌方向及概率
  - 是否建议换听
  - 换向的期望收益对比

#### F7：模拟器模式
- 蒙特卡洛模拟（1000次/10000次）
- 验证"碰 vs 不碰"策略的长期胜率
- 验证"换听 vs 不换"策略的长期胜率
- 对比不同策略的期望收益

#### F8-1：明杠（加杠）
- **触发**：已有碰的刻子（3张），对手打了同名牌
- **效果**：亮出4张刻子 → 补摸1张牌 → 手牌-1张
- **概率影响**：补摸1张后，重新计算听牌数和自摸概率
- **决策**：杠 vs 不杠
  - 杠后摸1张：可能自摸、可能改善手牌、也可能更差
  - 不杠：保持现状，继续摸牌

#### F8-2：暗杠
- **触发**：手牌里有4张相同的牌（自己摸到）
- **效果**：亮出4张暗杠 → 补摸1张牌
- **决策**：杠 vs 不杠
  - 杠后摸1张，同样重新计算概率
  - 暗杠暴露信息，对手知道你有了这4张

#### F8-3：杠后概率重算
- 杠后手牌-1张，补摸1张
- 补摸的牌可能是：
  - 目标牌 → 自摸！
  - 有用的牌 → 手牌改善
  - 废牌 → 重新评估听牌方向
- 补摸后的概率 = 摸到目标牌的概率 + 摸到改善牌的概率

#### F9：LLM AI 辅助分析 ⭐
- **触发时机**：
  - 碰牌决策时（碰 vs 不碰纠结）
  - 听牌换向时（是否要换方向）
  - 自摸概率低于阈值时（需要AI评估是否值得等）
  - 用户主动请求AI分析
- **AI分析内容**：
  - 当前手牌局势评估
  - 各决策选项的利弊分析
  - 基于概率的建议
  - 可能的牌局走向推测
- **API配置**：用户提供 API 地址 + API Key，纯本地调用，不外传数据
- **模型兼容**：支持 OpenAI 兼容接口（OpenAI / Claude / 国产模型均可）

---

## 三、数据结构设计

### 3.1 牌的定义

```typescript
// 牌的类型
enum TileSuit {
  DOT = '筒',      // 1-9
  BAMBOO = '条',   // 1-9
  CHARACTER = '万', // 1-9
  RED_ZHONG = '红中' // 赖子
}

// 单张牌
interface Tile {
  suit: TileSuit;
  number: number;  // 1-9，红中时为 null
  isWild: boolean; // 是否作为赖子使用
}

// 示例
// { suit: '万', number: 3 }  → 3万
// { suit: '红中', number: null } → 红中
```

### 3.2 牌堆状态

```typescript
interface DeckState {
  totalTiles: number;      // 112
  remainingTiles: number;  // 随抓牌/杠补摸减少
  remainingByType: Map<string, number>;  // 每种牌剩余数量
  drawnTiles: Tile[];       // 已摸走的牌（正常摸牌）
  visibleTiles: Tile[];     // 已见牌（河面+碰杠+明牌）
  // 杠牌追踪 ⭐
  gangCount: number;        // 已杠次数（每次杠消耗1张补摸）
  gangTiles: Tile[];        // 杠后补摸走的牌（从已摸牌中标记）
}
```

### 3.3 手牌状态

```typescript
interface Meld {
  type: 'pong' | 'exposed_gang' | 'concealed_gang'; // 碰牌/明杠/暗杠 ⭐
  tile: Tile;              // 涉及的牌（如：333万）
  drawnAfter?: Tile;        // 杠后补摸的牌（明杠时有）⭐
  exposedBy?: string;      // 谁碰/杠的（对手A/自己）⭐
}

interface HandState {
  tiles: Tile[];            // 当前手牌（含补摸牌）
  melds: Meld[];            // 已完成的副露（碰/明杠/暗杠）
  isReady: boolean;         // 是否听牌
  waitingTiles: Tile[];     // 等牌列表
  waitingCount: number;     // 听牌数
  // 辅助信息
  pendingPongTile?: Tile;   // 当前可碰的牌（对手刚打的）⭐
  pendingGangTile?: Tile;  // 当前可杠的牌（刚碰+对手打同牌）⭐
}
```

### 3.4 概率状态

```typescript
interface ProbabilityState {
  targetTiles: Tile[];           // 目标牌
  remainingCount: number;         // 牌堆中剩余数量
  singleDrawProb: number;         // 单巡概率
  multiDrawProb: Map<number, number>; // N巡内概率
  expectedDraws: number;          // 期望自摸巡数
  bayesianAdjustment: Map<string, number>; // 贝叶斯修正后的概率
}
```

### 3.5 LLM 配置状态（新增）

```typescript
interface LLMConfig {
  enabled: boolean;               // 是否启用LLM
  apiUrl: string;                 // API 地址，如 https://api.openai.com/v1/chat/completions
  apiKey: string;                 // API Key（加密存储）
  model: string;                  // 模型名称，如 gpt-4o / glm-4 / deepseek-chat
  maxTokens: number;              // 最大回复token数，默认 1024
  temperature: number;            // 温度参数，默认 0.7
  enabledTriggers: LLMTrigger[];  // 触发时机配置
}

type LLMTrigger =
  | 'pong_decision'      // 碰牌决策时
  | 'gang_decision'      // 杠牌决策时（明杠/暗杠）⭐新增
  | 'switch_decision'    // 换向决策时
  | 'low_probability'   // 自摸概率低于阈值时
  | 'manual'            // 用户手动触发
  | 'game_review';      // 对局复盘

interface LLMPromptContext {
  trigger: LLMTrigger;
  currentHand: Tile[];
  visibleTiles: Tile[];
  deckRemaining: number;
  probabilityAnalysis: ProbabilityState;
  decisionOptions: DecisionOption[];
  round: number;
  playerAction?: Tile;  // 触发时的动作（如：对方打了某张牌）
}
```

---

## 四、算法设计

### 4.1 牌堆生成与洗牌

```
算法：Fisher-Yates 洗牌
输入：54种牌型 × 4张 = 108张 + 红中4张 = 112张
过程：
  1. 生成牌池 [1-9筒×4, 1-9万×4, 1-9条×4, 红中×4]
  2. 从后向前，依次与随机位置的牌交换
  3. 输出洗好的牌堆
时间复杂度：O(n)
```

### 4.2 自摸概率计算（超几何分布）

```
公式：P(N巡内自摸) = 1 - C(非目标牌, N) / C(牌堆总数, N)
简化公式（放回抽样近似）：
  P(N巡内) ≈ 1 - ((牌堆-目标) / 牌堆)^N

参数：
  - deckRemaining: 牌堆剩余数
  - targetCount: 目标牌剩余数

输出：
  - 单巡概率 = targetCount / deckRemaining
  - N巡概率 = 1 - ((deckRemaining - targetCount) / deckRemaining)^N
  - 期望巡数 = deckRemaining / targetCount
```

### 4.3 贝叶斯对手手牌推断

```
输入：
  - opponentDiscards: 对手打出的牌序列
  - eachDiscardRound: 每张牌在第几巡打出
  - eachDiscardType: 主动打 / 碰后打 / 杠后打

推断逻辑：
  P(对手有X张某牌 | 行为B, 巡数R)

  先验概率（开局）：
    P(对手有k张某牌) = C(3, k) × C(33, 9-k) / C(36, 9)
    （对手9张手牌中，该牌有4张，分布服从超几何分布）

  似然（各行为对应的概率）：
    - 主动早期打（第1-3巡）：L(有k张 | 主动打) ≈ 0.05 (k=1), 0.01 (k≥2)
    - 主动中期打（第4-8巡）：L(有k张 | 主动打) ≈ 0.15 (k=1), 0.05 (k≥2)
    - 碰后打（第R巡）：L(有k张 | 碰后打) ≈ 0.20 + 0.01×R (k=1)
    - 杠后打：L(有k张 | 杠后打) ≈ 0.35 (k=1)

  后验概率（贝叶斯）：
    P(有k张 | 证据) ∝ P(有k张) × L(有k张 | 行为)
    归一化：P(有k张 | 证据) = 上式 / ΣP(有j张)×L(有j张|证据)
```

### 4.4 碰/杠牌决策算法

#### 4.4.1 碰牌决策

```
输入：
  - hand: 当前手牌
  - discardTile: 对手打出的牌
  - deckState: 牌堆状态

输出：碰 vs 不碰 的对比

步骤：
  1. 碰之后：手牌变为 [hand + discardTile - 3张相同牌]
     → 分析碰后的听牌方向和听牌数
     → 计算碰后的自摸概率 P_pong
     → 检查：碰后是否有杠的机会？（已有该牌碰刻子 + 对手打第4张）⭐

  2. 不碰：保持原手牌
     → 摸一张牌，分析是否进张
     → 计算不碰继续进张的期望收益 P_nopong

  3. 对比：
     - 如果 P_nopong > P_pong：不碰（长期期望更高）
     - 如果 P_nopong < P_pong：碰（时间紧迫时优先碰）
     - 如果碰后有杠机会：碰 → 然后触发杠牌决策 ⭐
     - 输出对比理由
```

#### 4.4.2 杠牌决策（碰后明杠 / 暗杠）⭐

```
触发时机：
  A. 明杠（加杠）：碰后手牌有碰刻子，对手打出第4张
  B. 暗杠：手牌自己摸到4张相同牌

明杠决策：
  输入：
    - existingPong: 已亮出的碰刻子（如 333万）
    - gangTile: 对手打出的第4张（如 3万）
    - handAfterPong: 碰后手牌状态（已扣除碰刻子）
    - deckState: 牌堆状态

  决策树：
    1. 杠后手牌-1张（刻子亮出4张），补摸1张
       → 补摸结果3种：
         · 补摸 = 目标牌 → 直接自摸 ✅
         · 补摸 = 有用牌 → 手牌改善
         · 补摸 = 废牌 → 手牌不变/变差

    2. 不杠：保持碰刻子状态，正常摸牌

    3. 期望收益对比：
       E(杠) = Σ P(补摸=x) × V(补摸后状态x)
              - C(跳过1次摸牌机会)
       E(不杠) = 每次摸牌的期望

       决策阈值：
         - 牌堆深（>40张）：补摸≈正常摸牌，杠的期望接近正常
         - 牌堆浅（<15张）：杠跳过1次摸牌，代价大，谨慎杠

暗杠决策：
  输入：
    - hand: 手牌（含4张相同牌，如 5555条）
    - deckState: 牌堆状态

  决策树：
    1. 暗杠：亮出4张，暗杠刻子，补摸1张
       · 信息暴露：对手知道你不需要5条了
       · 如果你听5条相关（如等4条/6条），反而是安全信号

    2. 不杠：保持暗手，不暴露信息

    3. 关键判断：
       · 暗杠的这4张牌：是否影响当前听牌方向？
       · 暗杠后补摸1张的价值
       · 信息暴露对手后的风险（对手更敢打相关牌）
```

### 4.5 听牌换向算法

```
输入：
  - currentHand: 当前手牌
  - recentDraws: 最近N次摸牌记录（如：3次都是条子）
  - deckState: 牌堆状态

输出：换向建议

步骤：
  1. 分析当前听牌方向和概率 P_current
     - 列出所有可能的听牌组合
     - 计算各方向的目标牌数量和概率

  2. 分析换向后听牌方向
     - 将 recentDraws 中收集的牌加入手牌
     - 重新分析是否有新的听牌方向
     - 计算换向后的概率 P_new

  3. 判断换向条件：
     - recentDraws 是否有成对/成顺的苗头？
     - P_new 是否显著高于 P_current？（阈值：提高30%以上）
     - 牌堆深度是否足够？（<20张则谨慎换向）

  4. 输出：
     - 不换：保持原方向
     - 换：给出新的听牌方向和理由
```

### 4.6 蒙特卡洛模拟器

```
功能：验证策略的长期胜率

参数：
  - strategy: '碰优先' | '不碰优先' | '固定换听' | '动态换听'
  - iterations: 模拟次数（默认10000）
  - handSetup: 初始手牌（可指定或随机）

算法：
  1. 初始化牌堆，发牌
  2. 模拟每巡抓牌，直到有人自摸或牌堆清空
  3. 记录：
     - 该次模拟是否自摸成功
     - 用了多少巡
     - 最终手牌状态
  4. 重复 N 次
  5. 统计：
     - 自摸率 = 成功次数 / N
     - 平均自摸巡数
     - 各策略胜率对比表
```

### 4.7 杠牌决策算法 ⭐ 新增

#### 4.7.1 明杠（加杠）

```
触发条件：手牌已有「碰」形成的刻子（3张），对手打出第4张

输入：
  - hand: 碰后当前手牌（如：已有 333万碰刻子，手里剩11张）
  - exposedMeld: 已亮出的碰刻子
  - discardTile: 对手打出的那张牌（如：3万）
  - deckState: 牌堆状态

明杠 vs 不杠 的决策：

步骤1：明杠之后
  - 亮出 3333万（4张刻子）
  - 补摸1张牌（从牌堆摸1张）
  - 手牌变为：11张 + 1张补摸牌 = 12张
  → 分析补摸后的手牌：
    - 如果补摸牌 = 目标牌 → 自摸！✅
    - 如果补摸牌 = 有用的牌 → 手牌改善
    - 如果补摸牌 = 废牌 → 手牌不变或变差

步骤2：不杠（保持碰的状态）
  - 手牌保持碰后状态
  - 继续正常摸牌
  → 正常摸牌的概率计算（P_normal_draw）

步骤3：对比期望收益

  P_gang_win = P(补摸自摸) + P(补摸改善后自摸)
             = (目标牌数 / 牌堆数)
               + Σ P(补摸到某改善牌) × P(改善后自摸)

  P_no_gang = P_normal_draw（不杠时每次摸牌的自摸概率）

  如果 P_gang_win > P_no_gang × 调整系数：建议杠
  （调整系数考虑：杠后少摸1张的代价）

关键参数：
  - 补摸1张 = 跳过1次正常摸牌机会
  - 牌堆越深，补摸的价值越接近正常摸牌
  - 牌堆越浅（<15张），杠后跳过摸牌代价越大
```

#### 4.7.2 暗杠

```
触发条件：自己摸到了第4张相同的牌

输入：
  - hand: 当前手牌（含4张相同牌，如：5555条）
  - deckState: 牌堆状态

暗杠 vs 不杠 的决策：

步骤1：暗杠之后
  - 亮出 5555条（4张暗杠）
  - 补摸1张牌
  - 手牌-4张 + 补摸1张 = 手牌-3张
  → 信息暴露：对手知道你有了5555条4张

步骤2：不杠（保留手牌）
  - 5555条保持暗手，不暴露
  - 正常摸牌

决策考虑因素：
  - 信息暴露风险：对手知道你不需要5条了（安全张）
  - 补摸1张的价值
  - 手牌减3张的影响（是否影响听牌）

信息暴露分析：
  - 暗杠5555条 → 对手知道：
    - 你不需要任何5条
    - 5条对你来说是"废牌"
    - 对手可以安全打5条
  - 如果你听的是5条附近（如4条/6条），暗杠反而是安全信号
```

#### 4.7.3 补摸牌概率分析

```
杠后补摸1张的概率分布：

补摸结果分类：

| 补摸结果 | 概率 | 后续影响 |
|---------|------|---------|
| 摸到目标自摸牌 | 目标牌数/牌堆 | 自摸！直接胜 |
| 摸到改善牌（如凑对/凑顺） | 改善牌数/牌堆 | 手牌改善，等更多 |
| 摸到废牌 | 废牌数/牌堆 | 手牌不变 |
| 摸到红中 | 1-红中已用数/牌堆 | 赖子，可任意替换 |

期望收益计算：

E(杠) = P(直接自摸) × 1.0
       + P(摸到改善牌) × (改善后自摸概率 - 当前自摸概率)
       + P(摸到废牌) × 0
       - 跳过1次摸牌机会的代价

E(不杠) = 不杠时继续摸牌的期望

如果 E(杠) > E(不杠) - 阈值：建议杠
```

### 4.8 LLM AI 分析模块 ⭐ 新增

```
功能：在关键决策点调用 LLM 进行深度分析

触发时机（可配置）：
  - pong_decision：碰牌决策时
  - switch_decision：听牌换向时
  - low_probability：自摸概率低于 5% 时
  - manual：用户手动点击"AI分析"按钮
  - game_review：对局结束后复盘

LLM 调用流程：

1. 构建 Prompt（JSON格式）
   {
     "role": "system",
     "content": "你是一个红中麻将概率分析专家..."
   }
   {
     "role": "user",
     "content": "【当前局势】\n手牌：... \n河面：...\n牌堆剩余：...\n概率分析：...\n请分析：..."
   }

2. 请求 LLM API
   POST {apiUrl}
   Headers: Authorization: Bearer {apiKey}
   Body: {
     "model": "{model}",
     "messages": [...],
     "max_tokens": 1024,
     "temperature": 0.7
   }

3. 解析响应
   - 显示AI分析结果
   - 展示决策建议（中文，带解释）
   - 可选：显示AI思考过程

4. 降级处理
   - 超时（30秒）：显示"AI分析超时，使用本地算法"
   - API Key 未配置：隐藏AI按钮
   - 网络错误：显示错误信息，不阻塞主流程

Prompt 模板设计原则：
  - 明确角色：你是一个红中麻将概率分析专家
  - 给出完整上下文：手牌+河面+概率+决策选项
  - 要求输出格式：建议 + 理由 + 风险提示
  - 中文输出，易读易懂
  - 字数控制在500字内（响应快，成本低）
```

---

## 五、界面设计

### 5.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  🀄 红中麻将概率训练系统              [⚙设置] [🤖AI:离线] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │   手牌区域        │  │      概率分析面板            │ │
│  │  🀙🀙🀙🀙🀙       │  │  单巡概率: 5.3%              │ │
│  │  🀙🀙🀙🀙🀙       │  │  10巡内: 41%                │ │
│  │  🀙🀙🀙         │  │  20巡内: 66%                │ │
│  │                  │  │  期望巡数: 15.2             │ │
│  └──────────────────┘  └─────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  决策建议                                          │   │
│  │  ✅ 不碰：期望胜率 71% > 碰的 35%                 │   │
│  │  📊 理由：碰后只剩1张目标，不碰有3张目标         │   │
│  │  [🤖 问AI深度分析]                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │  操作区           │  │      河面 / 已见牌           │ │
│  │ [碰] [杠] [摸牌]  │  │  3万 5筒 7条 2万 9筒 ...     │ │
│  │ [听牌分析] [模拟器]│  │  碰：2万×1  杠：5筒×1       │ │
│  │ [🤖AI分析]       │  │                              │ │
│  └──────────────────┘  └─────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [模拟器]  [概率详情]  [贝叶斯面板]  [教学模式]  [AI对话] │
└─────────────────────────────────────────────────────────┘
```

### 5.2 设置面板（LLM 配置）

```
┌─────────────────────────────────────────────────────────┐
│  设置                                                    │
├─────────────────────────────────────────────────────────┤
│  🤖 LLM AI 设置                                          │
│  ├─ [✓] 启用AI辅助分析                                   │
│  │                                                       │
│  │  API 地址：                                           │
│  │  [https://api.openai.com/v1/chat/completions____]     │
│  │                                                       │
│  │  API Key：                                            │
│  │  [••••••••••••••••••••________________________]       │
│  │                                                       │
│  │  模型：                                               │
│  │  [gpt-4o______________________________▼]              │
│  │  （支持 OpenAI / Claude / 国产模型等 OpenAI兼容接口）  │
│  │                                                       │
│  │  最大Token： [1024___]  温度： [0.7___]               │
│  │                                                       │
│  │  触发时机：                                           │
│  │  [✓] 碰牌决策时                                       │
│  │  [✓] 杠牌决策时（明杠/暗杠）                          │ ⭐新增
│  │  [✓] 换向决策时                                       │
│  │  [✓] 自摸概率 < 5% 时                                 │
│  │  [✓] 用户手动触发                                     │
│  │  [ ] 对局复盘（结束后）                               │
│  │                                                       │
│  │  [💾 保存配置]  [🔄 测试连接]                         │
│  └───────────────────────────────────────────────────── │
│                                                         │
│  [游戏设置]  [显示设置]  [关于]                          │
└─────────────────────────────────────────────────────────┘
```

### 5.3 AI 分析结果展示

```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI 深度分析                    [重新生成] [关闭]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📋 局势评估                                            │
│  你当前听2张（1万、9万），牌堆剩余约50张，              │
│  单巡自摸概率约4%。根据概率模型，你处于中等偏难的局面。 │
│                                                         │
│  💡 建议                                                │
│  1. 【优先】保持当前听牌方向，继续等1万和9万            │
│     · 理由：虽然概率低（4%/巡），但不需要额外操作      │
│     · 风险：需要15-20巡才能达到60%累计概率            │
│                                                         │
│  2. 【备选】如果后续摸到2万或8万，可考虑扩展听牌       │
│     · 将听牌数从2张扩展到3-4张，概率提升50%+          │
│                                                         │
│  3. 【警惕】对手B已碰两次，可能接近听牌               │
│     · 建议加快自摸节奏，或降低风险（打安全张）        │
│                                                         │
│  ⚠️ 风险提示                                            │
│  自摸概率较低，建议控制单局投入，不宜等太久           │
│                                                         │
│  耗时：1.2s | 模型：gpt-4o | 费用：~$0.002           │
└─────────────────────────────────────────────────────────┘
```

### 5.4 AI 对话标签页

```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI 麻将对话                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🤖 AI：你好！我是红中麻将AI助手。你可以：        │   │
│  │  · 问任何关于概率计算的问题                     │   │
│  │  · 让我分析某个具体的手牌和决策               │   │
│  │  · 询问某个牌型的赢率分析                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 用户：2234万，对方打了2万，我应该碰吗？          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🤖 AI：根据概率计算：                            │   │
│  │ · 碰了之后：单吊3万，概率约2.8%                 │   │
│  │ · 不碰：等2万/5万/3万，概率约10.8%              │   │
│  │ 结论：不碰。长期期望不碰高4倍...                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 请输入你的问题...                            [发送] │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 5.5 界面模块说明

| 模块 | 功能 |
|------|------|
| 手牌区域 | 可视化展示，点击牌面操作，支持拖拽排序 |
| 概率分析面板 | 实时显示当前手牌的各项概率指标 |
| 决策建议面板 | 显示碰/不碰、换向/不换的建议和理由，含AI分析入口 |
| AI分析弹窗 | 展示LLM深度分析结果 |
| 操作区 | 碰、杠、摸牌、打牌、听牌分析、模拟器、AI分析 |
| 河面/已见牌 | 展示场面上所有已见牌 |
| 设置面板 | LLM API配置、触发时机设置 |
| AI对话标签 | 自由对话，向AI询问任何麻将问题 |
| 标签页 | 模拟器 / 概率详情 / 贝叶斯面板 / 教学模式 / AI对话 |

---

## 六、技术选型

### 6.1 推荐方案：Tauri + Vue 3

| 层级 | 技术 | 理由 |
|------|------|------|
| 桌面框架 | **Tauri 2.x** | 体积小（exe约10MB）、原生性能、C++/Rust后端潜力 |
| 前端框架 | **Vue 3 + TypeScript** | 响应式UI、类型安全、杰哥熟悉Vue |
| UI组件库 | **Naive UI** 或 **Arco Design** | Vue3组件库、好看的中文界面 |
| 状态管理 | **Pinia** | Vue3官方推荐 |
| LLM调用 | **fetch API**（浏览器原生） | 跨域调用LLM API，无需后端 |
| 算法层 | **TypeScript 纯函数** | 核心算法和UI分离，易测试 |

**为什么不用其他方案：**

| 方案 | 缺点 |
|------|------|
| Electron | 体积大（>150MB）、启动慢 |
| Python + Streamlit | UI粗糙、难做成真正的exe |
| C# WPF | UI开发效率低、样式难做 |
| 纯网页 | 无法生成exe、需要启动器 |

### 6.2 LLM API 兼容说明

系统设计为 **OpenAI 兼容接口**，支持以下模型：

| 模型类型 | 示例 | 接口格式 |
|---------|------|---------|
| OpenAI | gpt-4o, gpt-4-turbo | `https://api.openai.com/v1/chat/completions` |
| Claude | claude-3-5-sonnet | `https://api.anthropic.com/v1/messages`（需适配） |
| 国产模型 | 智谱GLM-4、DeepSeek、Qwen | OpenAI兼容接口 |
| 本地模型 | Ollama、LM Studio | `http://localhost:11434/v1/chat/completions` |

> **数据安全说明**：LLM调用走用户配置的API，纯前端发起，不经过任何中转服务器。用户数据（手牌+决策）仅发送给用户指定的API地址。

### 6.3 项目结构

```
H:\01-Project\2026\21- HongZhongMaJiang\
├── src/                          # Vue 3 前端源码
│   ├── assets/                   # 静态资源
│   │   └── tiles/               # 麻将牌图片/字体
│   ├── components/              # Vue 组件
│   │   ├── HandView.vue         # 手牌展示
│   │   ├── TileBoard.vue        # 牌桌/河面
│   │   ├── ProbabilityPanel.vue # 概率分析面板
│   │   ├── DecisionPanel.vue    # 决策建议面板
│   │   ├── BayesianPanel.vue   # 贝叶斯分析面板
│   │   ├── SimulatorPanel.vue   # 模拟器面板
│   │   ├── TeachingPanel.vue    # 教学模式面板
│   │   ├── AIAnalysisModal.vue  # AI分析弹窗 ⭐新增
│   │   ├── AIChatPanel.vue      # AI对话面板 ⭐新增
│   │   └── SettingsPanel.vue    # 设置面板（含LLM配置）⭐新增
│   ├── composables/             # Vue 组合式函数
│   │   ├── useProbability.ts    # 概率计算逻辑
│   │   ├── useBayesian.ts        # 贝叶斯推断
│   │   ├── usePongDecision.ts   # 碰牌决策
│   │   ├── useSwitchDecision.ts # 换向决策
│   │   └── useLLM.ts             # LLM 调用封装 ⭐新增
│   ├── algorithms/              # 核心算法（纯TS，无UI依赖）
│   │   ├── deck.ts              # 牌堆生成、洗牌、发牌
│   │   ├── probability.ts       # 概率计算
│   │   ├── bayesian.ts          # 贝叶斯推断
│   │   ├── pong-decision.ts     # 碰牌决策算法
│   │   ├── switch-decision.ts    # 换向决策算法
│   │   ├── hand-analyzer.ts      # 手牌分析（听牌检测）
│   │   ├── simulator.ts          # 蒙特卡洛模拟器
│   │   └── llm-prompts.ts        # LLM Prompt 模板 ⭐新增
│   ├── stores/                  # Pinia 状态管理
│   │   ├── gameStore.ts          # 游戏状态
│   │   └── settingsStore.ts       # 设置（含LLM配置）⭐新增
│   ├── types/                   # TypeScript 类型定义
│   │   └── index.ts             # 所有接口和枚举
│   ├── App.vue
│   └── main.ts
├── src-tauri/                   # Tauri Rust 后端
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/                      # 静态文件
├── tests/                       # 单元测试
│   ├── probability.test.ts      # 概率算法测试
│   ├── bayesian.test.ts         # 贝叶斯测试
│   └── hand-analyzer.test.ts    # 手牌分析测试
├── docs/                        # 文档
│   ├── SPEC.md                  # 本文档
│   └── ALGORITHM.md            # 算法详细说明
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 七、LLM 集成详细设计 ⭐

### 7.1 API 调用封装

```typescript
// src/composables/useLLM.ts

interface LLMOptions {
  apiUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

async function callLLM(options: LLMOptions, messages: ChatMessage[]): Promise<string> {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API 错误: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 7.2 Prompt 模板

```typescript
// src/algorithms/llm-prompts.ts

const SYSTEM_PROMPT = `你是一个专业的红中麻将概率分析助手。

红中麻将规则（简要）：
- 112张牌：1-9筒/万/条各4张 + 4个红中（赖子）
- 可碰、可杠、不许吃、只能自摸胡牌
- 红中可以替换任意牌型
- 杠后补摸1张牌（明杠/暗杠均可）⭐

你的分析风格：
1. 先给结论，再给理由
2. 结合概率数据和牌局局势
3. 用中文输出，简洁易懂
4. 字数控制在500字以内
5. 适当考虑对手可能的牌型`;

function buildPongDecisionPrompt(context: LLMPromptContext): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `
【触发类型】碰牌决策分析

【当前手牌】
${formatTiles(context.currentHand)}

【对手打出的牌】
${formatTile(context.playerAction)}

【河面已见牌】
${formatTiles(context.visibleTiles)}

【牌堆剩余】
${context.deckRemaining} 张

【本地概率分析】
${formatProbability(context.probabilityAnalysis)}

【决策选项】
A. 碰：碰后变成[描述碰后手牌]，单吊1张，概率${context.probabilityAnalysis.singleDrawProb}%
B. 不碰：继续当前方向，概率${...}%

请分析：
1. 碰 vs 不碰，哪个长期胜率更高？
2. 在当前局势下，应该如何决策？
3. 有什么需要特别注意的风险？
`}
  ];
}

function buildGangDecisionPrompt(context: LLMPromptContext): ChatMessage[] { // ⭐新增
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `
【触发类型】杠牌决策分析

【当前手牌】
${formatTiles(context.currentHand)}

【可杠的牌】
${formatTile(context.pendingGangTile)}
（说明：${context.pendingGangTile?.suit === context.pendingGangTile?.suit ? '明杠：手牌有碰刻子，对手打了第4张' : '暗杠：自己摸到了第4张'})

【已完成的副露】
${formatMelds(context.melds)}

【河面已见牌】
${formatTiles(context.visibleTiles)}

【牌堆剩余】
${context.deckRemaining} 张

【杠后分析】
${formatGangAnalysis(context.gangAnalysis)}

【决策选项】
A. 杠：亮出刻子，补摸1张牌
   · 可能直接自摸
   · 跳过1次正常摸牌机会
   · 信息暴露（明杠暴露某牌4张已齐）
B. 不杠：保持现状，继续正常摸牌

请分析：
1. 杠 vs 不杠，期望收益哪个更高？
2. 明杠和暗杠的风险有何不同？
3. 杠后补摸的期望价值如何计算？
`}
  ];
}

function buildSwitchDecisionPrompt(context: LLMPromptContext): ChatMessage[] {
  // 类似结构...
}

function buildGameReviewPrompt(context: LLMPromptContext): ChatMessage[] {
  // 对局复盘...
}
```

### 7.3 触发时机控制

```typescript
// src/composables/useLLM.ts

function shouldTriggerAI(context: LLMPromptContext, config: LLMConfig): boolean {
  if (!config.enabled) return false;

  switch (context.trigger) {
    case 'pong_decision':
      return config.enabledTriggers.includes('pong_decision');
    case 'switch_decision':
      return config.enabledTriggers.includes('switch_decision');
    case 'low_probability':
      return config.enabledTriggers.includes('low_probability')
          && context.probabilityAnalysis.singleDrawProb < 0.05;
    case 'manual':
      return true; // 手动触发总是允许
    default:
      return false;
  }
}
```

### 7.4 错误处理与降级

```typescript
async function analyzeWithAI(context: LLMPromptContext, config: LLMConfig) {
  try {
    const messages = buildPrompt(context);
    const response = await callLLM(config, messages);
    return { success: true, content: response };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return { success: false, error: 'API Key 无效，请检查设置' };
      }
      if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        return { success: false, error: '请求超时，请检查网络或API地址' };
      }
    }
    return { success: false, error: `AI分析失败: ${error}` };
  }
}
```

---

## 八、开发计划

### 阶段一：核心算法（预计 3-4 天）

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D1 | 牌堆系统：生成、洗牌、发牌、摸牌 | P0 |
| D2 | 手牌分析：刻子/顺子/搭子检测，听牌分析 | P0 |
| D3 | 概率计算：超几何分布、N巡概率 | P0 |
| D4 | 贝叶斯推断：对手手牌概率模型 | P1 |
| D5 | 碰/杠牌决策算法 + 换向决策算法 | P1 |
| D5b | 明杠/暗杠决策算法 + 杠后补摸概率 | P1 |

### 阶段二：基础UI（预计 3-4 天）

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D6 | 项目初始化：Tauri + Vue 3 + TypeScript | P0 |
| D7 | 手牌界面：麻将牌展示、点击操作 | P0 |
| D8 | 概率面板：实时概率显示 | P0 |
| D9 | 河面展示：已见牌追踪 | P0 |

### 阶段三：决策功能（预计 2-3 天）

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D10 | 碰牌决策界面 + 决策建议 | P0 |
| D11 | 听牌换向分析界面 | P1 |
| D12 | 贝叶斯面板：对手分析 | P1 |

### 阶段四：LLM AI 功能（预计 2-3 天）⭐ 新增

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D13 | LLM API 调用封装（fetch + 错误处理） | P0 |
| D14 | 设置面板：API地址/Key/模型配置 | P0 |
| D15 | AI分析弹窗：触发时机 + 结果展示 | P0 |
| D16 | AI对话面板：自由问答 | P1 |
| D17 | Prompt 模板优化 + 本地降级处理 | P1 |

### 阶段五：高级功能（预计 2-3 天）

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D18 | 蒙特卡洛模拟器 | P2 |
| D19 | 教学模式：每个决策附带解释 | P2 |
| D20 | 设置面板：调整参数 | P2 |

### 阶段六：打包发布（预计 1 天）

| 任务 | 内容 | 优先级 |
|------|------|--------|
| D21 | Tauri 打包 Windows exe | P0 |
| D22 | 测试验证 | P0 |

---

## 九、测试计划

### 9.1 单元测试

```typescript
// probability.test.ts
test('单巡概率计算：牌堆60张，目标3张', () => {
  expect(singleDrawProb(60, 3)).toBeCloseTo(0.05);
});

test('10巡内自摸概率：牌堆60张，目标3张', () => {
  expect(multiDrawProb(60, 3, 10)).toBeCloseTo(0.46, 1); // ≈46%
});

// bayesian.test.ts
test('第5巡主动打某牌，对方还有的概率≈15%', () => {
  expect(bayesianOpponentProb('主动', 5)).toBeCloseTo(0.15, 1);
});

// llm.test.ts ⭐新增
test('Prompt模板正确构建', () => {
  const messages = buildPongDecisionPrompt(mockContext);
  expect(messages).toHaveLength(2);
  expect(messages[0].role).toBe('system');
  expect(messages[1].role).toBe('user');
  expect(messages[1].content).toContain('碰牌决策');
});

// gang.test.ts ⭐新增
test('明杠后补摸概率计算：牌堆60张，目标3张', () => {
  const result = gangDrawAnalysis(60, 3, 0);
  expect(result.directWinProb).toBeCloseTo(3/60); // 直接摸到目标
  expect(result.expectedValue).toBeGreaterThan(0);
});

test('暗杠后信息暴露分析', () => {
  const result = concealedGangRisk('5555条', ['4条', '6条']);
  // 暗杠5555条，听4条/6条方向 → 信息暴露反而是安全的
  expect(result.opponentSafeTiles).toContain('5条');
  expect(result.riskLevel).toBe('low');
});
```

### 9.2 集成测试

- 模拟100局完全随机打牌，验证自摸率在理论值±5%内
- 蒙特卡洛10000次模拟，验证碰牌决策胜率对比
- LLM API调用测试（mock响应，验证解析逻辑）

### 9.3 API配置测试

- 测试各模型API兼容性（OpenAI/DeepSeek/GLM等）
- 测试错误处理（无效Key、超时、网络错误）

---

## 十、风险与备选方案

| 风险 | 应对 |
|------|------|
| Tauri 环境配置复杂 | 备选：先做纯Web版（Vite），再用electron-builder打包exe |
| 麻将牌UI制作工作量大 | 备选：使用 Unicode 麻将字符（🀇🀈...）或开源素材 |
| 贝叶斯模型参数不准确 | 备选：提供参数调节滑块，用户可自定义经验概率 |
| LLM API不稳定/超时 | 降级：显示本地算法结果，不阻塞主流程 |
| LLM API兼容性问题 | 备选：提供多个模型适配器（OpenAI/Claude/国产模型） |

---

## 十一、后续扩展方向

| 方向 | 内容 |
|------|------|
| 红中赖子深度算法 | 4个红中作为赖子的最优使用策略 |
| 多人对战模拟 | 4个AI玩家，模拟整局 |
| 录像回放 | 记录对局，分析决策得失 |
| 手机版 | Tauri支持移动端，一套代码多端运行 |
| LLM自我对弈 | 让两个AI对战，学习最优策略 |
| 牌谱分析 | 上传历史牌谱，AI分析决策得失 |

---

## 十二、交付物

1. **源代码**：`H:\01-Project\2026\21- HongZhongMaJiang\`
2. **可执行文件**：`HongZhongMaJiang.exe`
3. **算法文档**：`docs/ALGORITHM.md`
4. **使用说明**：`README.md`
5. **LLM配置指南**：`docs/LLM_SETUP.md`（配置不同模型API的教程）

---

## 十三、API配置指南（待写入 docs/LLM_SETUP.md）

| 模型 | API地址 | 备注 |
|------|---------|------|
| OpenAI GPT-4o | `https://api.openai.com/v1/chat/completions` | 官方API |
| 智谱 GLM-4 | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | 需申请API Key |
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | 性价比高 |
| 阿里 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | 需阿里云账号 |
| 本地 Ollama | `http://localhost:11434/v1/chat/completions` | 完全本地，无费用 |

> 杰哥，你的API和Key准备好后，直接在设置面板填入即可使用。

---

*文档版本：V1.2 | 更新日期：2026-04-14 | 更新内容：新增杠牌决策分析（F8-1/2/3）、Meld类型区分、明杠/暗杠算法、补摸概率模型、LLM触发时机增加杠牌、相关数据结构更新、单元测试补充*
