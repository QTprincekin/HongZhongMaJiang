import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../src/stores/gameStore'

describe('上帝视角局势数据快照捕获测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('初始化游戏时应当在历史记录中记录完整的局势快照', () => {
    const store = useGameStore()
    store.startGame()
    
    // 检查 history 长度
    expect(store.history.length).toBeGreaterThanOrEqual(1)
    
    const startAction = store.history[0]
    expect(startAction.type).toBe('starting_hand')
    
    // 验证快照字段是否存在且类型正确
    expect(startAction.shantenSnapshot).toBeDefined()
    expect(typeof startAction.shantenSnapshot).toBe('number')
    expect(startAction.shantenSnapshot).toBeGreaterThanOrEqual(-1)
    
    expect(startAction.effectiveDrawCountSnapshot).toBeDefined()
    expect(typeof startAction.effectiveDrawCountSnapshot).toBe('number')
    
    expect(startAction.effectiveDrawTilesSnapshot).toBeDefined()
    expect(Array.isArray(startAction.effectiveDrawTilesSnapshot)).toBe(true)
    
    expect(startAction.singleDrawProbSnapshot).toBeDefined()
    expect(typeof startAction.singleDrawProbSnapshot).toBe('number')
    
    expect(startAction.deckRemainingSnapshot).toBeDefined()
    expect(typeof startAction.deckRemainingSnapshot).toBe('number')
    
    expect(startAction.visibleTilesSnapshot).toBeDefined()
    expect(Array.isArray(startAction.visibleTilesSnapshot)).toBe(true)
  })

  it('玩家摸牌和打牌动作后应当追加正确的瞬时快照', () => {
    const store = useGameStore()
    store.startGame()
    
    // 强制摸牌
    store.draw()
    
    const drawAction = store.history[store.history.length - 1]
    expect(drawAction.type).toBe('draw')
    expect(drawAction.shantenSnapshot).toBeDefined()
    expect(drawAction.effectiveDrawCountSnapshot).toBeDefined()
    expect(drawAction.singleDrawProbSnapshot).toBeDefined()
    
    // 拿出一张牌打出
    const tileToDiscard = store.playerHand[0]
    store.discard(tileToDiscard)
    
    const discardAction = store.history[store.history.length - 1]
    expect(discardAction.type).toBe('discard')
    expect(discardAction.shantenSnapshot).toBeDefined()
    expect(discardAction.effectiveDrawCountSnapshot).toBeDefined()
    expect(discardAction.singleDrawProbSnapshot).toBeDefined()
  })
})
