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

  it('自摸胡牌时调用 win 应当正常记录且不抛出异常', () => {
    const store = useGameStore()
    // 构造一张测试牌生成辅助函数
    const t = (suit: string, num: number | null) => ({
      suit: suit as any,
      number: num,
      id: `${suit}_${num}_test_win`
    })

    store.startGame()
    
    // 强制构造一个 14 张的已胡牌手牌
    store.playerHand = [
      t('bamboo', 1), t('bamboo', 1), t('bamboo', 1),
      t('bamboo', 2), t('bamboo', 2), t('bamboo', 2),
      t('bamboo', 3), t('bamboo', 3), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 4), t('bamboo', 4),
      t('red_zhong', null), t('red_zhong', null)
    ]
    
    // 设置阶段为自摸胡牌待确认
    store.gamePhase = 'waiting_win'
    
    // 验证调用 store.win() 不会抛出任何异常，并且能够顺利进入 ended 结束状态
    expect(() => store.win()).not.toThrow()
    expect(store.gamePhase).toBe('ended')
  })

  it('红中杠麻模式自摸胡牌时调用 win 应当正常记录且不抛出异常', () => {
    const store = useGameStore()
    const t = (suit: string, num: number | null) => ({
      suit: suit as any,
      number: num,
      id: `${suit}_${num}_test_win_hzg`
    })

    // 启动红中杠麻模式
    store.startGame('hongzhong_gang')
    
    // 构造一个不含红中的 14 张已胡牌手牌
    store.playerHand = [
      t('bamboo', 1), t('bamboo', 1), t('bamboo', 1),
      t('bamboo', 2), t('bamboo', 2), t('bamboo', 2),
      t('bamboo', 3), t('bamboo', 3), t('bamboo', 3),
      t('bamboo', 4), t('bamboo', 4), t('bamboo', 4),
      t('dot', 9), t('dot', 9)
    ]
    
    // 设置阶段为等待胡牌
    store.gamePhase = 'waiting_win'
    
    // 验证调用 store.win() 不会抛出任何异常，并且能够顺利进入 ended 结束状态
    expect(() => store.win()).not.toThrow()
    expect(store.gamePhase).toBe('ended')
  })
})
