/**
 * stats.ts - 统计数据状态管理
 *
 * 使用 Pinia 进行状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/**
 * 按键分类统计
 */
export interface KeyCategoryCount {
  letter: number
  number: number
  function: number
  control: number
  symbol: number
  modifier: number
  other: number
}

/**
 * TOP Key 项目
 */
export interface TopKeyItem {
  name: string
  count: number
  category: string
}

/**
 * 称号
 */
export interface Title {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

/**
 * 组合键统计
 */
export interface ComboCounts {
  COPY: number
  PASTE: number
  CUT: number
  SELECT_ALL: number
  UNDO: number
  REDO: number
  SAVE: number
  FIND: number
  PRINT: number
  NEW: number
  OPEN: number
  CLOSE_TAB: number
  NEW_TAB: number
  REOPEN_TAB: number
  NEXT_TAB: number
  PREV_TAB: number
  QUIT_APP: number
  HIDE_APP: number
  MINIMIZE: number
  SPOTLIGHT: number
  TASK_MANAGER: number
  SWITCH_APP: number
  CLOSE_WINDOW: number
  SHOW_DESKTOP: number
  OPEN_EXPLORER: number
  RUN_DIALOG: number
  LOCK_SCREEN: number
  TASK_VIEW: number
  SNIPPING_TOOL: number
  NEW_FOLDER: number
  OTHER: number
}

/**
 * 今日统计数据
 */
export interface TodayStat {
  count: number
  activeMinutes: number
  peakHour: number
  hourlyDistribution: number[]
  hourlyActiveMinutes: number[]
  categoryCount: KeyCategoryCount
  topKeys: TopKeyItem[]
  comboCounts: ComboCounts
  currentTitle: Title | null
  unlockedTitles: Title[]
}

/**
 * 每日数据（用于热力图）
 */
export interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekNumber: number
}

// ============================================================
// 默认值函数
// ============================================================

function createDefaultCategoryCount(): KeyCategoryCount {
  return {
    letter: 0,
    number: 0,
    function: 0,
    control: 0,
    symbol: 0,
    modifier: 0,
    other: 0,
  }
}

function createDefaultComboCounts(): ComboCounts {
  return {
    COPY: 0, PASTE: 0, CUT: 0, SELECT_ALL: 0, UNDO: 0, REDO: 0,
    SAVE: 0, FIND: 0, PRINT: 0, NEW: 0, OPEN: 0, CLOSE_TAB: 0,
    NEW_TAB: 0, REOPEN_TAB: 0, NEXT_TAB: 0, PREV_TAB: 0,
    QUIT_APP: 0, HIDE_APP: 0, MINIMIZE: 0, SPOTLIGHT: 0,
    TASK_MANAGER: 0, SWITCH_APP: 0, CLOSE_WINDOW: 0,
    SHOW_DESKTOP: 0, OPEN_EXPLORER: 0, RUN_DIALOG: 0,
    LOCK_SCREEN: 0, TASK_VIEW: 0, SNIPPING_TOOL: 0,
    NEW_FOLDER: 0, OTHER: 0
  }
}

/**
 * 获取本地时区的日期字符串 YYYY-MM-DD
 */
function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ============================================================
// Store 定义
// ============================================================

