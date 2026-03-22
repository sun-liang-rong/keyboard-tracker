<template>
  <div class="min-h-screen">
    <!-- 固定标题栏 -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div class="px-4 sm:px-6 py-4 flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-2 sm:gap-3 ml-16 sm:ml-20">
          <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
            <img src="/logo.png" alt="KeyboardTracker" class="w-full h-full object-cover" />
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              KeyboardTracker
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">键盘活跃度统计</p>
          </div>
        </div>

        <!-- 窗口控制按钮 -->
        <div class="flex items-center gap-1 sm:gap-2">
          <!-- 设置按钮 -->
          <button
            @click="$router.push('/settings')"
            class="group flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-sm font-medium hidden sm:inline">设置</span>
          </button>

          <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 hidden sm:block"></div>

          <!-- 最小化按钮 -->
          <button
            @click="minimizeWindow"
            class="group p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
            title="最小化"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>

          <!-- 关闭按钮 -->
          <button
            @click="closeWindow"
            class="group p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
            title="关闭"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="p-4 sm:p-6">

    <!-- 今日概览 -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        📊 今日概览
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总按键"
          :value="formattedTodayCount"
          icon="⌨️"
        />
        <StatCard
          title="活跃时长"
          :value="`${activeHours}小时`"
          icon="⏰"
        />
        <StatCard
          title="专注时段"
          :value="`${focusSessions}次`"
          icon="🎯"
        />
        <StatCard
          title="今日排名"
          value="第5名"
          icon="🏆"
        />
      </div>
    </section>

    <!-- 称号展示与组合键统计 -->
    <section class="mb-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 称号展示 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            🏆 称号系统
          </h2>
          <TitleDisplay :current-title="currentTitle" :unlocked-titles="unlockedTitles" />
        </div>

        <!-- 组合键统计 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            ⌨️ 组合键统计
          </h2>
          <ComboStats :combo-counts="comboCounts" />
        </div>
      </div>
    </section>

    <!-- 按键分类统计与高频按键排行 -->
    <section class="mb-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 按键分类统计 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
          <CategoryChart :category-count="categoryCount" />
        </div>

        <!-- 高频按键排行 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
          <TopKeysChart :top-keys="topKeys" />
        </div>
      </div>
    </section>

    <!-- 时段分布（可切换日期） -->
    <section class="mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
          📈 时段分布
        </h2>
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            @click="changeDate(-1)"
            class="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
          >
            <span class="hidden sm:inline">◀ 前一天</span>
            <span class="sm:hidden">◀</span>
          </button>
          <input
            type="date"
            v-model="selectedDate"
            @change="onDateChange"
            class="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            @click="changeDate(1)"
            class="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
          >
            <span class="hidden sm:inline">后一天 ▶</span>
            <span class="sm:hidden">▶</span>
          </button>
          <button
            @click="goToToday"
            class="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
          >
            今天
          </button>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm overflow-x-auto">
        <div v-if="isLoading" class="h-48 sm:h-64 flex items-center justify-center text-gray-500">
          加载中...
        </div>
        <div v-else-if="hasData">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 text-sm text-gray-600 dark:text-gray-400 gap-2">
            <span>日期：{{ formattedDate }}</span>
            <span>总按键：{{ selectedDateTotal.toLocaleString() }} | 活跃时长：{{ selectedDateActiveHours }}小时</span>
          </div>
          <div class="min-w-[600px]">
            <HourlyChart :hourly-data="selectedDateHourlyData" />
          </div>
        </div>
        <div v-else class="h-48 sm:h-64 flex items-center justify-center text-gray-500">
          该日期暂无数据
        </div>
      </div>
    </section>

    <!-- 本周统计 -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        📈 本周统计
      </h2>
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm overflow-x-auto">
        <div class="min-w-[500px]">
          <WeekChart :daily-counts="statsStore.weekDailyCounts" :labels="statsStore.weekLabels" />
        </div>
      </div>
    </section>

    <!-- 本月热力图 -->
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        🔥 本月热力图
      </h2>
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm overflow-x-auto">
        <HeatmapChart
          :daily-data="statsStore.monthDailyData"
          :total-count="statsStore.monthCount"
        />
      </div>
    </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useStatsStore } from '../stores/stats'
import StatCard from '../components/StatCard.vue'
import HourlyChart from '../components/HourlyChart.vue'
import WeekChart from '../components/WeekChart.vue'
import HeatmapChart from '../components/HeatmapChart.vue'
import CategoryChart from '../components/CategoryChart.vue'
import TopKeysChart from '../components/TopKeysChart.vue'
import ComboStats from '../components/ComboStats.vue'
import TitleDisplay from '../components/TitleDisplay.vue'

