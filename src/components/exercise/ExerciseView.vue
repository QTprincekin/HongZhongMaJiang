<template>
  <div class="exercise-view">
    <!-- 左侧关卡列表 -->
    <aside class="exercise-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">🎯 何切题库</span>
        <div class="header-actions">
          <button class="refresh-btn" @click="refreshExercises">🔄 换一批</button>
          <button class="back-btn" @click="$emit('back')">返回</button>
        </div>
      </div>

      <!-- 分类 Tabs -->
      <div class="category-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-btn"
          :class="{ active: currentTab === tab.value }"
          @click="selectTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 进度面板 -->
      <div class="progress-panel">
        <div class="progress-info">
          <span class="progress-label">通关进度</span>
          <span class="progress-val font-mono">{{ completedCount }}/{{ totalCount }}</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <div class="progress-stats" v-if="completedCount > 0">
          <span>平均分: <strong class="text-primary font-mono">{{ averageScore }}</strong> 分</span>
        </div>
      </div>

      <!-- 题目卡片列表 -->
      <div class="exercise-list">
        <div
          v-for="(ex, index) in exercisesList"
          :key="ex.id"
          class="exercise-card"
          :class="{ active: activeExerciseId === ex.id, completed: isCompleted(ex.id) }"
          @click="selectExercise(ex.id)"
        >
          <div class="card-top">
            <span class="difficulty-tag" :class="ex.difficulty">
              {{ difficultyLabel(ex.difficulty) }}
            </span>
            <span class="mode-tag" :class="ex.gameMode">
              {{ ex.gameMode === 'hongzhong_gang' ? '杠麻' : '常规' }}
            </span>
            <span v-if="isCompleted(ex.id)" class="score-badge" :class="getScoreClass(getScore(ex.id))">
              {{ getScore(ex.id) }}分
            </span>
          </div>
          <div class="card-title">{{ index + 1 }}. {{ ex.title }}</div>
          <div class="card-subtitle">{{ ex.hand.length }}张手牌 · 第{{ ex.round || 1 }}巡</div>
        </div>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="exercise-main">
      <div class="content-wrapper" v-if="activeExercise">
        <ExerciseDetail
          :key="activeExercise.id"
          :exercise="activeExercise"
          @next="selectNext"
          @back="$emit('back')"
          @save-score="saveExerciseScore"
        />
      </div>
      <div class="empty-detail-state" v-else>
        <span class="empty-icon">🀄</span>
        <h3>请选择一道何切题目开始练习</h3>
        <p>我们为你准备了 5 道精选的红中麻将何切题，涵盖赖子应用、复合搭子等经典决策场景。</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { exercises } from '@/data/exerciseData'
import ExerciseDetail from './ExerciseDetail.vue'
import type { Exercise } from '@/types'

defineEmits<{ back: [] }>()

const LOCAL_STORAGE_KEY = 'hzmj-exercise-scores'

// 题库列表
const exercisesList = ref<Exercise[]>([])
const activeExerciseId = ref('')

// 存储得分情况 { [exerciseId]: score }
const exerciseScores = ref<Record<string, number>>({})

// 分类 Tabs 定义
const currentTab = ref('all')
const tabs = [
  { label: '全部', value: 'all' },
  { label: '入门', value: 'easy' },
  { label: '进阶', value: 'hard' },
  { label: '传统赖子', value: 'hongzhong' },
  { label: '红中杠麻', value: 'hongzhong_gang' },
  { label: '读牌测验', value: 'quiz' }
]

const filteredAllExercises = computed(() => {
  return exercises.filter(ex => {
    if (currentTab.value === 'easy') return ex.difficulty === 'easy'
    if (currentTab.value === 'hard') return ex.difficulty === 'hard'
    if (currentTab.value === 'hongzhong') return ex.gameMode === 'hongzhong'
    if (currentTab.value === 'hongzhong_gang') return ex.gameMode === 'hongzhong_gang'
    if (currentTab.value === 'quiz') return ex.id === 'ex_9' || ex.title.includes('读牌')
    return true
  })
})

function selectTab(value: string) {
  currentTab.value = value
  refreshExercises()
}

function refreshExercises() {
  const source = filteredAllExercises.value
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  exercisesList.value = shuffled.slice(0, 5)
  if (exercisesList.value.length > 0) {
    if (!exercisesList.value.some(e => e.id === activeExerciseId.value)) {
      activeExerciseId.value = exercisesList.value[0].id
    }
  } else {
    activeExerciseId.value = ''
  }
}

onMounted(() => {
  refreshExercises()
  loadScores()
})

const activeExercise = computed(() => {
  return exercisesList.value.find(e => e.id === activeExerciseId.value) || null
})

