/**
 * 共享工具函数
 * 这些工具函数在 main 和 renderer 进程中都会使用
 */

// ============================================================
// 日期工具函数
// ============================================================

import type {
  KeyCategoryCount,
  ComboCounts,
  DailyStats,
  TimeSlotStats,
  TopKeyStats
} from './types'

/**
 * 生成 UUID
 * @returns UUID 字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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

/**
 * 获取当前 ISO 时间戳
 * @returns ISO 格式的时间字符串
 */
export function getISOTimestamp(): string {
  return new Date().toISOString()
}

// ============================================================
// 默认数据创建函数
// ============================================================

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
 * 创建默认的每日统计对象（新表结构）
 *
 * @param date - 日期字符串，格式 YYYY-MM-DD
 * @returns 初始化的 DailyStats 对象
 */
export function createDefaultDailyStats(date: string): DailyStats {
  const now = getISOTimestamp()
  return {
    id: generateUUID(),
    date,
    total_keystrokes: 0,
    active_minutes: 0,
    peak_hour: 0,
    created_at: now,
    updated_at: now,

    // 按键分类
    category_letter: 0,
    category_number: 0,
    category_function: 0,
    category_control: 0,
    category_symbol: 0,
    category_modifier: 0,
    category_other: 0,

    // 组合键
    combo_copy: 0,
    combo_paste: 0,
    combo_cut: 0,
    combo_select_all: 0,
    combo_undo: 0,
    combo_redo: 0,
    combo_save: 0,
    combo_find: 0,
    combo_print: 0,
    combo_new: 0,
    combo_open: 0,
    combo_close_tab: 0,
    combo_new_tab: 0,
    combo_reopen_tab: 0,
    combo_next_tab: 0,
    combo_prev_tab: 0,
    combo_quit_app: 0,
    combo_hide_app: 0,
    combo_minimize: 0,
    combo_spotlight: 0,
    combo_task_manager: 0,
    combo_switch_app: 0,
    combo_close_window: 0,
    combo_show_desktop: 0,
    combo_open_explorer: 0,
    combo_run_dialog: 0,
    combo_lock_screen: 0,
    combo_task_view: 0,
    combo_snipping_tool: 0,
    combo_new_folder: 0,
    combo_other: 0,
  }
}

/**
 * 创建默认的时间段统计对象
 *
 * @param date - 日期字符串
 * @param hour - 小时 (0-23)
 * @returns 初始化的 TimeSlotStats 对象
 */
export function createDefaultTimeSlotStats(date: string, hour: number): TimeSlotStats {
  return {
    id: generateUUID(),
    date,
    hour,
    keystrokes: 0,
    active_minutes: 0,
  }
}

/**
 * 创建默认的高频按键统计对象
 *
 * @param date - 日期字符串
 * @param keyName - 按键名称
 * @param category - 按键分类
 * @returns 初始化的 TopKeyStats 对象
 */
export function createDefaultTopKeyStats(date: string, keyName: string, category: string): TopKeyStats {
  return {
    id: generateUUID(),
    date,
    key_name: keyName,
    key_count: 0,
    key_category: category,
  }
}

// ============================================================
// 数据转换工具函数
// ============================================================

/**
 * 从 DailyStats 提取 KeyCategoryCount
 * @param stats - DailyStats 对象
 * @returns KeyCategoryCount 对象
 */
export function extractCategoryCount(stats: DailyStats): KeyCategoryCount {
  return {
    letter: stats.category_letter,
    number: stats.category_number,
    function: stats.category_function,
    control: stats.category_control,
    symbol: stats.category_symbol,
    modifier: stats.category_modifier,
    other: stats.category_other,
  }
}

/**
 * 从 DailyStats 提取 ComboCounts
 * @param stats - DailyStats 对象
 * @returns ComboCounts 对象
 */