export const useStatsStore = defineStore('stats', () => {
  // State
  const todayCount = ref(0)
  const activeMinutes = ref(0)
  const peakHour = ref(0)
  const weekCount = ref(0)
  const monthCount = ref(0)

  const hourlyDistribution = ref<number[]>(new Array(24).fill(0))
  const hourlyActiveMinutes = ref<number[]>(new Array(24).fill(0))
  const categoryCount = ref<KeyCategoryCount>(createDefaultCategoryCount())
  const topKeys = ref<TopKeyItem[]>([])
  const comboCounts = ref<ComboCounts>(createDefaultComboCounts())
  const currentTitle = ref<Title | null>(null)
  const unlockedTitles = ref<Title[]>([])

  const weekDailyCounts = ref<number[]>(new Array(7).fill(0))
  const weekLabels = ref<string[]>([])
  const monthDailyData = ref<DayData[]>([])

  const selectedDate = ref<string>(getLocalDateString())
  const selectedDateStats = ref<TodayStat | null>(null)

  let isListening = false

  // Getters
  const formattedTodayCount = computed(() => {
    return todayCount.value.toLocaleString()
  })

  /**
   * 活跃时长（小时）
   * 基于活跃分钟数计算
   */
  const activeHours = computed(() => {
    return Math.round(activeMinutes.value / 60 * 10) / 10 // 保留一位小数
  })

  /**
   * 活跃时长显示格式
   */
  const activeHoursDisplay = computed(() => {
    const hours = activeMinutes.value / 60
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  })

  /**
   * 专注时段：连续有按键的小时数
   */
  const focusSessions = computed(() => {
    if (!hourlyDistribution.value) return 0
    let sessions = 0
    let inSession = false
    hourlyDistribution.value.forEach((count: number) => {
      if (count > 0 && !inSession) {
        sessions++
        inSession = true
      } else if (count === 0) {
        inSession = false
      }
    })
    return sessions
  })

  // Actions

  /**
   * 获取今日统计数据
   */
  async function fetchTodayStats() {
    try {
      if (window.electronAPI) {
        console.log('[Renderer] Calling getTodayStats...')
        const stats = await window.electronAPI.getTodayStats()
        console.log('[Renderer] Received stats:', stats)

        todayCount.value = stats.count || 0
        activeMinutes.value = stats.activeMinutes || 0
        peakHour.value = stats.peakHour || 0
        hourlyDistribution.value = stats.hourlyDistribution || new Array(24).fill(0)
        hourlyActiveMinutes.value = stats.hourlyActiveMinutes || new Array(24).fill(0)
        categoryCount.value = stats.categoryCount || createDefaultCategoryCount()
        topKeys.value = stats.topKeys || []
        comboCounts.value = { ...createDefaultComboCounts(), ...stats.comboCounts }
        currentTitle.value = stats.currentTitle || null
        unlockedTitles.value = stats.unlockedTitles || []

        const today = getLocalDateString()
        selectedDate.value = today
        selectedDateStats.value = {
          count: stats.count || 0,
          activeMinutes: stats.activeMinutes || 0,
          peakHour: stats.peakHour || 0,
          hourlyDistribution: stats.hourlyDistribution || new Array(24).fill(0),
          hourlyActiveMinutes: stats.hourlyActiveMinutes || new Array(24).fill(0),
          categoryCount: stats.categoryCount || createDefaultCategoryCount(),
          topKeys: stats.topKeys || [],
          comboCounts: { ...createDefaultComboCounts(), ...stats.comboCounts },
          currentTitle: stats.currentTitle || null,
          unlockedTitles: stats.unlockedTitles || [],
        }
      } else {
        console.error('[Renderer] electronAPI not available')
      }
    } catch (error) {
      console.error('[Renderer] Failed to fetch today stats:', error)
    }
  }

  /**
   * 获取指定日期的统计数据
   */
  async function fetchStatsByDate(date: string) {
    try {
      if (window.electronAPI) {
        console.log('[Renderer] Calling getStatsByDate for:', date)
        const stats = await window.electronAPI.getStatsByDate(date)
        console.log('[Renderer] Received stats for date:', date, stats)

        selectedDate.value = date
        selectedDateStats.value = {
          count: stats.count || 0,
          activeMinutes: stats.activeMinutes || 0,
          peakHour: stats.peakHour || 0,
          hourlyDistribution: stats.hourlyDistribution || new Array(24).fill(0),
          hourlyActiveMinutes: stats.hourlyActiveMinutes || new Array(24).fill(0),
          categoryCount: stats.categoryCount || createDefaultCategoryCount(),
          topKeys: stats.topKeys || [],
          comboCounts: { ...createDefaultComboCounts(), ...stats.comboCounts },
          currentTitle: stats.currentTitle || null,
          unlockedTitles: stats.unlockedTitles || [],
        }

        // 如果是今天，同步更新今日数据
        const today = getLocalDateString()
        if (date === today) {
          todayCount.value = stats.count || 0
          activeMinutes.value = stats.activeMinutes || 0
          peakHour.value = stats.peakHour || 0
          hourlyDistribution.value = stats.hourlyDistribution || new Array(24).fill(0)
          hourlyActiveMinutes.value = stats.hourlyActiveMinutes || new Array(24).fill(0)
          categoryCount.value = stats.categoryCount || createDefaultCategoryCount()
          topKeys.value = stats.topKeys || []
          comboCounts.value = { ...createDefaultComboCounts(), ...stats.comboCounts }
          currentTitle.value = stats.currentTitle || null
          unlockedTitles.value = stats.unlockedTitles || []
        }
      } else {
        console.error('[Renderer] electronAPI not available')
      }
    } catch (error) {
      console.error('[Renderer] Failed to fetch stats by date:', error)
    }
  }

  /**
   * 获取本周统计数据
   */
  async function fetchWeekStats() {
    try {
      if (window.electronAPI) {
        console.log('[Renderer] Calling getWeekStats...')
        const stats = await window.electronAPI.getWeekStats()
        console.log('[Renderer] Received week stats:', stats)
        weekCount.value = stats.totalCount || 0
        weekDailyCounts.value = stats.dailyCounts || new Array(7).fill(0)
        weekLabels.value = stats.labels || []
      } else {
        console.error('[Renderer] electronAPI not available')
      }
    } catch (error) {
      console.error('[Renderer] Failed to fetch week stats:', error)
    }
  }

  /**
   * 获取本月统计数据
   */
  async function fetchMonthStats() {
    try {
      if (window.electronAPI) {
        console.log('[Renderer] Calling getMonthStats...')
        const stats = await window.electronAPI.getMonthStats()
        console.log('[Renderer] Received month stats:', stats)
        monthCount.value = stats.totalCount || 0
        monthDailyData.value = stats.dailyData || []
      } else {
        console.error('[Renderer] electronAPI not available')
      }
    } catch (error) {
      console.error('[Renderer] Failed to fetch month stats:', error)
    }
  }

  /**
   * 更新计数
   */
  function updateCount(count: number) {
    todayCount.value = count
  }

  /**
   * 增加计数
   */
  function incrementCount() {
    todayCount.value++
  }

  /**
   * 更新小时分布
   */
  function updateHourlyDistribution(hour: number, count: number) {
    if (!hourlyDistribution.value) {
      hourlyDistribution.value = new Array(24).fill(0)
    }
    hourlyDistribution.value[hour] = count
  }

  /**
   * 设置实时监听
   */
  function startListening() {
    if (isListening) return

    if (window.electronAPI) {
      console.log('[Renderer] Setting up keystroke listener...')
      window.electronAPI.onKeystrokeUpdate((data) => {
        console.log('[Renderer] Keystroke update received:', data.count)
        updateCount(data.count)

        // 更新小时分布 - 使用新数组确保 Vue 检测到变化
        if (data.hourlyDistribution && data.hourlyDistribution.length === 24) {
          hourlyDistribution.value = [...data.hourlyDistribution]
        }
        if (data.hourlyActiveMinutes && data.hourlyActiveMinutes.length === 24) {
          hourlyActiveMinutes.value = [...data.hourlyActiveMinutes]
        }
        if (data.categoryCount) {
          categoryCount.value = { ...data.categoryCount }
        }
        if (data.topKeys) {
          topKeys.value = [...data.topKeys]
        }
        if (data.comboCounts) {
          comboCounts.value = { ...data.comboCounts }
        }
        if (data.currentTitle !== undefined) {
          currentTitle.value = data.currentTitle
        }

        // 更新活跃分钟数
        if (data.activeMinutes !== undefined) {
          activeMinutes.value = data.activeMinutes
        }

        // 更新本月热力图中的今日数据
        updateMonthDailyData(data.count)
      })
      isListening = true
    } else {
      console.error('[Renderer] electronAPI not available for keystroke listener')
    }
  }

  /**
   * 更新本月热力图中的今日数据
   */
  function updateMonthDailyData(count: number) {
    const today = new Date()
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const todayIndex = monthDailyData.value.findIndex(day => day.date === todayDateStr)
    if (todayIndex !== -1) {
      monthDailyData.value[todayIndex].count = count
      monthCount.value = monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
    }
  }

  return {
    // State
    todayCount,
    activeMinutes,
    peakHour,
    weekCount,
    monthCount,
    hourlyDistribution,
    hourlyActiveMinutes,
    categoryCount,
    topKeys,
    comboCounts,
    currentTitle,
    unlockedTitles,
    weekDailyCounts,
    weekLabels,
    monthDailyData,
    selectedDate,
    selectedDateStats,

    // Getters
    formattedTodayCount,
    activeHours,
    activeHoursDisplay,
    focusSessions,

    // Actions
    fetchTodayStats,
    fetchStatsByDate,
    fetchWeekStats,
    fetchMonthStats,
    updateCount,
    incrementCount,
    updateHourlyDistribution,
    startListening,
  }
})