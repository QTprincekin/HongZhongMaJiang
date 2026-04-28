// ============================================================
// 红中麻将概率训练系统 - 类型定义
// ============================================================

// 牌的花色
export enum TileSuit {
  DOT = 'dot',       // 筒 1-9
  BAMBOO = 'bamboo', // 条 1-9
  CHARACTER = 'char', // 万 1-9
  RED_ZHONG = 'red_zhong', // 红中（赖子）
}

// 牌的花色中文名
export const SUIT_NAMES: Record<TileSuit, string> = {
  [TileSuit.DOT]: '筒',
  [TileSuit.BAMBOO]: '条',
  [TileSuit.CHARACTER]: '万',
  [TileSuit.RED_ZHONG]: '红中',
}

// 单张牌
export interface Tile {
  suit: TileSuit
  number: number | null // 1-9，红中为 null
  id: string            // 唯一标识，如 "dot_3_0"（dot_花色_数字_序号）
}

// 副露类型：碰 / 明杠 / 暗杠
export type MeldType = 'pong' | 'exposed_gang' | 'concealed_gang'

// 副露（碰/杠）
export interface Meld {
  type: MeldType
  tile: Tile       // 涉及的牌（如 333万）
  drawnAfter?: Tile // 杠后补摸的牌
  fromOpponent?: boolean // 是否从对手处碰/杠来的（碰/点杠）
}

// 牌堆状态
export interface DeckState {
  tiles: Tile[]           // 剩余牌堆
  totalCount: number      // 原始112张
  remainingCount: number  // 当前剩余
  visibleTiles: Tile[]    // 已见牌（河面+碰杠亮出的）
  gangDraws: Tile[]       // 杠后补摸走的牌
}

// 手牌状态
export interface HandState {
  tiles: Tile[]           // 当前手牌（含补摸牌）
  melds: Meld[]           // 已完成的副露
  isReady: boolean        // 是否听牌
  waitingTiles: Tile[]   // 等牌列表
  waitingCount: number   // 听牌数
  // 待处理操作
  pendingPong?: Tile      // 当前可碰的牌（对手刚打）
  pendingGang?: Tile      // 当前可杠的牌
}

// 听牌分析结果
export interface WaitingAnalysis {
  isReady: boolean
  waitingTiles: Tile[]
  waitingCount: number
  readyHand: Tile[][]     // 可能的胡牌型（用于检测）
}

// 概率状态
export interface ProbabilityState {
  singleDrawProb: number          // 单巡自摸概率
  multiDrawProb: Map<number, number> // N巡内自摸概率
  expectedDraws: number           // 期望自摸巡数
  targetTiles: Tile[]             // 目标牌列表
  targetCount: number             // 目标牌总数
  targetTileCounts: Map<string, number>  // 每张目标牌的剩余数量 {key: count}
}

// 碰牌决策结果
export interface PongDecision {
  shouldPong: boolean
  pongHand: Tile[]
  pongWaiting: WaitingAnalysis
  pongProb: number
  noPongProb: number
  reason: string
  canGang: boolean                // 碰后是否可以杠
  gangDecision?: GangDecision     // 如果可杠，给出杠决策
}

// 杠牌决策结果 ⭐
export interface GangDecision {
  shouldGang: boolean
  gangType: 'exposed' | 'concealed'
  handAfterGang: Tile[]
  gangProb: number                // 杠后期望收益
  noGangProb: number             // 不杠时继续摸牌的期望
  reason: string
  gangDrawAnalysis: GangDrawAnalysis
}

// 杠后补摸分析 ⭐
export interface GangDrawAnalysis {
  directWinProb: number          // 补摸直接自摸概率
  improveProb: number           // 补摸改善手牌概率
  neutralProb: number           // 补摸废牌概率
  expectedValue: number          // 补摸期望值
  deckAfterGang: number          // 杠后牌堆剩余
}

// 贝叶斯推断结果
export interface BayesianResult {
  tile: Tile
  posteriorProb: number         // 后验概率（对手有此牌）
  priorProb: number              // 先验概率
  likelihood: number             // 似然
  evidence: number               // 证据
  adjustedDeckCount: number      // 修正后的牌堆目标牌数
}

// 换向决策
export interface SwitchDecision {
  shouldSwitch: boolean
  currentDirection: Tile[]       // 当前听牌方向
  currentProb: number
  switchDirection: Tile[]        // 换向后的听牌方向
  switchProb: number
  reason: string
}

// 模拟器结果
export interface SimulatorResult {
  totalGames: number
  selfWinRate: number           // 自摸率
  avgDraws: number              // 平均自摸用巡数
  byStrategy: Record<string, { winRate: number; avgDraws: number }>
}

// LLM 配置 ⭐
export interface LLMConfig {
  enabled: boolean
  apiUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  showReasoning: boolean
  enabledTriggers: LLMTrigger[]
}

export type LLMTrigger =
  | 'pong_decision'
  | 'gang_decision'
  | 'switch_decision'
  | 'low_probability'
  | 'manual'
  | 'game_review'

// LLM 分析上下文 ⭐
export interface LLMPromptContext {
  trigger: LLMTrigger
  currentHand: Tile[]
  visibleTiles: Tile[]
  deckRemaining: number
  probabilityAnalysis: ProbabilityState
  pendingPong?: Tile
  pendingGang?: Tile
  melds: Meld[]
  round: number
}