const statsStore = useStatsStore()
const { activeHours, focusSessions, formattedTodayCount, categoryCount, topKeys, comboCounts, currentTitle, unlockedTitles } = storeToRefs(statsStore)
let dateCheckInterval: ReturnType<typeof setInterval> | null = null

/**
 * 获取本地时区的日期字符串 YYYY-MM-DD
 * 避免使用 toISOString() 返回 UTC 日期
 */
function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedDate = ref(getLocalDateString())
const isLoading = ref(false)

// 格式化日期显示
const formattedDate = computed(() => {
  const today = getLocalDateString()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const year = yesterdayDate.getFullYear()
  const month = String(yesterdayDate.getMonth() + 1).padStart(2, '0')
  const day = String(yesterdayDate.getDate()).padStart(2, '0')
  const yesterday = `${year}-${month}-${day}`

  if (selectedDate.value === today) return '今天'
  if (selectedDate.value === yesterday) return '昨天'
  const date = new Date(selectedDate.value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

// 当前选中日期的统计数据
const selectedDateTotal = computed(() => {
  const today = getLocalDateString()
  if (selectedDate.value === today) {
    return statsStore.todayCount || 0
  }
  if (selectedDate.value === statsStore.selectedDate) {
    return statsStore.selectedDateStats?.totalCount || 0
  }
  return 0
})

const selectedDateActiveHours = computed(() => {
  const today = getLocalDateString()
  if (selectedDate.value === today) {
    // 计算今日活跃小时数
    return statsStore.hourlyDistribution.filter(h => h > 0).length
  }
  if (selectedDate.value === statsStore.selectedDate) {
    return statsStore.selectedDateStats?.activeHours || 0
  }
  return 0
})

const selectedDateHourlyData = computed(() => {
  // 如果是今天，使用 store 的实时数据
  const today = getLocalDateString()
  if (selectedDate.value === today) {
    return statsStore.hourlyDistribution
  }
  // 其他日期使用选中日期的数据
  if (selectedDate.value === statsStore.selectedDate) {
    return statsStore.selectedDateStats?.hourlyDistribution || new Array(24).fill(0)
  }
  return new Array(24).fill(0)
})

const hasData = computed(() => {
  const total = selectedDateTotal.value
  return total > 0
})

// 切换日期
async function changeDate(days: number) {
  const currentDate = new Date(selectedDate.value)
  currentDate.setDate(currentDate.getDate() + days)
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const day = String(currentDate.getDate()).padStart(2, '0')
  selectedDate.value = `${year}-${month}-${day}`
  await loadDateStats()
}

// 日期选择变化
async function onDateChange() {
  await loadDateStats()
}

// 回到今天
async function goToToday() {
  selectedDate.value = getLocalDateString()
  await loadDateStats()
}

// 加载指定日期的统计
async function loadDateStats() {
  isLoading.value = true
  await statsStore.fetchStatsByDate(selectedDate.value)
  isLoading.value = false
}

function minimizeWindow() {
  try {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow()
    } else {
      console.error('[Renderer] electronAPI not available for minimizeWindow')
    }
  } catch (error) {
    console.error('[Renderer] Error calling minimizeWindow:', error)
  }
}

function closeWindow() {
  try {
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    } else {
      console.error('[Renderer] electronAPI not available for closeWindow')
    }
  } catch (error) {
    console.error('[Renderer] Error calling closeWindow:', error)
  }
}

onMounted(() => {
  // 确保日期是今天的本地日期
  selectedDate.value = getLocalDateString()
  statsStore.fetchTodayStats()
  statsStore.fetchWeekStats()
  statsStore.fetchMonthStats()
  statsStore.startListening()
  // 初始加载今天的数据
  loadDateStats()

  // 定时检查日期变化（每分钟检查一次）
  dateCheckInterval = setInterval(() => {
    const currentDate = getLocalDateString()
    if (currentDate !== selectedDate.value) {
      console.log('[Dashboard] Date changed from', selectedDate.value, 'to', currentDate)
      selectedDate.value = currentDate
      // 日期变化时重新加载数据
      statsStore.fetchTodayStats()
      statsStore.fetchWeekStats()
      statsStore.fetchMonthStats()
      loadDateStats()
    }
  }, 60000)
})

onUnmounted(() => {
  if (dateCheckInterval) {
    clearInterval(dateCheckInterval)
    dateCheckInterval = null
  }
})
</script>
