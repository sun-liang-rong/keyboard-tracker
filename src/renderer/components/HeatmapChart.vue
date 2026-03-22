<template>
  <div class="w-full">
    <!-- 月份标题和图例 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">
          {{ monthName }}
        </h3>
        <span class="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
          {{ activeDays }} 天活跃
        </span>
      </div>
      <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>少</span>
        <div class="flex gap-1">
          <div class="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>
          <div class="w-4 h-4 rounded bg-blue-200 dark:bg-blue-900"></div>
          <div class="w-4 h-4 rounded bg-blue-400 dark:bg-blue-700"></div>
          <div class="w-4 h-4 rounded bg-blue-600 dark:bg-blue-500"></div>
          <div class="w-4 h-4 rounded bg-blue-800 dark:bg-blue-300"></div>
        </div>
        <span>多</span>
      </div>
    </div>

    <!-- 星期标签 -->
    <div class="flex gap-1 mb-2">
      <div class="w-10"></div>
      <div class="flex-1 grid" :style="{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }">
        <div
          v-for="(label, index) in weekLabels"
          :key="index"
          class="text-xs text-gray-400 dark:text-gray-500 text-left pl-1"
        >
          {{ label }}
        </div>
      </div>
    </div>

    <!-- 热力图主体 -->
    <div class="flex gap-1">
      <!-- 星期标签列 -->
      <div class="flex flex-col gap-1 w-10">
        <div
          v-for="day in ['日', '一', '二', '三', '四', '五', '六']"
          :key="day"
          class="h-8 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end pr-2"
        >
          {{ day }}
        </div>
      </div>

      <!-- 数据网格 - 按星期几分组 -->
      <div class="flex-1 grid gap-1" :style="{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }">
        <!-- 每一列是一周 -->
        <div v-for="weekIndex in weekCount" :key="weekIndex" class="flex flex-col gap-1">
          <div
            v-for="dayOfWeek in 7"
            :key="dayOfWeek"
            :class="getCellClass(getDayDataCached(weekIndex - 1, dayOfWeek - 1))"
            class="h-8 rounded-md transition-all duration-200 relative group"
          >
            <!-- 悬停提示 -->
            <div
              v-if="getDayDataCached(weekIndex - 1, dayOfWeek - 1)"
              class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
            >
              {{ getTooltip(getDayDataCached(weekIndex - 1, dayOfWeek - 1)) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计信息卡片 -->
    <div class="mt-6 grid grid-cols-3 gap-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">本月总按键</div>
        <div class="text-xl font-bold text-blue-600 dark:text-blue-400">
          {{ totalCount.toLocaleString() }}
        </div>
      </div>
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">活跃天数</div>
        <div class="text-xl font-bold text-purple-600 dark:text-purple-400">
          {{ activeDays }} <span class="text-sm text-gray-400">/ {{ daysInMonth }}</span>
        </div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">日均按键</div>
        <div class="text-xl font-bold text-green-600 dark:text-green-400">
          {{ averageDaily.toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekNumber: number
}

const props = defineProps<{
  dailyData: DayData[]
  totalCount: number
}>()

// 使用 Map 缓存日期数据，避免重复计算
const dayDataMap = computed(() => {
  const map = new Map<string, DayData | null>()
  if (!props.dailyData.length) return map

  const firstDayOfWeek = props.dailyData[0]?.dayOfWeek || 0

  // 预计算所有可能的位置
  const weekCount = Math.ceil((props.dailyData.length + firstDayOfWeek) / 7)
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayIndex = weekIndex * 7 + dayOfWeek - firstDayOfWeek
      const key = `${weekIndex}-${dayOfWeek}`
      if (dayIndex >= 0 && dayIndex < props.dailyData.length) {
        map.set(key, props.dailyData[dayIndex])
      } else {
        map.set(key, null)
      }
    }
  }
  return map
})

// 快速获取日期数据（O(1) 查找）
function getDayDataCached(weekIndex: number, dayOfWeek: number): DayData | null {
  return dayDataMap.value.get(`${weekIndex}-${dayOfWeek}`) ?? null
}

const monthName = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
})

const daysInMonth = computed(() => props.dailyData.length)

const activeDays = computed(() => props.dailyData.filter(d => d.count > 0).length)

const averageDaily = computed(() => {
  if (activeDays.value === 0) return 0
  return Math.round(props.totalCount / activeDays.value)
})

// 计算需要多少列（周）
const weekCount = computed(() => {
  if (!props.dailyData.length) return 0
  const firstDayOfWeek = props.dailyData[0]?.dayOfWeek || 0
  const daysInMonth = props.dailyData.length
  return Math.ceil((daysInMonth + firstDayOfWeek) / 7)
})

// 每周的标签（显示该周的起始日期）
const weekLabels = computed(() => {
  const labels: string[] = []
  if (!props.dailyData.length) return labels

  const firstDayOfWeek = props.dailyData[0]?.dayOfWeek || 0

  for (let week = 0; week < weekCount.value; week++) {
    const dayIndex = week * 7 - firstDayOfWeek
    if (dayIndex >= 0 && dayIndex < props.dailyData.length) {
      const day = parseInt(props.dailyData[dayIndex].date.split('-')[2])
      labels.push(`${day}日`)
    } else if (week === 0) {
      labels.push('1日')
    } else {
      labels.push('')
    }
  }
  return labels
})

// 获取格子样式
function getCellClass(dayData: DayData | null): string {
  if (!dayData || dayData.count === 0) {
    return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
  }

  const count = dayData.count
  if (count < 100) return 'bg-blue-200 dark:bg-blue-900'
  if (count < 500) return 'bg-blue-400 dark:bg-blue-700'
  if (count < 1000) return 'bg-blue-600 dark:bg-blue-500'
  return 'bg-blue-800 dark:bg-blue-300'
}

// 获取提示信息
function getTooltip(dayData: DayData | null): string {
  if (!dayData) return ''
  const date = new Date(dayData.date)
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
  return `${dateStr}: ${dayData.count.toLocaleString()} 次`
}
</script>