// LLM 分析结果
export interface LLMAnalysisResult {
  success: boolean
  content?: string
  error?: string
  latency?: number
  model?: string
}

// ============================================================
// 有效进张概览测算 - 类型定义
// ============================================================

// 手牌分组类型（拆牌分析用）
export type HandGroupType =
  | 'complete_meld'   // 完整面子（刻子/顺子）
  | 'pair'            // 对子（将牌候选）
  | 'partial_seq'     // 搭子（如1筒3筒，差中间牌）
  | 'partial_pair'    // 单张待配对
  | 'isolated'        // 孤张

// 手牌分组
export interface HandGroup {
  type: HandGroupType
  tiles: Tile[]               // 组内牌
  needed?: Tile[]             // 需要什么牌才能成型/升级
}

// 向听数结果
export interface ShantenResult {
  shanten: number             // -1=已胡, 0=听牌, 1=一向听, 2=二向听...
  bestDecomposition: HandGroup[] // 最优拆牌方案
}

// 进张后形成的组合（用于UI展示）
export interface FormedCombination {
  type: 'sequence' | 'triplet' | 'pair'
  tiles: Tile[]               // 组合中所有牌（含摸到的）
  drawnTileId: string         // 哪张是摸到的（UI虚化显示）
}

// 有效进张牌
export interface EffectiveDraw {
  tile: Tile                          // 有效进张牌（如2筒）
  remainingCount: number              // 牌堆剩余数量
  shantenAfter: number                // 摸到后的向听数
  shantenReduction: number            // 向听数降低了多少
  formedCombinations: FormedCombination[] // 形成的组合（UI展示用）
}

// 有效进张分析结果
export interface EffectiveDrawResult {
  currentShanten: number              // 当前向听数
  effectiveDraws: EffectiveDraw[]     // 有效进张列表
  totalEffectiveCount: number         // 有效进张总张数（含牌堆剩余）
  acceptanceRate: number              // 进张率 = totalEffectiveCount / deckRemaining
}

// 打牌后的分析（打-摸联动）
export interface DiscardAnalysis {
  discard: Tile                       // 打出哪张
  shantenAfter: number                // 打出后的向听数
  effectiveDraws: EffectiveDraw[]     // 打出后的有效进张列表
  effectiveCount: number              // 有效进张总张数
  acceptanceRate: number              // 进张率
}

// 打-摸联动完整结果
export interface DiscardRecommendation {
  options: DiscardAnalysis[]          // 所有打牌选项（已排序，最优在前）
  bestDiscard: DiscardAnalysis        // 推荐打出的牌
}

// ============================================================
// 计分系统 - 类型定义
// ============================================================

// 一局结果

export interface RoundResult {
  roundNumber: number          // 第几把
  winner: number               // 胡牌者：0-2=对手，3=玩家，-1=流局
  isSelfDraw: boolean          // true=自摸，false=点炮
  winTile?: Tile               // 胡的牌
  scoreChanges: Record<number, number>  // 各玩家该局得失分
  // 抓马详情
  bonusDrawCount?: number      // 本次抓马个数
  bonusDrawTiles?: Tile[]      // 从牌堆抓到的马
  bonusHitCount?: number       // 命中目标牌数
  hasRedZhong?: boolean        // 胡牌时手中是否有红中
  winnerScore?: number         // 赢家最终得分
}

// 圈数设置
export type RoundSetting = 0 | 5 | 10 | 20 | number  // 0=不记分

export const ROUND_OPTIONS: { value: RoundSetting; label: string }[] = [
  { value: 0, label: '不记分（练习）' },
  { value: 5, label: '5圈（5把）' },
  { value: 10, label: '10圈（10把）' },
  { value: 20, label: '20圈（20把）' },
  { value: -1, label: '自定义' },
]

// ============================================================
// AI 难度等级
// ============================================================

// AI 难度等级
export enum AIDifficulty {
  NOVICE = 'novice',       // 新手 - 永远不胡，故意打烂牌
  BEGINNER = 'beginner',   // 入门 - 低概率胡牌，一般策略
  EXPERT = 'expert',       // 高手 - 大概率胡牌，较好策略
  MASTER = 'master',       // 专家 - 必胡，最优策略
}

// AI 难度配置
export interface AIDifficultyConfig {
  label: string
  winChance: number        // 听牌后胡牌概率 (0-1)
  discardStrategy: 'bad' | 'random' | 'good' | 'optimal'
}

export const AI_DIFFICULTY_CONFIG: Record<AIDifficulty, AIDifficultyConfig> = {
  [AIDifficulty.NOVICE]: { label: '新手', winChance: 0, discardStrategy: 'bad' },
  [AIDifficulty.BEGINNER]: { label: '入门', winChance: 0.2, discardStrategy: 'random' },
  [AIDifficulty.EXPERT]: { label: '高手', winChance: 0.8, discardStrategy: 'good' },
  [AIDifficulty.MASTER]: { label: '专家', winChance: 1, discardStrategy: 'optimal' },
}

// 游戏状态
export interface GameState {
  deck: DeckState
  playerHand: HandState
  opponentHands: HandState[]
  round: number
  history: GameAction[]
  aiDifficulty: AIDifficulty
}

export type GameActionType = 'draw' | 'discard' | 'pong' | 'gang' | 'self_draw'

export interface GameAction {
  type: GameActionType
  tile?: Tile
  fromOpponent?: number
  round: number
  meld?: Meld
}
