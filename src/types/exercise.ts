// ============================================================
// 红中麻将概率训练系统 - 习题（何切问题）类型定义
// ============================================================

import type { Tile, Meld, GameMode, DiscardAnalysis } from './index'

/** 习题（何切题）定义接口 */
export interface Exercise {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  gameMode: GameMode
  hand: Tile[]             // 14张手牌，代表用户摸牌后需要切牌的状态
  melds?: Meld[]           // 已完成的副露（可选）
  river?: Tile[]           // 河面已打出的牌，用于计算可见牌（可选）
  round?: number           // 当前巡数，默认为 1
  description: string      // 题目背景描述
  deckRemaining?: number   // 牌堆剩余张数，默认 80
  aiExplanation?: string   // 本地预置的算法原理解析（当AI未开启时作为后备显示）
}

/** 用户答题结果与评分接口 */
export interface ExerciseResult {
  exerciseId: string
  selectedTile: Tile       // 用户选择打出的牌
  bestTile: Tile           // 算法推荐的最佳出牌
  isCorrect: boolean       // 用户选择是否就是最佳出牌
  userScore: number        // 综合评分 (0 - 100)
  userAnalysis: DiscardAnalysis | null // 用户选择出牌的算法分析
  bestAnalysis: DiscardAnalysis        // 最佳出牌的算法分析
  aiExplanation?: string   // 大语言模型生成的分析点评内容
}
