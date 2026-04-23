# 🀄 红中麻将概率训练系统

基于超几何分布、贝叶斯推断的红中麻将实时概率计算与决策分析工具，支持向听数 / 有效进张 / 碰杠决策 / LLM AI 辅助分析。

> **在线体验**：部署于 Vercel，无需安装，打开即用。

## 功能特性

### 核心算法
- 🎯 **自摸概率计算** — 超几何分布模型，单巡 / N巡累积 / 期望巡数
- 🧮 **向听数分析** — 递归穷举拆牌，实时计算距离听牌的步数
- 📊 **有效进张** — 枚举所有可降低向听数的摸牌（Phase 1 纯摸牌 / Phase 2 打摸联动）
- 🤔 **碰牌决策** — 碰 vs 不碰的期望收益量化对比
- 💎 **杠牌决策** — 明杠 / 暗杠 + 杠后补摸期望收益分析
- 🔄 **听牌换向** — 连续进张趋势检测，换听收益评估
- 🧠 **贝叶斯推断** — 基于对手出牌行为推测其手牌分布

### 游戏交互
- 🀄 112 张完整牌堆（1-9 筒/万/条 × 4 + 红中 × 4 赖子）
- 🃏 发牌、摸牌、打牌、碰、明杠、暗杠全流程操作
- 📋 实时概率面板 + 有效进张面板
- 🎨 深色主题 UI，麻将牌花色分类配色
- 📝 完整操作记录（巡数追踪）

### AI 辅助
- 🤖 LLM AI 辅助分析（支持 OpenAI / DeepSeek / GLM 等兼容接口）
- 💬 碰杠决策、换向分析等关键节点可触发 AI 深度解读

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 状态管理 | Pinia |
| 构建工具 | Vite 6 |
| UI 组件库 | Naive UI |
| 桌面打包 | Tauri 2.0 (Rust) |
| 测试框架 | Vitest |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm run test

# 构建（Web）
npm run build

# 构建桌面应用（需要 Rust 环境）
npx tauri build
```

## 红中麻将规则

| 项目 | 规则 |
|------|------|
| 牌数 | 112 张（1-9 筒/万/条各 4 张 + 红中 4 张）|
| 发牌 | 每家 13 张，庄家 14 张 |
| 可做 | 碰、杠、自摸 |
| 不可 | 吃 |
| 胡牌 | 仅自摸 |
| 赖子 | 红中可替换任意牌组成面子或将牌 |

## 项目结构

```
src/
├── algorithms/          # 核心算法（纯 TS，无 UI 依赖）
│   ├── deck.ts                # 牌堆管理（生成/洗牌/发牌/摸牌）
│   ├── hand-analyzer.ts       # 胡牌检测 + 听牌分析
│   ├── shanten.ts             # 向听数算法
│   ├── effective-draw.ts      # 有效进张 + 打摸联动
│   ├── probability.ts         # 自摸概率（超几何分布）
│   ├── bayesian.ts            # 贝叶斯对手推断
│   ├── pong-decision.ts       # 碰/杠决策算法
│   └── switch-decision.ts     # 换向决策 + 蒙特卡洛模拟
├── components/          # Vue 组件
│   ├── TileView.vue           # 麻将牌渲染
│   ├── ProbPanel.vue          # 自摸概率面板
│   ├── EffectiveDrawPanel.vue # 有效进张面板
│   └── DecisionPanel.vue      # 碰杠决策面板
├── stores/              # Pinia 状态管理
│   └── gameStore.ts           # 游戏全局状态
├── composables/         # 组合式函数
│   ├── useLLM.ts              # LLM API 调用封装
│   └── useSimulator.ts        # 模拟器逻辑
├── types/               # TypeScript 类型定义
└── styles/              # 全局样式

tests/                   # 单元测试
├── hand-analyzer.test.ts
├── shanten.test.ts
├── effective-draw.test.ts
├── probability.test.ts
└── jiege-hand.test.ts
```

## License

MIT
