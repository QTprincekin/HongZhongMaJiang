import { Tile, TileSuit, Exercise } from '@/types'

let idCounter = 0
/** 快速创建牌对象的辅助函数 */
function makeTile(suit: TileSuit, number: number | null): Tile {
  return {
    suit,
    number,
    id: `ex_${suit}_${number ?? 'rz'}_${idCounter++}`
  }
}

export const exercises: Exercise[] = [
  {
    id: 'ex_1',
    title: '赖子起手与孤牌处理',
    difficulty: 'easy',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式下，红中是万能赖子。此时是第 3 巡，你刚摸到 3 条。手牌包含 1 张红中、一个完成的万字顺子、多组筒子和条子搭子，以及 1 张孤牌 9 万。此时应该打哪张牌以获得最优的进张效率？',
    round: 3,
    deckRemaining: 85,
    hand: [
      // 123万 (顺子)
      makeTile(TileSuit.CHARACTER, 1),
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 3),
      // 88筒 (对子，将牌候选)
      makeTile(TileSuit.DOT, 8),
      makeTile(TileSuit.DOT, 8),
      // 56筒 (两面搭子)
      makeTile(TileSuit.DOT, 5),
      makeTile(TileSuit.DOT, 6),
      // 22条 (对子)
      makeTile(TileSuit.BAMBOO, 2),
      makeTile(TileSuit.BAMBOO, 2),
      // 46条 (坎张搭子)
      makeTile(TileSuit.BAMBOO, 4),
      makeTile(TileSuit.BAMBOO, 6),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null),
      // 9万 (孤牌)
      makeTile(TileSuit.CHARACTER, 9),
      // 摸到的 3 条 (与 22, 46 条复合)
      makeTile(TileSuit.BAMBOO, 3)
    ],
    river: [
      makeTile(TileSuit.CHARACTER, 9),
      makeTile(TileSuit.DOT, 9),
      makeTile(TileSuit.BAMBOO, 1)
    ],
    aiExplanation: '【解析】打出 9万 是绝对的最优解。9万 是纯粹的孤牌，且属于边张。打出 9万 后，手牌剩下一向听，因为有万能赖子红中的存在，手牌的有效进张面极其广泛（包括 4筒、7筒 升级筒子，或 2、3、5条 升级条子复合形态，或 5万 组成坎张等）。保留 9万 没有任何番型或效率收益。'
  },
  {
    id: 'ex_2',
    title: '听牌阶段的打法抉择',
    difficulty: 'medium',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式，第 8 巡，你刚刚摸入 2 筒。手牌已完成两个顺子，包含一个两面条子搭子，一对 7 条作为将牌，一个 112 筒的复合型搭子，以及一张万能红中。目前是一向听，打出一张牌即可听牌。应该打哪张牌才能让听牌的张数最大化？',
    round: 8,
    deckRemaining: 60,
    hand: [
      // 234筒 (顺子)
      makeTile(TileSuit.DOT, 2),
      makeTile(TileSuit.DOT, 3),
      makeTile(TileSuit.DOT, 4),
      // 456万 (顺子)
      makeTile(TileSuit.CHARACTER, 4),
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.CHARACTER, 6),
      // 112筒 (复合搭子，摸到 2筒)
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 2),
      // 34条 (两面搭子)
      makeTile(TileSuit.BAMBOO, 3),
      makeTile(TileSuit.BAMBOO, 4),
      // 77条 (将牌对子)
      makeTile(TileSuit.BAMBOO, 7),
      makeTile(TileSuit.BAMBOO, 7),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null)
    ],
    river: [
      makeTile(TileSuit.BAMBOO, 2),
      makeTile(TileSuit.BAMBOO, 5),
      makeTile(TileSuit.DOT, 1)
    ],
    aiExplanation: '【解析】最佳打法是打出 2筒。打出 2筒 后，手牌剩下 234筒、456万 顺子，11筒 和 77条 对子，34条 两面搭子，以及红中万能赖子。此时已经进入听牌（0向听），听牌范围包括 2条、5条（红中做面子，11筒或77条做将）以及 1筒、7条（红中做面子配对子凑刻子，留下另外一个对子做将）。这种多面听牌面极宽，可以听 4 种共 12 张牌。如果打出其他牌（如打出 7条 或 3/4条），会严重破坏将牌和搭子结构，导致有效进张数大幅降低。'
  },
  {
    id: 'ex_3',
    title: '红中杠麻：一向听的纯手牌规划',
    difficulty: 'medium',
    gameMode: 'hongzhong_gang',
    description: '在红中杠麻玩法中，红中不是万能牌，必须进行红中杠。本题不含红中，考查纯手牌的何切技巧。此时是第 6 巡，你刚摸到 7 条。手牌包含三个已完成面子（2万刻子、234筒顺子、567条顺子），一对 8 条作为将牌，一个 79 万坎张搭子，以及 1 张孤牌 9 筒。打哪张牌最优？',
    round: 6,
    deckRemaining: 72,
    hand: [
      // 222万 (刻子)
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 2),
      // 234筒 (顺子)
      makeTile(TileSuit.DOT, 2),
      makeTile(TileSuit.DOT, 3),
      makeTile(TileSuit.DOT, 4),
      // 88条 (将牌对子)
      makeTile(TileSuit.BAMBOO, 8),
      makeTile(TileSuit.BAMBOO, 8),
      // 79万 (坎张搭子)
      makeTile(TileSuit.CHARACTER, 7),
      makeTile(TileSuit.CHARACTER, 9),
      // 9筒 (孤牌)
      makeTile(TileSuit.DOT, 9),
      // 56条 (搭子) -> 摸到 7条 组成 567条 顺子
      makeTile(TileSuit.BAMBOO, 5),
      makeTile(TileSuit.BAMBOO, 6),
      makeTile(TileSuit.BAMBOO, 7)
    ],
    river: [
      makeTile(TileSuit.CHARACTER, 8),
      makeTile(TileSuit.DOT, 9)
    ],
    aiExplanation: '【解析】最优解是打出 9筒。手牌中已经完成了三个面子（222万、234筒、567条）和一对将牌（88条），目前处于一向听。剩下 79万 坎张和 9筒 孤牌。打出孤牌 9筒，保留 79万，只需摸到 8万 即可听牌，这是最直接且能维持最高向听数的一手。如果拆 79万 而保留 9筒，会使手牌的有效进张变小。'
  },
  {
    id: 'ex_4',
    title: '复杂复合形态与赖子复合搭子',
    difficulty: 'hard',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式，第 5 巡。手牌牌型较为杂乱，且有多组重叠搭子。你的手牌中有万能红中，且万字有 33456万 这一组复合形（33万对子 + 456万顺子）。你刚刚摸入 4 筒。为了保留进张最大化的听牌可能，应该如何打牌？',
    round: 5,
    deckRemaining: 82,
    hand: [
      // 33456万 (对子 + 顺子)
      makeTile(TileSuit.CHARACTER, 3),
      makeTile(TileSuit.CHARACTER, 3),
      makeTile(TileSuit.CHARACTER, 4),
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.CHARACTER, 6),
      // 4筒 (孤牌，摸到)
      makeTile(TileSuit.DOT, 4),
      // 12条 (边张搭子)
      makeTile(TileSuit.BAMBOO, 1),
      makeTile(TileSuit.BAMBOO, 2),
      // 78条 (两面搭子) -> 摸到 9条 组成 789条 顺子
      makeTile(TileSuit.BAMBOO, 7),
      makeTile(TileSuit.BAMBOO, 8),
      makeTile(TileSuit.BAMBOO, 9),
      // 78筒 (搭子)
      makeTile(TileSuit.DOT, 7),
      makeTile(TileSuit.DOT, 8),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null)
    ],
    river: [
      makeTile(TileSuit.BAMBOO, 3),
      makeTile(TileSuit.BAMBOO, 3)
    ],
    aiExplanation: '【解析】最佳出牌为 4筒。手牌中有两组顺子已成型（456万、789条），33万 是一对将牌。剩下的搭子有 12条（边张搭子）、78筒（两面搭子）、4筒（孤牌）以及红中（万能牌）。这是一向听形态。打出孤牌 4筒，可以保留所有搭子和将牌。由于红中可以当做 3条 凑成条子顺子，或者当做 6/9筒 凑成筒子顺子，打出 4筒 后进张极其广泛，可以随时听牌。如果拆 12条 或 78筒，会大幅损失进张速度。'
  },
  {
    id: 'ex_5',
    title: '红中杠麻：碰碰胡大单调方向选择',
    difficulty: 'hard',
    gameMode: 'hongzhong_gang',
    description: '在红中杠麻模式下，大单调（3倍番）和对对胡（2倍番）有极高的得分加成。第 9 巡，你的手牌有 5 对子，且有一组 89 万搭子、一组 78 筒搭子。此时你摸入 5 万。为了保留碰碰胡或大单调的战术可能性，应该如何打牌？',
    round: 9,
    deckRemaining: 55,
    hand: [
      // 5对子
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 5), // 摸到 5万 组成对子
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.DOT, 4),
      makeTile(TileSuit.DOT, 4),
      makeTile(TileSuit.BAMBOO, 6),
      makeTile(TileSuit.BAMBOO, 6),
      makeTile(TileSuit.BAMBOO, 8),
      makeTile(TileSuit.BAMBOO, 8),
      // 搭子 89万
      makeTile(TileSuit.CHARACTER, 8),
      makeTile(TileSuit.CHARACTER, 9),
      // 搭子 78筒
      makeTile(TileSuit.DOT, 7),
      makeTile(TileSuit.DOT, 8)
    ],
    river: [
      makeTile(TileSuit.CHARACTER, 7),
      makeTile(TileSuit.DOT, 6),
      makeTile(TileSuit.CHARACTER, 9)
    ],
    aiExplanation: '【解析】最佳出牌为 9万。手牌拥有 5 个对子（2万、5万、4筒、6条、8条），且 9万 已经打出过一张。打出 9万，拆掉 89万 这一组边张搭子，保留 8万 可以与手牌中的对子进行呼应。这样手牌能继续保留 5个对子 往对对胡（碰碰胡）方向靠拢，也可以在后续进张中灵活转换。如果拆筒子搭子，效率会偏低，且 9万 已见一张，价值进一步降低。'
  },
  {
    id: 'ex_6',
    title: '常规红中：清一色趋势下的精细舍牌',
    difficulty: 'medium',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式，第 7 巡，你刚摸到 9 筒。目前手牌除了赖子红中，全部是筒子牌型，清一色听牌在望。应该如何选择打牌以保留最大进张并规避不必要的多余搭子？',
    round: 7,
    deckRemaining: 66,
    hand: [
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 2),
      makeTile(TileSuit.DOT, 3),
      makeTile(TileSuit.DOT, 5),
      makeTile(TileSuit.DOT, 5),
      makeTile(TileSuit.DOT, 6),
      makeTile(TileSuit.DOT, 7),
      makeTile(TileSuit.DOT, 8),
      makeTile(TileSuit.DOT, 8),
      // 9筒 (孤牌，摸到)
      makeTile(TileSuit.DOT, 9),
      // 7筒 (孤牌)
      makeTile(TileSuit.DOT, 7),
      // 4筒 (孤牌)
      makeTile(TileSuit.DOT, 4),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null)
    ],
    river: [
      makeTile(TileSuit.DOT, 9),
      makeTile(TileSuit.BAMBOO, 1)
    ],
    aiExplanation: '【解析】最佳打出是 4筒。手牌中有 `5678` 构成的顺子复合形，`11`筒与`88`筒两个对子。孤牌有 `4筒` 和 `7筒` 以及新摸到的 `9筒`。打出 4筒 后，剩下 7筒 和 9筒 依然能与 88筒 组合成效率极高的连带搭子（如7889），且不会影响 11筒 和 55筒/678筒 的原本优势。保留 4筒 则是效率最低的孤牌。'
  },
  {
    id: 'ex_7',
    title: '红中杠麻：搭对复合抉择',
    difficulty: 'easy',
    gameMode: 'hongzhong_gang',
    description: '在红中杠麻无赖子模式下，第 4 巡，你刚摸到 4 条。手牌包含两个已完成顺子，一个将牌对子，两组孤牌和搭对复合形态。如何切牌能够保持最直接的向听数转换？',
    round: 4,
    deckRemaining: 79,
    hand: [
      // 123筒 (顺子)
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 2),
      makeTile(TileSuit.DOT, 3),
      // 567筒 (顺子)
      makeTile(TileSuit.DOT, 5),
      makeTile(TileSuit.DOT, 6),
      makeTile(TileSuit.DOT, 7),
      // 55万 (将牌)
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.CHARACTER, 5),
      // 244条 (搭对复合，摸到 4条)
      makeTile(TileSuit.BAMBOO, 2),
      makeTile(TileSuit.BAMBOO, 4),
      makeTile(TileSuit.BAMBOO, 4),
      // 78万 (两面搭子)
      makeTile(TileSuit.CHARACTER, 7),
      makeTile(TileSuit.CHARACTER, 8),
      // 9条 (孤牌)
      makeTile(TileSuit.BAMBOO, 9)
    ],
    river: [
      makeTile(TileSuit.BAMBOO, 9),
      makeTile(TileSuit.CHARACTER, 9)
    ],
    aiExplanation: '【解析】最佳出牌为 9条。9条 是纯粹的孤牌，且属于幺九边张。打出 9条 后，保留了 244条 的搭对复合型（进 3条 凑顺子，摸 4条 凑刻子）以及 78万 的两面搭子，手牌将以极高的效率冲刺听牌。'
  },
  {
    id: 'ex_8',
    title: '常规红中：三对子一向听的赖子取舍',
    difficulty: 'medium',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式，第 5 巡。手牌有红中作为赖子。手牌已完成两个顺子，但手里留有三个对子（33万、88筒、99条）和一个孤张 5 万。应该打出哪张牌以维持最大的听牌进张？',
    round: 5,
    deckRemaining: 75,
    hand: [
      // 123筒 (顺子)
      makeTile(TileSuit.DOT, 1),
      makeTile(TileSuit.DOT, 2),
      makeTile(TileSuit.DOT, 3),
      // 456条 (顺子)
      makeTile(TileSuit.BAMBOO, 4),
      makeTile(TileSuit.BAMBOO, 5),
      makeTile(TileSuit.BAMBOO, 6),
      // 33万 (对子)
      makeTile(TileSuit.CHARACTER, 3),
      makeTile(TileSuit.CHARACTER, 3),
      // 88筒 (对子)
      makeTile(TileSuit.DOT, 8),
      makeTile(TileSuit.DOT, 8),
      // 99条 (对子，摸到 9条)
      makeTile(TileSuit.BAMBOO, 9),
      makeTile(TileSuit.BAMBOO, 9),
      // 5万 (孤牌)
      makeTile(TileSuit.CHARACTER, 5),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null)
    ],
    river: [
      makeTile(TileSuit.CHARACTER, 5)
    ],
    aiExplanation: '【解析】最佳打法是打出 5万。打出 5万 这一孤牌后，手牌剩下三个对子（33万、88筒、99条）以及红中赖子。由于有红中赖子在，这手牌直接听牌，可以听 3万、8筒、9条。无论是哪张碰出或自摸到，都可以用红中作为另一个刻子或者将牌胡牌（对对胡或普通自摸），听牌张数非常可观。保留 5万 则是无效的一步。'
  },
  {
    id: 'ex_9',
    title: '红中杠麻：大单调将牌抉择',
    difficulty: 'hard',
    gameMode: 'hongzhong_gang',
    description: '在红中杠麻模式下，大单调有 3 倍得分加成。你已经碰了三组牌，此时是第 11 巡。你的底牌是 3条 和 8条。如果此时想要听大单调，需要权衡河面的已见牌来选择打出哪张听另外一张。请选择最优出牌。',
    round: 11,
    deckRemaining: 42,
    hand: [
      // 3条 (底牌)
      makeTile(TileSuit.BAMBOO, 3),
      // 8条 (底牌)
      makeTile(TileSuit.BAMBOO, 8)
    ],
    melds: [
      makeTile(TileSuit.DOT, 1), // 简化定义，组件只渲染数量
      makeTile(TileSuit.BAMBOO, 2),
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.CHARACTER, 6)
    ].map(t => ({ type: 'pong', tile: t })),
    river: [
      // 河面上有两张 8条 已被打出，而 3条 全未见
      makeTile(TileSuit.BAMBOO, 8),
      makeTile(TileSuit.BAMBOO, 8),
      makeTile(TileSuit.DOT, 9)
    ],
    aiExplanation: '【解析】最佳出牌是 8条（听 3条 的大单调）。在碰了 4 组牌后，手牌仅剩 2 张。打出一张将听另外一张的单调对子（大单调）。河面上 8条 已经打出了 2 张（牌堆最多剩 1 张），而 3条 在河面上全未见（牌堆最多剩 3 张）。因此，打出 8条 听 3条 的自摸概率高出三倍，这是基于概率学和已见牌的绝对科学决策。'
  },
  {
    id: 'ex_10',
    title: '常规红中：双龙抱柱一向听拆解',
    difficulty: 'hard',
    gameMode: 'hongzhong',
    description: '常规红中麻将模式，第 6 巡。手牌拥有 1233456万 的双龙抱柱复合顺子型。你刚刚摸到 6 万。应该打出哪张牌以维持最大的听牌进张概率并为后续优化将牌做准备？',
    round: 6,
    deckRemaining: 74,
    hand: [
      // 1233456万 (摸到6万)
      makeTile(TileSuit.CHARACTER, 1),
      makeTile(TileSuit.CHARACTER, 2),
      makeTile(TileSuit.CHARACTER, 3),
      makeTile(TileSuit.CHARACTER, 3),
      makeTile(TileSuit.CHARACTER, 4),
      makeTile(TileSuit.CHARACTER, 5),
      makeTile(TileSuit.CHARACTER, 6),
      // 789筒 (顺子)
      makeTile(TileSuit.DOT, 7),
      makeTile(TileSuit.DOT, 8),
      makeTile(TileSuit.DOT, 9),
      // 45条 (搭子)
      makeTile(TileSuit.BAMBOO, 4),
      makeTile(TileSuit.BAMBOO, 5),
      // 8条 (孤牌)
      makeTile(TileSuit.BAMBOO, 8),
      // 红中 (万能牌)
      makeTile(TileSuit.RED_ZHONG, null)
    ],
    river: [
      makeTile(TileSuit.BAMBOO, 8)
    ],
    aiExplanation: '【解析】最佳出牌为 8条。手牌中已经完成了 `123万`、`456万`、`789筒` 三个顺子。剩下 3万 孤牌、45条 两面搭子、8条 孤牌 以及红中赖子。这是一向听。打出 8条 孤牌是显然的最佳选择。3万 孤牌留在手里不仅可以充当将牌候选，还能在摸到 2万、4万 时与红中联动。'
  }
]
