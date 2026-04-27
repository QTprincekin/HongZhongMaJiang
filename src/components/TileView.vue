<template>
  <div
    class="tile"
    :class="[
      tileClass,
      {
        selected,
        small,
        mini,
        'meld-tile': meld,
        dimmed,
        'no-pointer': !clickable
      }
    ]"
    @click="clickable && $emit('click', tile)"
  >
    <img class="tile-img" :src="tileImageSrc" :alt="displayText" draggable="false" />
    <div v-if="count !== undefined && count > 0" class="tile-count">{{ count }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TileSuit } from '@/types'

// 预加载所有麻将牌 SVG 图片
const imageModules = import.meta.glob('../assets/MaJong-UI/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

const imageMap = new Map<string, string>()
for (const [path, url] of Object.entries(imageModules)) {
  const filename = path.split('/').pop()!.replace('.svg', '')
  imageMap.set(filename, url as string)
}

const props = withDefaults(defineProps<{
  tile: { suit: string; number: number | null; id: string }
  selected?: boolean
  small?: boolean
  mini?: boolean
  meld?: boolean
  dimmed?: boolean
  count?: number
}>(), {
  selected: false,
  small: false,
  mini: false,
  meld: false,
  dimmed: false,
})

defineEmits<{ click: [tile: any] }>()

const tileClass = computed(() => {
  const suit = props.tile.suit
  if (suit === TileSuit.DOT) return 'dot'
  if (suit === TileSuit.BAMBOO) return 'bamboo'
  if (suit === TileSuit.CHARACTER) return 'char'
  if (suit === TileSuit.RED_ZHONG) return 'redzhong'
  return 'dot'
})

const clickable = computed(() => !props.dimmed)

const displayText = computed(() => {
  if (props.tile.suit === TileSuit.RED_ZHONG) return '红中'
  return `${props.tile.number}${SUIT_NAMES[props.tile.suit] || ''}`
})

const SUIT_NAMES: Record<string, string> = {
  [TileSuit.DOT]: '筒',
  [TileSuit.BAMBOO]: '条',
  [TileSuit.CHARACTER]: '万',
}

// 根据花色和数字映射到对应图片
const tileImageSrc = computed(() => {
  const { suit, number } = props.tile
  if (suit === TileSuit.RED_ZHONG) {
    return imageMap.get('红中') || ''
  }
  const prefix = suit === TileSuit.DOT ? 'bing' : suit === TileSuit.BAMBOO ? 'tiao' : 'wan'
  return imageMap.get(`${prefix}-${number}`) || ''
})
</script>

<style scoped>
.tile {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  background: #1f2a48;
  color: #eaeaea;
  font-weight: bold;
  flex-shrink: 0;

  /* 3D 效果 */
  box-shadow:
    0 2px 4px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.1);
}

/* 花色背景 */
.tile.dot {
  background: linear-gradient(145deg, #0984e3, #0652dd);
}
.tile.bamboo {
  background: linear-gradient(145deg, #00b894, #00896b);
}
.tile.char {
  background: linear-gradient(145deg, #a55eea, #8854d0);
}
.tile.redzhong {
  background: linear-gradient(145deg, #ff4757, #c0392b);
}

/* 高光效果 */
.tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(to bottom, rgba(255,255,255,0.2), transparent);
  border-radius: 6px 6px 0 0;
  pointer-events: none;
}

/* 默认尺寸（手牌） */
.tile:not(.small):not(.mini):not(.meld-tile) {
  width: 58px;
  height: 72px;
  font-size: 24px;
}

/* 小尺寸（河面） */
.tile.small {
  width: 40px;
  height: 50px;
  font-size: 17px;
}

/* 极小（副露/听牌提示） */
.tile.mini {
  width: 34px;
  height: 42px;
  font-size: 14px;
}

/* 副露牌 */
.tile.meld-tile {
  width: 34px;
  height: 42px;
  font-size: 14px;
}

/* Hover - 手牌悬停 */
.tile:not(.dimmed):not(.no-pointer):hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow:
    0 8px 20px rgba(0,0,0,0.4),
    0 0 15px rgba(255,107,107,0.3);
}

/* 选中状态 */
.tile.selected {
  transform: translateY(-6px) scale(1.08);
  box-shadow:
    0 0 0 3px #ff6b6b,
    0 10px 25px rgba(255,107,107,0.4),
    0 0 20px rgba(255,107,107,0.3);
}

/* 不可点击 */
.tile.no-pointer {
  cursor: default;
}

/* 暗色 - 不可操作 */
.tile.dimmed {
  opacity: 0.35;
  cursor: not-allowed;
  filter: grayscale(40%);
}

.tile.dimmed:hover {
  transform: none;
  box-shadow:
    0 2px 4px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.1);
}

/* 牌面图片 */
.tile-img {
  width: 88%;
  height: 88%;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}

/* 剩余数量标记 */
.tile-count {
  position: absolute;
  bottom: -1px;
  right: -1px;
  font-size: 9px;
  background: rgba(0,0,0,0.75);
  color: #fff;
  border-radius: 4px 0 6px 0;
  padding: 0 3px;
  min-width: 14px;
  text-align: center;
  line-height: 14px;
  z-index: 2;
}

@media (max-width: 768px) {
  .tile:not(.small):not(.mini):not(.meld-tile) {
    width: 46px;
    height: 57px;
    font-size: 20px;
  }

  .tile.small {
    width: 32px;
    height: 40px;
    font-size: 14px;
  }

  .tile.mini,
  .tile.meld-tile {
    width: 28px;
    height: 35px;
    font-size: 12px;
  }

  .tile-count {
    font-size: 8px;
    padding: 0 2px;
    min-width: 12px;
    line-height: 12px;
  }
}

@media (max-width: 480px) {
  .tile:not(.small):not(.mini):not(.meld-tile) {
    width: 32px;
    height: 42px;
    font-size: 14px;
  }

  .tile.small {
    width: 24px;
    height: 30px;
    font-size: 10px;
  }

  .tile.mini,
  .tile.meld-tile {
    width: 20px;
    height: 26px;
    font-size: 9px;
  }
}
</style>
