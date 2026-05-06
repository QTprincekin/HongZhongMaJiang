<template>
  <nav class="tutorial-nav">
    <div class="nav-header">
      <span class="nav-icon">📚</span>
      <span class="nav-title">红中麻将教程</span>
    </div>

    <div class="nav-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <span class="progress-text">{{ progressPercent }}%</span>
    </div>

    <div class="chapter-list">
      <div
        v-for="chapter in chapters"
        :key="chapter.id"
        class="chapter-item"
        :class="{ active: chapter.id === activeChapterId }"
      >
        <div
          class="chapter-title"
          @click="$emit('select-chapter', chapter.id)"
        >
          <span class="chapter-icon">{{ chapter.icon }}</span>
          <span class="chapter-name">{{ chapter.title }}</span>
        </div>
        <div
          v-if="chapter.id === activeChapterId"
          class="section-list"
        >
          <div
            v-for="section in chapter.sections"
            :key="section.id"
            class="section-item"
            :class="{ active: section.id === activeSectionId }"
            @click="$emit('select-section', section.id)"
          >
            {{ section.title }}
          </div>
        </div>
      </div>
    </div>

    <div class="nav-footer">
      <slot name="footer" />
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { TutorialChapter } from '@/types'

defineProps<{
  chapters: TutorialChapter[]
  activeChapterId: string
  activeSectionId: string
  progressPercent: number
}>()

defineEmits<{
  'select-chapter': [chapterId: string]
  'select-section': [sectionId: string]
}>()
</script>

<style scoped>
.tutorial-nav {
  display: flex;
  flex-direction: column;
  width: 260px;
  min-width: 260px;
  height: 100%;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px 14px;
  border-bottom: 1px solid var(--color-border);
}

.nav-icon {
  font-size: 22px;
}

.nav-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.3px;
}

.nav-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border);
}

.progress-bar {
  flex: 1;
  height: 5px;
  background: var(--color-card);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-success);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  font-family: 'JetBrains Mono', monospace;
  min-width: 32px;
  text-align: right;
}

.chapter-list {
  flex: 1;
  padding: 8px 0;
}

.chapter-item {
  margin: 2px 8px;
  border-radius: 8px;
  overflow: hidden;
  transition: background 0.15s;
}

.chapter-item.active {
  background: rgba(255, 94, 94, 0.08);
}

.chapter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.15s;
}

.chapter-title:hover {
  background: var(--color-card);
}

.chapter-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
}

.chapter-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.chapter-item.active .chapter-name {
  color: var(--color-primary);
}

.section-list {
  padding: 2px 0 6px 38px;
}

.section-item {
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
  border-left: 2px solid transparent;
}

.section-item:hover {
  color: var(--color-text);
  background: var(--color-card);
}

.section-item.active {
  color: var(--color-primary);
  background: rgba(255, 94, 94, 0.08);
  border-left-color: var(--color-primary);
  font-weight: 700;
}

.nav-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .tutorial-nav {
    width: 100%;
    min-width: auto;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}
</style>
