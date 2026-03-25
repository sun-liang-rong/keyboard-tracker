/**
 * 共享工具函数
 * 这些工具函数在 main 和 renderer 进程中都会使用
 */

// ============================================================
// 日期工具函数
// ============================================================

/**
 * 获取本地时区的日期字符串 YYYY-MM-DD
 *
 * 重要：不要使用 toISOString()，它会返回 UTC 时间！
 * 用户在中国（UTC+8）时，toISOString() 返回的日期可能比实际日期早一天
 *
 * @returns 本地日期字符串，如 "2026-03-25"
 */
export function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 将 Date 对象转换为本地时区的日期字符串 YYYY-MM-DD
 *
 * @param date - 要转换的日期对象
 * @returns 本地日期字符串
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取当前小时 (0-23)
 * @returns 0 到 23 之间的整数
 */
export function getCurrentHour(): number {
  return new Date().getHours()
}

/**
 * 获取今天的日期字符串
 * @returns YYYY-MM-DD 格式的日期
 */
export function getTodayDate(): string {
  return getLocalDateString()
}

// ============================================================
// 默认数据创建函数
// ============================================================

import type { KeyCategoryCount, ComboCounts, DailyStat } from './types'

/**
 * 创建默认的组合键统计对象
 * 所有计数初始化为 0
 * @returns 全部为 0 的 ComboCounts 对象
 */
export function createDefaultComboCounts(): ComboCounts {
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
 * 创建默认的按键分类统计对象
 * 所有计数初始化为 0
 * @returns 全部为 0 的 KeyCategoryCount 对象
 */
export function createDefaultCategoryCount(): KeyCategoryCount {
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

/**
 * 创建默认的每日统计对象
 *
 * @param date - 日期字符串，格式 YYYY-MM-DD
 * @returns 初始化的 DailyStat 对象
 */
export function createDefaultDailyStat(date: string): DailyStat {
  return {
    date,
    totalCount: 0,
    hourlyDistribution: new Array(24).fill(0),
    activeHours: 0,
    focusSessions: 0,
    categoryCount: createDefaultCategoryCount(),
    topKeys: [],
    comboCounts: createDefaultComboCounts()
  }
}

// ============================================================
// 主题工具函数
// ============================================================

/**
 * 应用主题到 DOM
 * @param theme - 'light' | 'dark'
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

// ============================================================
// 数字格式化工具函数
// ============================================================

/**
 * 格式化数字，添加千位分隔符
 * @param num - 要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * 格式化百分比
 * @param value - 数值
 * @param total - 总数
 * @param decimals - 小数位数，默认 1
 * @returns 百分比字符串
 */
export function formatPercentage(value: number, total: number, decimals: number = 1): string {
  if (total === 0) return '0.0%'
  return `${((value / total) * 100).toFixed(decimals)}%`
}
