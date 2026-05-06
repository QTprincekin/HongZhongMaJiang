<template>
  <div class="tile-group-demo">
    <div v-if="label" class="demo-label">{{ label }}</div>
    <div class="demo-tiles">
      <TileView
        v-for="tile in tiles"
        :key="tile.id"
        :tile="tile"
        :class="{ highlight: highlightIds?.includes(tile.id) }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '@/types'
import TileView from '@/components/TileView.vue'

defineProps<{
  tiles: Tile[]
  label?: string
  highlightIds?: string[]
}>()
</script>

<style scoped>
.tile-group-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin: 12px 0;
}

.demo-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.demo-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.demo-tiles :deep(.tile.highlight) {
  box-shadow: 0 0 0 3px var(--color-gold), 0 6px 16px rgba(247, 201, 72, 0.35);
  transform: translateY(-2px);
}
</style>
