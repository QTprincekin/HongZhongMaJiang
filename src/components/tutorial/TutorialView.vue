<template>
  <div class="tutorial-view">
    <TutorialNav
      :chapters="chapters"
      :active-chapter-id="activeChapterId"
      :active-section-id="activeSectionId"
      :progress-percent="progressPercent"
      @select-chapter="onSelectChapter"
      @select-section="onSelectSection"
    >
      <template #footer>
        <button class="back-to-game" @click="$emit('back')">
          ← 返回训练
        </button>
      </template>
    </TutorialNav>

    <main class="tutorial-main" ref="mainRef">
      <div class="content-scroll">
        <div class="section-header">
          <div class="breadcrumb">
            <span class="bc-chapter">{{ activeChapter?.icon }} {{ activeChapter?.title }}</span>
            <span class="bc-sep">/</span>
            <span class="bc-section">{{ activeSection?.title }}</span>
          </div>
          <div class="section-nav">
            <button
              v-if="prevSection"
              class="nav-btn prev"
              @click="onSelectSection(prevSection.id)"
            >
              ← {{ prevSection.title }}
            </button>
            <button
              v-if="nextSection"
              class="nav-btn next"
              @click="onSelectSection(nextSection.id)"
            >
              {{ nextSection.title }} →
            </button>
          </div>
        </div>

        <TutorialContent v-if="activeSection" :blocks="activeSection.blocks" />

        <div v-if="nextSection" class="section-footer">
          <button class="next-section-btn" @click="onSelectSection(nextSection.id)">
            下一节：{{ nextSection.title }} →
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { tutorialChapters } from '@/data/tutorialData'
import TutorialNav from './TutorialNav.vue'
import TutorialContent from './TutorialContent.vue'

defineEmits<{ back: [] }>()

const chapters = tutorialChapters
const activeChapterId = ref(chapters[0].id)
const activeSectionId = ref(chapters[0].sections[0].id)
const mainRef = ref<HTMLElement | null>(null)

const activeChapter = computed(() => chapters.find(c => c.id === activeChapterId.value))
const activeSection = computed(() => {
  for (const c of chapters) {
    const s = c.sections.find(sec => sec.id === activeSectionId.value)
    if (s) return s
  }
  return null
})

const allSections = computed(() => chapters.flatMap(c => c.sections.map(s => ({ ...s, chapterId: c.id }))))
const currentIndex = computed(() => allSections.value.findIndex(s => s.id === activeSectionId.value))

const prevSection = computed(() => currentIndex.value > 0 ? allSections.value[currentIndex.value - 1] : null)
const nextSection = computed(() => currentIndex.value < allSections.value.length - 1 ? allSections.value[currentIndex.value + 1] : null)

const progressPercent = computed(() => {
  const total = allSections.value.length
  if (total === 0) return 0
  const completed = currentIndex.value + 1
  return Math.round((completed / total) * 100)
})

function onSelectChapter(chapterId: string) {
  activeChapterId.value = chapterId
  const chapter = chapters.find(c => c.id === chapterId)
  if (chapter && chapter.sections.length > 0) {
    activeSectionId.value = chapter.sections[0].id
  }
  scrollToTop()
}

function onSelectSection(sectionId: string) {
  activeSectionId.value = sectionId
  const chapter = chapters.find(c => c.sections.some(s => s.id === sectionId))
  if (chapter) activeChapterId.value = chapter.id
  scrollToTop()
}

function scrollToTop() {
  nextTick(() => {
    if (mainRef.value) mainRef.value.scrollTop = 0
  })
}
</script>

<style scoped>
.tutorial-view {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

.tutorial-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.content-scroll {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.bc-chapter {
  font-weight: 700;
  color: var(--color-primary);
}

.bc-sep {
  opacity: 0.5;
}

.bc-section {
  font-weight: 600;
}

.section-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 6px 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.section-footer {
  padding: 20px 28px 40px;
  display: flex;
  justify-content: center;
}

.next-section-btn {
  padding: 12px 28px;
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(255, 94, 94, 0.35);
}

.next-section-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 94, 94, 0.45);
}

.back-to-game {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.back-to-game:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(255, 94, 94, 0.06);
}

@media (max-width: 768px) {
  .tutorial-view {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .tutorial-main {
    overflow: visible;
  }

  .section-header {
    padding: 16px 16px 0;
  }
}
</style>
