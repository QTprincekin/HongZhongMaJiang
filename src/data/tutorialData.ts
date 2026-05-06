import type { TutorialChapter, Tile } from '@/types'
import { TileSuit } from '@/types'

function t(suit: TileSuit, number: number | null, idx: number = 0): Tile {
  const id = number !== null ? `${suit}_${number}_${idx}` : `${suit}_${idx}`
  return { suit, number, id }
}

export const tutorialChapters: TutorialChapter[] = [
  {
    id: 'intro',
    title: '红中麻将简介',
    icon: '🀄',
    sections: [
      {
        id: 'intro-1',
        title: '什么是红中麻将',
        blocks: [
          { type: 'text', content: '红中麻将是一种流行于广东、湖南等地的麻将玩法，最大的特色是"红中"这张牌可以作为万能赖子（百搭牌），能替代任意牌组成面子或将牌。' },
          { type: 'tip', style: 'info', text: '红中麻将只支持自摸胡牌，不能吃牌，节奏更快，策略性更强。' },
          { type: 'text', content: '本系统是一套红中麻将概率训练工具，帮助你在实战中提升对牌型、概率、向听数的敏感度。' },
        ],
      },
      {
        id: 'intro-2',
        title: '与普通麻将的区别',
        blocks: [
          { type: 'list', items: ['只有筒、条、万三种花色+红中，共112张牌', '红中是赖子，可替代任意牌', '不能吃牌，只能碰和杠', '只能自摸胡牌，不可点炮', '胡牌后有抓马计分环节'] },
          { type: 'tip', style: 'warning', text: '初学者常犯的错误：试图吃牌或等待点炮。红中麻将必须自摸！' },
        ],
      },
    ],
  },
  {
    id: 'tiles',
    title: '认识牌张',
    icon: '🃏',
    sections: [
      {
        id: 'tiles-1',
        title: '三种序数牌',
        blocks: [
          { type: 'text', content: '红中麻将的序数牌分为筒子、条子、万子，每种花色1-9各4张。' },
          { type: 'heading', level: 3, text: '筒子（饼）' },
          { type: 'tileDemo', tiles: [t(TileSuit.DOT,1),t(TileSuit.DOT,2),t(TileSuit.DOT,3),t(TileSuit.DOT,4),t(TileSuit.DOT,5),t(TileSuit.DOT,6),t(TileSuit.DOT,7),t(TileSuit.DOT,8),t(TileSuit.DOT,9)], label: '筒子 1-9', highlightIds: [] },
          { type: 'heading', level: 3, text: '条子（索）' },
          { type: 'tileDemo', tiles: [t(TileSuit.BAMBOO,1),t(TileSuit.BAMBOO,2),t(TileSuit.BAMBOO,3),t(TileSuit.BAMBOO,4),t(TileSuit.BAMBOO,5),t(TileSuit.BAMBOO,6),t(TileSuit.BAMBOO,7),t(TileSuit.BAMBOO,8),t(TileSuit.BAMBOO,9)], label: '条子 1-9', highlightIds: [] },
          { type: 'heading', level: 3, text: '万子' },
          { type: 'tileDemo', tiles: [t(TileSuit.CHARACTER,1),t(TileSuit.CHARACTER,2),t(TileSuit.CHARACTER,3),t(TileSuit.CHARACTER,4),t(TileSuit.CHARACTER,5),t(TileSuit.CHARACTER,6),t(TileSuit.CHARACTER,7),t(TileSuit.CHARACTER,8),t(TileSuit.CHARACTER,9)], label: '万子 1-9', highlightIds: [] },
        ],
      },
      {
        id: 'tiles-2',
        title: '红中（赖子）',
        blocks: [
          { type: 'text', content: '红中（🀄）是红中麻将的灵魂牌，共4张。它可以当作任意牌使用，是胡牌的关键利器。' },
          { type: 'tileDemo', tiles: [t(TileSuit.RED_ZHONG,null,0),t(TileSuit.RED_ZHONG,null,1),t(TileSuit.RED_ZHONG,null,2),t(TileSuit.RED_ZHONG,null,3)], label: '红中 × 4张', highlightIds: [] },
          { type: 'tip', style: 'success', text: '红中不仅可以替代普通牌组成面子，还能和普通牌一起组成对子做将牌！' },
        ],
      },
    ],
  },
  {
    id: 'rules',
    title: '基本规则',
    icon: '📋',
    sections: [
      {
        id: 'rules-1',
        title: '牌数与发牌',
        blocks: [
          { type: 'text', content: '一副红中麻将共112张牌：筒、条、万各36张（1-9各4张），红中4张。' },
          { type: 'rule', title: '发牌规则', desc: '四人游戏，每人初始发13张牌，庄家14张（庄家先出牌）。' },
          { type: 'text', content: '牌堆剩余牌作为摸牌墙，玩家按逆时针方向依次摸牌、打牌。' },
        ],
      },
      {
        id: 'rules-2',
        title: '行牌流程',
        blocks: [
          { type: 'list', items: ['摸牌：从牌墙顶部摸一张加入手牌', '打牌：从手牌中选择一张打出，放入河面', '轮询：按顺序轮到下一位玩家重复摸牌→打牌'] },
          { type: 'text', content: '当玩家手牌满足胡牌条件时，可以选择胡牌（自摸），也可以选择继续打（过胡）。' },
          { type: 'tip', style: 'warning', text: '红中麻将不能吃牌！即使上家打的牌正好是你需要的顺子中间牌，也不能吃。' },
        ],
      },
    ],
  },
  {
    id: 'winning',
    title: '胡牌条件',
    icon: '🏆',
    sections: [
      {
        id: 'winning-1',
        title: '基本牌型结构',
        blocks: [
          { type: 'text', content: '胡牌时手牌（含副露）共14张，由以下两部分组成：' },
          { type: 'rule', title: '4个面子', desc: '面子可以是顺子（如1筒2筒3筒）或刻子（如5万5万5万），副露的碰/杠也算面子。' },
          { type: 'rule', title: '1个对子', desc: '对子是将牌，由两张相同牌组成（可用红中替代其中一张）。' },
        ],
      },
      {
        id: 'winning-2',
        title: '顺子与刻子',
        blocks: [
          { type: 'heading', level: 3, text: '顺子（同花色连续三张）' },
          { type: 'tileDemo', tiles: [t(TileSuit.DOT,2),t(TileSuit.DOT,3),t(TileSuit.DOT,4)], label: '顺子示例：2筒3筒4筒', highlightIds: [] },
          { type: 'heading', level: 3, text: '刻子（三张相同）' },
          { type: 'tileDemo', tiles: [t(TileSuit.BAMBOO,7,0),t(TileSuit.BAMBOO,7,1),t(TileSuit.BAMBOO,7,2)], label: '刻子示例：7条7条7条', highlightIds: [] },
          { type: 'heading', level: 3, text: '对子（将牌）' },
          { type: 'tileDemo', tiles: [t(TileSuit.CHARACTER,8,0),t(TileSuit.CHARACTER,8,1)], label: '对子示例：8万8万', highlightIds: [] },
        ],
      },
      {
        id: 'winning-3',
        title: '红中赖子替代示例',
        blocks: [
          { type: 'text', content: '红中可以替代任意一张牌。以下是几种常见的红中替代场景：' },
          { type: 'heading', level: 3, text: '红中补顺子' },
          { type: 'tileDemo', tiles: [t(TileSuit.DOT,4),t(TileSuit.RED_ZHONG,null,0),t(TileSuit.DOT,6)], label: '4筒+红中+6筒 = 顺子（红中替代5筒）', highlightIds: [t(TileSuit.RED_ZHONG,null,0).id] },
          { type: 'heading', level: 3, text: '红中补刻子' },
          { type: 'tileDemo', tiles: [t(TileSuit.BAMBOO,3,0),t(TileSuit.BAMBOO,3,1),t(TileSuit.RED_ZHONG,null,1)], label: '3条+3条+红中 = 刻子（红中替代3条）', highlightIds: [t(TileSuit.RED_ZHONG,null,1).id] },
          { type: 'heading', level: 3, text: '红中做对子' },
          { type: 'tileDemo', tiles: [t(TileSuit.CHARACTER,9),t(TileSuit.RED_ZHONG,null,2)], label: '9万+红中 = 对子（红中替代9万）', highlightIds: [t(TileSuit.RED_ZHONG,null,2).id] },
        ],
      },
      {
        id: 'winning-4',
        title: '完整胡牌示例',
        blocks: [
          { type: 'text', content: '以下是一个完整的胡牌牌型（14张）：' },
          { type: 'tileDemo', tiles: [
            t(TileSuit.DOT,1),t(TileSuit.DOT,2),t(TileSuit.DOT,3),
            t(TileSuit.BAMBOO,4,0),t(TileSuit.BAMBOO,4,1),t(TileSuit.BAMBOO,4,2),
            t(TileSuit.CHARACTER,6),t(TileSuit.CHARACTER,7),t(TileSuit.CHARACTER,8),
            t(TileSuit.DOT,8,0),t(TileSuit.DOT,8,1),
            t(TileSuit.RED_ZHONG,null,0),t(TileSuit.BAMBOO,2),t(TileSuit.BAMBOO,3),
          ], label: '胡牌牌型：3面子+1对子+红中补顺子', highlightIds: [t(TileSuit.RED_ZHONG,null,0).id] },
          { type: 'tip', style: 'info', text: '上例中：1-2-3筒（顺子）、4-4-4条（刻子）、6-7-8万（顺子）、8-8筒（对子）、红中+2-3条（红中替代1条组成顺子）。' },
        ],
      },
    ],
  },
  {
    id: 'pong-gang',
    title: '碰与杠',
    icon: '💎',
    sections: [
      {
        id: 'pong-gang-1',
        title: '碰牌',
        blocks: [
          { type: 'text', content: '当任意玩家打出一张牌，你手中有两张相同的牌时，可以喊"碰"。' },
          { type: 'rule', title: '碰牌规则', desc: '将打出的牌与自己手中的两张牌组成刻子，亮出作为副露。碰后需打出一张手牌。' },
          { type: 'tileDemo', tiles: [t(TileSuit.DOT,5,0),t(TileSuit.DOT,5,1),t(TileSuit.DOT,5,2)], label: '碰牌结果：5筒刻子副露', highlightIds: [] },
        ],
      },
      {
        id: 'pong-gang-2',
        title: '明杠',
        blocks: [
          { type: 'text', content: '当任意玩家打出一张牌，你手中已有三张相同的牌时，可以喊"杠"（明杠）。' },
          { type: 'rule', title: '明杠规则', desc: '将打出的牌与自己手中的三张牌组成四张相同的牌，亮出作为副露。明杠后需从牌堆尾部补摸一张牌，再打出一张。' },
          { type: 'tileDemo', tiles: [t(TileSuit.BAMBOO,6,0),t(TileSuit.BAMBOO,6,1),t(TileSuit.BAMBOO,6,2),t(TileSuit.BAMBOO,6,3)], label: '明杠结果：6条四张副露', highlightIds: [] },
        ],
      },
      {
        id: 'pong-gang-3',
        title: '暗杠',
        blocks: [
          { type: 'text', content: '当你手牌中摸到第四张相同的牌时，可以选择"暗杠"，无需等其他玩家打出。' },
          { type: 'rule', title: '暗杠规则', desc: '将手中四张相同的牌组成暗杠副露。暗杠后同样需从牌堆尾部补摸一张牌，再打出一张。' },
          { type: 'tip', style: 'success', text: '暗杠是隐蔽的杠，其他玩家看不到你杠的是什么牌（本系统中暗杠会展示牌背）。' },
        ],
      },
    ],
  },
  {
    id: 'redzhong',
    title: '红中赖子规则',
    icon: '🔴',
    sections: [
      {
        id: 'redzhong-1',
        title: '红中的万能用法',
        blocks: [
          { type: 'text', content: '红中（赖子）是红中麻将的核心机制。它可以替代任何花色、任何数字的牌，帮助你更快地完成牌型。' },
          { type: 'list', items: ['红中 + 两张相同牌 = 刻子', '红中 + 两张连续牌（缺中间或缺边）= 顺子', '红中 + 一张牌 = 对子（将牌）', '多张红中可以同时用于不同的面子'] },
          { type: 'tip', style: 'info', text: '如果你有2张红中，可以分别用于两个不同的面子，非常灵活。' },
        ],
      },
      {
        id: 'redzhong-2',
        title: '有红中 vs 无红中',
        blocks: [
          { type: 'text', content: '胡牌时手牌中是否有红中，直接影响抓马数量和最终得分。' },
          { type: 'compare', labelA: '有红中', tilesA: [t(TileSuit.RED_ZHONG,null,0)], labelB: '无红中', tilesB: [] },
          { type: 'rule', title: '有红中', desc: '基础抓马4个 + 连胜加成（每连胜+2个）' },
          { type: 'rule', title: '无红中', desc: '基础抓马4个 + 连胜加成 + 额外奖励2个 = 共6个起步' },
          { type: 'tip', style: 'success', text: '无红中胡牌虽然更难，但抓马多2个，得分潜力更大！' },
        ],
      },
    ],
  },
  {
    id: 'scoring',
    title: '抓马计分',
    icon: '🐴',
    sections: [
      {
        id: 'scoring-1',
        title: '计分规则',
        blocks: [
          { type: 'text', content: '红中麻将采用抓马计分制，胡牌后从牌堆顺序抓取若干张牌作为"马"，根据命中情况计算最终得分。' },
          { type: 'rule', title: '底分', desc: '每家基础扣分10分，作为底池。' },
          { type: 'rule', title: '目标马牌', desc: '1、5、9 以及红中 为目标牌。命中1张目标牌，额外加10分。' },
          { type: 'rule', title: '抓马数量', desc: '基础4个 + 连胜加成（每连胜1把多2个）+ 无红中加成（+2个）' },
        ],
      },
      {
        id: 'scoring-2',
        title: '得分计算示例',
        blocks: [
          { type: 'text', content: '假设你胡牌时手中有红中，当前是第1把（无连胜加成），共抓4个马。' },
          { type: 'tileDemo', tiles: [t(TileSuit.DOT,1),t(TileSuit.DOT,5),t(TileSuit.BAMBOO,3),t(TileSuit.CHARACTER,9)], label: '抓马结果：1筒、5筒、3条、9万', highlightIds: [t(TileSuit.DOT,1).id,t(TileSuit.DOT,5).id,t(TileSuit.CHARACTER,9).id] },
          { type: 'text', content: '命中目标：1筒（1）、5筒（5）、9万（9），共3个。得分 = 底分10 + 3×10 = 40分。' },
          { type: 'text', content: '赢家得 40 × 3 = 120分，其他三家各扣40分。' },
        ],
      },
    ],
  },
  {
    id: 'strategy',
    title: '概率与策略',
    icon: '🧠',
    sections: [
      {
        id: 'strategy-1',
        title: '向听数',
        blocks: [
          { type: 'text', content: '向听数表示你距离胡牌还差几步。本系统会自动计算你当前手牌的向听数。' },
          { type: 'list', items: ['-1 = 已经胡牌', '0 = 听牌（只需一张即可胡）', '1 = 一向听（还需一张进入听牌）', '2 = 二向听', '以此类推'] },
          { type: 'tip', style: 'info', text: '向听数越低，你离胡牌越近。合理打牌的目标是尽快将向听数降到0（听牌）。' },
        ],
      },
      {
        id: 'strategy-2',
        title: '有效进张',
        blocks: [
          { type: 'text', content: '有效进张是指：摸到某张牌后，你的手牌向听数会降低。本系统会分析所有有效进张牌及牌堆剩余数量。' },
          { type: 'text', content: '例如你手牌差一张组成顺子，那张牌就是你的有效进张。牌堆中剩余越多，摸到概率越高。' },
          { type: 'tip', style: 'success', text: '听牌后，系统会计算你所有等牌的概率，使用超几何分布模型给出单巡/N巡自摸概率。' },
        ],
      },
      {
        id: 'strategy-3',
        title: '碰杠决策',
        blocks: [
          { type: 'text', content: '本系统提供AI辅助的碰杠决策分析，从概率角度告诉你：碰/杠后你的自摸概率是提升还是下降。' },
          { type: 'rule', title: '碰牌决策', desc: '比较"碰后的听牌概率"与"不碰继续摸牌的期望收益"，给出量化建议。' },
          { type: 'rule', title: '杠牌决策', desc: '分析杠后补摸的期望值：直接自摸概率、改善手牌概率、废牌概率。' },
          { type: 'tip', style: 'warning', text: '不要盲目碰杠！有时不碰保持门清，反而有更多改良空间。' },
        ],
      },
    ],
  },
]