// 进度统计
const totalCount = computed(() => exercisesList.value.length)
const completedCount = computed(() => {
  return Object.keys(exerciseScores.value).filter(id => exercisesList.value.some(e => e.id === id)).length
})
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

const averageScore = computed(() => {
  const keys = Object.keys(exerciseScores.value).filter(id => exercisesList.value.some(e => e.id === id))
  if (keys.length === 0) return 0
  const sum = keys.reduce((s, id) => s + exerciseScores.value[id], 0)
  return Math.round(sum / keys.length)
})

function selectExercise(id: string) {
  activeExerciseId.value = id
}

function selectNext() {
  const currentIndex = exercisesList.value.findIndex(e => e.id === activeExerciseId.value)
  if (currentIndex !== -1 && currentIndex < exercisesList.value.length - 1) {
    activeExerciseId.value = exercisesList.value[currentIndex + 1].id
  } else {
    // 最后一题作答后，切回第一题或提示
    activeExerciseId.value = exercisesList.value[0].id
  }
}

// 成绩存储与获取
function saveExerciseScore(id: string, score: number) {
  // 仅保存最高分
  const currentMax = exerciseScores.value[id] || 0
  if (score > currentMax) {
    exerciseScores.value[id] = score
    saveScores()
  }
}

function getScore(id: string): number {
  return exerciseScores.value[id] || 0
}

function isCompleted(id: string): boolean {
  return exerciseScores.value[id] !== undefined
}

function loadScores() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      exerciseScores.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载习题成绩失败', e)
  }
}

function saveScores() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(exerciseScores.value))
  } catch (e) {
    console.error('保存习题成绩失败', e)
  }
}

// 辅助函数
function difficultyLabel(diff: string) {
  return { easy: '入门', medium: '中等', hard: '进阶' }[diff] || diff
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 60) return 'good'
  return 'needs-improvement'
}
</script>

<style scoped>
.exercise-view {
  display: flex;
  height: calc(100vh - 65px); /* 扣除顶部导航的高度 */
  overflow: hidden;
  background: var(--color-bg);
}

/* 左侧栏 */
.exercise-sidebar {
  width: 320px;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 分类 Tabs */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.01);
}

.tab-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 10px rgba(255, 94, 94, 0.25);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  font-size: var(--text-base);
  font-weight: 800;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.refresh-btn {
  padding: 4px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
}
.refresh-btn:hover {
  background: #ff4141;
  transform: scale(1.02);
}

.back-btn {
  padding: 4px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 进度面板 */
.progress-panel {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(26, 28, 46, 0.2);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  margin-bottom: 8px;
}

.progress-label {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.progress-val {
  color: var(--color-text);
  font-weight: 800;
}

.progress-bar-bg {
  height: 6px;
  background: var(--color-border-light);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-stats {
  margin-top: 10px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* 列表区 */
.exercise-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exercise-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.exercise-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: var(--color-primary);
  transition: width 0.15s;
}

.exercise-card:hover {
  background: var(--color-card-hover);
  border-color: var(--color-border-light);
  transform: translateX(2px);
}

.exercise-card.active {
  border-color: var(--color-primary);
  background: rgba(255, 94, 94, 0.04);
}

.exercise-card.active::after {
  width: 4px;
}

.card-top {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.difficulty-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
}
.difficulty-tag.easy { background: rgba(61, 217, 192, 0.1); color: var(--color-success); }
.difficulty-tag.medium { background: rgba(247, 201, 72, 0.1); color: var(--color-accent); }
.difficulty-tag.hard { background: rgba(255, 71, 87, 0.1); color: var(--color-danger); }

.mode-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-border-light);
  color: var(--color-text-secondary);
}
.mode-tag.hongzhong_gang {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-purple);
}

.score-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: auto;
}
.score-badge.excellent { background: rgba(61, 217, 192, 0.15); color: var(--color-success); }
.score-badge.good { background: rgba(247, 201, 72, 0.15); color: var(--color-accent); }
.score-badge.needs-improvement { background: rgba(255, 71, 87, 0.15); color: var(--color-danger); }

.card-title {
  font-size: var(--text-sm);
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 4px;
  line-height: 1.4;
}

.card-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* 右侧主栏 */
.exercise-main {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
  padding: 20px 28px;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

.empty-detail-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  text-align: center;
  max-width: 450px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));
}

.empty-detail-state h3 {
  font-size: var(--text-base);
  color: var(--color-text);
  margin-bottom: 8px;
  font-weight: 800;
}

.empty-detail-state p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .exercise-view {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .exercise-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .exercise-main {
    padding: 16px;
  }
}
</style>
