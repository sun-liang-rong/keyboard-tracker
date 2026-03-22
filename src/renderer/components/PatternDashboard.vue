<template>
  <div class="pattern-dashboard space-y-6">
    <!-- 实时模式指示器 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">当前行为模式</h3>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          窗口: {{ currentWindowInfo?.appName || '未知' }}
        </div>
      </div>
      <PatternIndicator
        :pattern="currentPattern"
        :duration="currentDuration"
        :current-app="currentWindowInfo?.appName"
      />
    </div>

    <!-- 模式分布和报告 -->
    <PatternReport
      :pattern-summary="patternSummary"
      :slack-alert="slackAlert"
      :gaming-analysis="gamingAnalysis"
    />

    <!-- 模式历史时间线 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">今日模式时间线</h3>
      <div class="space-y-2">
        <div
          v-for="(item, index) in patternHistory"
          :key="index"
          class="flex items-center gap-4 p-3 rounded-lg transition-colors"
          :class="getHistoryItemClass(item.pattern)"
        >
          <div class="text-lg">{{ getPatternIcon(item.pattern) }}</div>
          <div class="flex-1">
            <div class="text-sm font-medium">{{ getPatternLabel(item.pattern) }}</div>
            <div class="text-xs opacity-70">{{ item.appName }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium">{{ formatDuration(item.duration) }}</div>
            <div class="text-xs opacity-70">{{ formatTime(item.startTime) }} - {{ formatTime(item.endTime) }}</div>
          </div>
        </div>
        <div v-if="patternHistory.length === 0" class="text-center text-gray-500 dark:text-gray-400 py-8">
          暂无模式历史数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PatternIndicator from './PatternIndicator.vue'
import PatternReport from './PatternReport.vue'

// 行为模式类型
enum BehaviorPattern {
  WORK = 'work',
  SLACK = 'slack',
  GAMING = 'gaming',
  IDLE = 'idle'
}

interface PatternSummary {
  work: { duration: number; percentage: number }
  slack: { duration: number; percentage: number }
  gaming: { duration: number; percentage: number }
  idle: { duration: number; percentage: number }
}

interface PatternStats {
  pattern: BehaviorPattern | string
  startTime: number
  endTime: number
  duration: number
  keyCount: number
  appName: string
}

interface WindowInfo {
  appName: string
  bundleId?: string
  windowTitle: string
  timestamp: number
}

interface SlackAlert {
  isAbnormal: boolean
  slackDuration: number
  workDuration: number
  suggestion: string
}

interface GamingAnalysis {
  gamingTime: number
  postGamingEfficiency: number
  recommendation: string
}

// 响应式数据
const currentPattern = ref<BehaviorPattern | string>(BehaviorPattern.IDLE)
const currentPatternStartTime = ref(Date.now())
const patternSummary = ref<PatternSummary>({
  work: { duration: 0, percentage: 0 },
  slack: { duration: 0, percentage: 0 },
  gaming: { duration: 0, percentage: 0 },
  idle: { duration: 0, percentage: 0 }
})
const patternHistory = ref<PatternStats[]>([])
const slackAlert = ref<SlackAlert>({
  isAbnormal: false,
  slackDuration: 0,
  workDuration: 0,
  suggestion: ''
})
const gamingAnalysis = ref<GamingAnalysis>({
  gamingTime: 0,
  postGamingEfficiency: 100,
  recommendation: ''
})
const currentWindowInfo = ref<WindowInfo | null>(null)

// 当前模式持续时间
const currentDuration = computed(() => {
  return Date.now() - currentPatternStartTime.value
})

// 定时更新数据
let updateInterval: number | null = null

// 模式配置
const patternConfig = {
  [BehaviorPattern.WORK]: {
    label: '工作模式',
    icon: '💼',
    class: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
  },
  [BehaviorPattern.SLACK]: {
    label: '摸鱼模式',
    icon: '🐟',
    class: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
  },
  [BehaviorPattern.GAMING]: {
    label: '游戏模式',
    icon: '🎮',
    class: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  },
  [BehaviorPattern.IDLE]: {
    label: '空闲模式',
    icon: '☕',
    class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }
}

function getPatternIcon(pattern: BehaviorPattern | string): string {
  return patternConfig[pattern as BehaviorPattern]?.icon || '❓'
}

function getPatternLabel(pattern: BehaviorPattern | string): string {
  return patternConfig[pattern as BehaviorPattern]?.label || '未知模式'
}

function getHistoryItemClass(pattern: BehaviorPattern | string): string {
  return patternConfig[pattern as BehaviorPattern]?.class || ''
}

// 格式化时间
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化持续时间
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

// 更新模式数据
async function updatePatternData() {
  try {
    // 获取模式汇总
    const summary = await window.electronAPI.getPatternSummary()
    patternSummary.value = summary

    // 获取模式历史
    const history = await window.electronAPI.getPatternHistory()
    patternHistory.value = history.slice(-20).reverse() // 显示最近20条，倒序

    // 获取摸鱼检测
    const alert = await window.electronAPI.detectSlackDuringWork()
    slackAlert.value = alert

    // 获取游戏影响分析
    const analysis = await window.electronAPI.analyzeGamingImpact()
    gamingAnalysis.value = analysis
  } catch (error) {
    console.error('Failed to update pattern data:', error)
  }
}

// 监听模式变化
function handlePatternChange(data: { pattern: BehaviorPattern | string; stats: PatternStats }) {
  currentPattern.value = data.pattern
  currentPatternStartTime.value = Date.now()

  // 添加到历史
  patternHistory.value.unshift(data.stats)
  if (patternHistory.value.length > 20) {
    patternHistory.value.pop()
  }
}

// 监听窗口变化
function handleWindowChange(data: WindowInfo) {
  currentWindowInfo.value = data
}

// 组件挂载
onMounted(() => {
  // 初始化数据
  updatePatternData()

  // 定时更新（每30秒）
  updateInterval = window.setInterval(updatePatternData, 30000)

  // 监听模式变化
  window.electronAPI.onPatternChanged((data) => {
    handlePatternChange(data)
  })

  // 监听窗口变化
  window.electronAPI.onWindowChange((data) => {
    handleWindowChange(data)
  })
})

// 组件卸载
onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>
