<template>
  <div class="pattern-report space-y-6">
    <!-- 今日行为模式占比 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">📊 今日行为模式占比</h3>
      <PatternChart :pattern-summary="patternSummary" />
    </div>

    <!-- 各模式累计时长 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">⏱️ 各模式累计时长</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="item in durationCards"
          :key="item.pattern"
          class="rounded-lg p-4 text-center"
          :class="item.bgClass"
        >
          <div class="text-2xl mb-1">{{ item.icon }}</div>
          <div class="text-sm font-medium opacity-80">{{ item.label }}</div>
          <div class="text-xl font-bold">{{ item.duration }}</div>
        </div>
      </div>
    </div>

    <!-- 工作效率评分 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">📈 工作效率评分</h3>
      <div class="flex items-center gap-6">
        <div class="relative">
          <svg viewBox="0 0 100 100" class="w-32 h-32">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#E5E7EB"
              stroke-width="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              :stroke="efficiencyColor"
              stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray="283"
              :stroke-dashoffset="283 - (283 * efficiencyScore) / 100"
              transform="rotate(-90 50 50)"
              class="transition-all duration-1000"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <div class="text-3xl font-bold" :class="efficiencyTextColor">{{ efficiencyScore }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">分</div>
            </div>
          </div>
        </div>
        <div class="flex-1">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {{ efficiencyDescription }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            基于工作时长占总活跃时间的比例计算
          </div>
        </div>
      </div>
    </div>

    <!-- 异常行为提醒 -->
    <div
      v-if="slackAlert.isAbnormal"
      class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-6 shadow-sm"
    >
      <div class="flex items-start gap-3">
        <span class="text-2xl">⚠️</span>
        <div class="flex-1">
          <h3 class="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            异常行为提醒
          </h3>
          <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            {{ slackAlert.suggestion }}
          </p>
          <div class="text-xs text-yellow-600 dark:text-yellow-400">
            摸鱼时长: {{ formatDuration(slackAlert.slackDuration) }},
            工作时长: {{ formatDuration(slackAlert.workDuration) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏影响分析 -->
    <div
      v-if="gamingAnalysis.gamingTime > 0"
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-6 shadow-sm"
    >
      <div class="flex items-start gap-3">
        <span class="text-2xl">🎮</span>
        <div class="flex-1">
          <h3 class="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">
            游戏影响分析
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-300 mb-2">
            {{ gamingAnalysis.recommendation }}
          </p>
          <div class="grid grid-cols-2 gap-4 mt-3">
            <div class="text-xs">
              <span class="text-blue-600 dark:text-blue-400">游戏时长:</span>
              <span class="font-medium text-blue-800 dark:text-blue-200">{{ formatDuration(gamingAnalysis.gamingTime) }}</span>
            </div>
            <div class="text-xs">
              <span class="text-blue-600 dark:text-blue-400">游戏后效率:</span>
              <span class="font-medium text-blue-800 dark:text-blue-200">{{ gamingAnalysis.postGamingEfficiency }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 个性化建议 -->
    <div class="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-6 shadow-sm">
      <div class="flex items-start gap-3">
        <span class="text-2xl">💡</span>
        <div class="flex-1">
          <h3 class="text-lg font-medium text-green-800 dark:text-green-200 mb-2">
            个性化建议
          </h3>
          <ul class="space-y-2 text-sm text-green-700 dark:text-green-300">
            <li v-for="(suggestion, index) in suggestions" :key="index" class="flex items-start gap-2">
              <span class="mt-1">•</span>
              <span>{{ suggestion }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PatternChart from './PatternChart.vue'

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

interface Props {
  patternSummary: PatternSummary
  slackAlert: SlackAlert
  gamingAnalysis: GamingAnalysis
}

const props = defineProps<Props>()

// 模式配置
const patternConfig = {
  [BehaviorPattern.WORK]: { label: '工作', icon: '💼', bgClass: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  [BehaviorPattern.SLACK]: { label: '摸鱼', icon: '🐟', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' },
  [BehaviorPattern.GAMING]: { label: '游戏', icon: '🎮', bgClass: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
  [BehaviorPattern.IDLE]: { label: '空闲', icon: '☕', bgClass: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
}

// 各模式时长卡片
const durationCards = computed(() => {
  const summary = props.patternSummary
  return [
    { pattern: BehaviorPattern.WORK, ...summary.work },
    { pattern: BehaviorPattern.SLACK, ...summary.slack },
    { pattern: BehaviorPattern.GAMING, ...summary.gaming },
    { pattern: BehaviorPattern.IDLE, ...summary.idle },
  ].map(p => ({
    pattern: p.pattern,
    label: patternConfig[p.pattern as BehaviorPattern]?.label || p.pattern,
    icon: patternConfig[p.pattern as BehaviorPattern]?.icon || '❓',
    bgClass: patternConfig[p.pattern as BehaviorPattern]?.bgClass || '',
    duration: formatDuration(p.duration)
  }))
})

// 效率评分
const efficiencyScore = computed(() => {
  const { work, slack, gaming } = props.patternSummary
  const activeTime = work.duration + slack.duration + gaming.duration
  if (activeTime === 0) return 0
  const workRatio = work.duration / activeTime
  return Math.round(workRatio * 100)
})

const efficiencyColor = computed(() => {
  const score = efficiencyScore.value
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
})

const efficiencyTextColor = computed(() => {
  const score = efficiencyScore.value
  if (score >= 80) return 'text-green-500'
  if (score >= 60) return 'text-yellow-500'
  return 'text-red-500'
})

const efficiencyDescription = computed(() => {
  const score = efficiencyScore.value
  if (score >= 80) return '工作效率很高！保持专注的状态'
  if (score >= 60) return '工作效率良好，还有提升空间'
  if (score >= 40) return '工作效率一般，注意减少分心'
  return '工作效率较低，建议调整工作习惯'
})

// 个性化建议
const suggestions = computed(() => {
  const suggestions: string[] = []
  const { work, slack, gaming } = props.patternSummary

  // 基于工作时长
  if (work.duration < 2 * 3600000) {
    suggestions.push('今日工作时长较短，建议合理安排工作任务')
  } else if (work.duration > 8 * 3600000) {
    suggestions.push('今日工作时长较长，注意适当休息，保护身体健康')
  }

  // 基于摸鱼时长
  if (slack.duration > 2 * 3600000) {
    suggestions.push('摸鱼时间过长，建议使用番茄工作法提高专注度')
  }

  // 基于游戏时长
  if (gaming.duration > 3 * 3600000) {
    suggestions.push('游戏时间较长，建议控制游戏时间，保持工作生活平衡')
  } else if (gaming.duration > 0 && props.gamingAnalysis.postGamingEfficiency < 50) {
    suggestions.push('游戏后工作效率较低，建议游戏后适当休息再开始工作')
  }

  // 基于工作时段分布
  if (work.duration > 0 && suggestions.length === 0) {
    suggestions.push('今日工作状态良好，继续保持！')
  }

  return suggestions
})

// 格式化持续时间
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
</script>
