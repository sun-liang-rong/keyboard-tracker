<template>
  <div class="pattern-chart">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <h3 class="text-base font-medium text-gray-900 dark:text-white">行为模式分布</h3>
      <div class="flex gap-2 mt-2 sm:mt-0">
        <button
          @click="chartType = 'pie'"
          :class="chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          饼图
        </button>
        <button
          @click="chartType = 'bar'"
          :class="chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          柱状图
        </button>
      </div>
    </div>

    <!-- 饼图 -->
    <div v-if="chartType === 'pie'" class="flex flex-col sm:flex-row items-center gap-6">
      <div class="relative w-40 h-40">
        <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
          <circle
            v-for="(slice, index) in pieSlices"
            :key="index"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="slice.color"
            stroke-width="20"
            :stroke-dasharray="slice.dashArray"
            :stroke-dashoffset="slice.dashOffset"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">今日</div>
            <div class="text-lg font-bold text-gray-900 dark:text-white">{{ totalDurationText }}</div>
          </div>
        </div>
      </div>
      <div class="flex-1 space-y-2">
        <div
          v-for="item in patternData"
          :key="item.pattern"
          class="flex items-center gap-2"
        >
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: item.color }"
          ></div>
          <span class="text-sm text-gray-600 dark:text-gray-400 flex-1">{{ item.label }}</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDuration(item.duration) }}</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">({{ item.percentage }}%)</span>
        </div>
      </div>
    </div>

    <!-- 柱状图 -->
    <div v-else class="space-y-3">
      <div
        v-for="item in patternData"
        :key="item.pattern"
        class="flex items-center gap-3"
      >
        <div class="w-20 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{{ item.label }}</div>
        <div class="flex-1">
          <div class="h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
              :style="{ width: Math.max(item.percentage, 5) + '%', backgroundColor: item.color }"
            >
              <span v-if="item.percentage > 15" class="text-xs text-white font-medium">{{ item.percentage }}%</span>
            </div>
          </div>
        </div>
        <div class="w-24 text-right text-sm">
          <span class="font-semibold text-gray-900 dark:text-white">{{ formatDuration(item.duration) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

interface Props {
  patternSummary: PatternSummary
}

const props = defineProps<Props>()
const chartType = ref<'pie' | 'bar'>('pie')

const patternConfig = {
  [BehaviorPattern.WORK]: { label: '工作', color: '#10B981' },    // green-500
  [BehaviorPattern.SLACK]: { label: '摸鱼', color: '#F59E0B' },   // amber-500
  [BehaviorPattern.GAMING]: { label: '游戏', color: '#EF4444' },  // red-500
  [BehaviorPattern.IDLE]: { label: '空闲', color: '#9CA3AF' },    // gray-400
}

const patternData = computed(() => {
  const summary = props.patternSummary
  const patterns = [
    { pattern: BehaviorPattern.WORK, ...summary.work },
    { pattern: BehaviorPattern.SLACK, ...summary.slack },
    { pattern: BehaviorPattern.GAMING, ...summary.gaming },
    { pattern: BehaviorPattern.IDLE, ...summary.idle },
  ]

  return patterns
    .filter(p => p.duration > 0)
    .map(p => ({
      pattern: p.pattern,
      label: patternConfig[p.pattern as BehaviorPattern]?.label || p.pattern,
      duration: p.duration,
      percentage: p.percentage,
      color: patternConfig[p.pattern as BehaviorPattern]?.color || '#9CA3AF'
    }))
    .sort((a, b) => b.duration - a.duration)
})

const totalDuration = computed(() => {
  return Object.values(props.patternSummary).reduce((sum, item) => sum + item.duration, 0)
})

const totalDurationText = computed(() => {
  const hours = Math.floor(totalDuration.value / 3600000)
  const minutes = Math.floor((totalDuration.value % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}h${minutes}m`
  }
  return `${minutes}m`
})

// 计算饼图的 slice 数据
const pieSlices = computed(() => {
  const total = totalDuration.value
  if (total === 0) return []

  const radius = 40
  const circumference = 2 * Math.PI * radius
  let currentOffset = 0

  return patternData.value.map((item) => {
    const percentage = item.duration / total
    const dashArray = percentage * circumference
    const dashOffset = currentOffset
    currentOffset -= dashArray

    return {
      color: item.color,
      dashArray: `${dashArray} ${circumference}`,
      dashOffset: dashOffset,
    }
  })
})

// 格式化持续时间
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) {
    return `${hours}小时${minutes}分`
  }
  return `${minutes}分钟`
}
</script>