export function extractComboCounts(stats: DailyStats): ComboCounts {
  return {
    COPY: stats.combo_copy,
    PASTE: stats.combo_paste,
    CUT: stats.combo_cut,
    SELECT_ALL: stats.combo_select_all,
    UNDO: stats.combo_undo,
    REDO: stats.combo_redo,
    SAVE: stats.combo_save,
    FIND: stats.combo_find,
    PRINT: stats.combo_print,
    NEW: stats.combo_new,
    OPEN: stats.combo_open,
    CLOSE_TAB: stats.combo_close_tab,
    NEW_TAB: stats.combo_new_tab,
    REOPEN_TAB: stats.combo_reopen_tab,
    NEXT_TAB: stats.combo_next_tab,
    PREV_TAB: stats.combo_prev_tab,
    QUIT_APP: stats.combo_quit_app,
    HIDE_APP: stats.combo_hide_app,
    MINIMIZE: stats.combo_minimize,
    SPOTLIGHT: stats.combo_spotlight,
    TASK_MANAGER: stats.combo_task_manager,
    SWITCH_APP: stats.combo_switch_app,
    CLOSE_WINDOW: stats.combo_close_window,
    SHOW_DESKTOP: stats.combo_show_desktop,
    OPEN_EXPLORER: stats.combo_open_explorer,
    RUN_DIALOG: stats.combo_run_dialog,
    LOCK_SCREEN: stats.combo_lock_screen,
    TASK_VIEW: stats.combo_task_view,
    SNIPPING_TOOL: stats.combo_snipping_tool,
    NEW_FOLDER: stats.combo_new_folder,
    OTHER: stats.combo_other,
  }
}

/**
 * 将 KeyCategoryCount 更新到 DailyStats
 * @param stats - DailyStats 对象
 * @param categoryCount - KeyCategoryCount 对象
 */
export function updateCategoryCount(stats: DailyStats, categoryCount: KeyCategoryCount): void {
  stats.category_letter = categoryCount.letter
  stats.category_number = categoryCount.number
  stats.category_function = categoryCount.function
  stats.category_control = categoryCount.control
  stats.category_symbol = categoryCount.symbol
  stats.category_modifier = categoryCount.modifier
  stats.category_other = categoryCount.other
}

/**
 * 将 ComboCounts 更新到 DailyStats
 * @param stats - DailyStats 对象
 * @param comboCounts - ComboCounts 对象
 */
export function updateComboCounts(stats: DailyStats, comboCounts: ComboCounts): void {
  stats.combo_copy = comboCounts.COPY
  stats.combo_paste = comboCounts.PASTE
  stats.combo_cut = comboCounts.CUT
  stats.combo_select_all = comboCounts.SELECT_ALL
  stats.combo_undo = comboCounts.UNDO
  stats.combo_redo = comboCounts.REDO
  stats.combo_save = comboCounts.SAVE
  stats.combo_find = comboCounts.FIND
  stats.combo_print = comboCounts.PRINT
  stats.combo_new = comboCounts.NEW
  stats.combo_open = comboCounts.OPEN
  stats.combo_close_tab = comboCounts.CLOSE_TAB
  stats.combo_new_tab = comboCounts.NEW_TAB
  stats.combo_reopen_tab = comboCounts.REOPEN_TAB
  stats.combo_next_tab = comboCounts.NEXT_TAB
  stats.combo_prev_tab = comboCounts.PREV_TAB
  stats.combo_quit_app = comboCounts.QUIT_APP
  stats.combo_hide_app = comboCounts.HIDE_APP
  stats.combo_minimize = comboCounts.MINIMIZE
  stats.combo_spotlight = comboCounts.SPOTLIGHT
  stats.combo_task_manager = comboCounts.TASK_MANAGER
  stats.combo_switch_app = comboCounts.SWITCH_APP
  stats.combo_close_window = comboCounts.CLOSE_WINDOW
  stats.combo_show_desktop = comboCounts.SHOW_DESKTOP
  stats.combo_open_explorer = comboCounts.OPEN_EXPLORER
  stats.combo_run_dialog = comboCounts.RUN_DIALOG
  stats.combo_lock_screen = comboCounts.LOCK_SCREEN
  stats.combo_task_view = comboCounts.TASK_VIEW
  stats.combo_snipping_tool = comboCounts.SNIPPING_TOOL
  stats.combo_new_folder = comboCounts.NEW_FOLDER
  stats.combo_other = comboCounts.OTHER
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