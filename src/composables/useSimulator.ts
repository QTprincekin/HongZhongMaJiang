// ============================================================
// 蒙特卡洛模拟器 composable
// ============================================================

import { ref, computed } from 'vue'
import type { SimulatorResult, Tile } from '@/types'
import { compareStrategies } from '@/algorithms/switch-decision'

export function useSimulator() {
  const running = ref(false)
  const progress = ref(0)
  const result = ref<SimulatorResult | null>(null)
  const error = ref<string | null>(null)

  async function runSimulator(initialHand: Tile[], iterations: number = 10000): Promise<SimulatorResult> {
    if (running.value) throw new Error('模拟正在进行中')

    running.value = true
    progress.value = 0
    error.value = null
    result.value = null

    try {
      const batchSize = 1000
      const batches = Math.ceil(iterations / batchSize)

      let totalWins = 0
      let totalGames = 0
      let totalDraws = 0
      let keepWins = 0
      let keepDraws = 0

      for (let batch = 0; batch < batches; batch++) {
        const batchIters = Math.min(batchSize, iterations - batch * batchSize)
        const batchResult = compareStrategies(initialHand, batchIters)

        const batchWins = batchResult.selfWinRate * batchIters
        totalWins += batchWins
        totalGames += batchIters

        if (batchResult.byStrategy.keep.winRate > 0) {
          keepWins += batchResult.byStrategy.keep.winRate * batchIters
          if (batchResult.byStrategy.keep.avgDraws !== Infinity) {
            keepDraws += batchResult.byStrategy.keep.avgDraws * (batchResult.byStrategy.keep.winRate * batchIters)
          }
        }

        progress.value = Math.round(((batch + 1) / batches) * 100)
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      const keepWinRate = keepWins / totalGames
      const keepAvgDraws = keepWins > 0 ? keepDraws / keepWins : Infinity

      const finalResult: SimulatorResult = {
        totalGames,
        selfWinRate: totalWins / totalGames,
        avgDraws: totalWins > 0 ? totalDraws / totalWins : Infinity,
        byStrategy: {
          keep: { winRate: keepWinRate, avgDraws: keepAvgDraws },
          aggressive: { winRate: 0, avgDraws: Infinity },
        },
      }

      result.value = finalResult
      return finalResult
    } catch (err: any) {
      error.value = err.message || '模拟失败'
      throw err
    } finally {
      running.value = false
      progress.value = 100
    }
  }

  const formattedResult = computed(() => {
    if (!result.value) return null
    const r = result.value
    return {
      totalGames: r.totalGames.toLocaleString(),
      selfWinRate: (r.selfWinRate * 100).toFixed(1) + '%',
      avgDraws: r.avgDraws === Infinity ? '—' : r.avgDraws.toFixed(1) + ' 巡',
    }
  })

  function clear() {
    result.value = null
    error.value = null
    progress.value = 0
  }

  return { running, progress, result, error, formattedResult, runSimulator, clear }
}
