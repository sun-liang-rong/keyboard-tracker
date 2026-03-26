/**
 * 共享类型定义
 * 这些类型在 main 和 renderer 进程中都会使用
 *
 * 数据库表结构设计：
 * - DailyStats: 每日统计汇总
 * - TimeSlotStats: 按小时统计
 * - TopKeyStats: 高频按键统计
 * - UnlockedTitle: 已解锁称号
 */

// ============================================================
// 基础统计类型
// ============================================================

/**
 * 按键分类统计
 * 将按键按类型分组统计，帮助用户了解自己的按键习惯
 */
export interface KeyCategoryCount {
  letter: number      // 字母键 A-Z
  number: number      // 数字键 0-9
  function: number    // 功能键 F1-F12
  control: number     // 控制键 (Enter, Space, Backspace, 方向键等)
  symbol: number      // 符号键 (标点符号、特殊字符)
  modifier: number    // 修饰键 (Shift, Ctrl, Alt, Cmd/Win)
  other: number       // 其他未分类按键
}

/**
 * 单个按键统计项
 * 用于 TOP N 按键排行，记录每个按键的使用次数
 */
export interface TopKeyItem {
  name: string        // 按键名称，如 "a", "Enter", "F1"
  count: number       // 使用次数
  category: string    // 所属分类，用于可能的分类展示
}

/**
 * 组合键统计
 * 统计常用快捷键的使用次数，支持跨平台快捷键检测
 */
export interface ComboCounts {
  // 剪贴板操作
  COPY: number          // Ctrl+C / Cmd+C
  PASTE: number         // Ctrl+V / Cmd+V
  CUT: number           // Ctrl+X / Cmd+X
  SELECT_ALL: number    // Ctrl+A / Cmd+A

  // 编辑操作
  UNDO: number          // Ctrl+Z / Cmd+Z
  REDO: number          // Ctrl+Shift+Z / Cmd+Shift+Z

  // 文件操作
  SAVE: number          // Ctrl+S / Cmd+S
  FIND: number          // Ctrl+F / Cmd+F
  PRINT: number         // Ctrl+P / Cmd+P
  NEW: number           // Ctrl+N / Cmd+N
  OPEN: number          // Ctrl+O / Cmd+O

  // 标签页操作
  CLOSE_TAB: number     // Ctrl+W / Cmd+W
  NEW_TAB: number       // Ctrl+T / Cmd+T
  REOPEN_TAB: number    // Ctrl+Shift+T / Cmd+Shift+T
  NEXT_TAB: number      // Ctrl+Tab
  PREV_TAB: number      // Ctrl+Shift+Tab

  // 应用操作
  QUIT_APP: number      // Alt+F4 / Cmd+Q
  HIDE_APP: number      // Cmd+H (macOS only)
  MINIMIZE: number      // Cmd+M (macOS only)

  // 系统操作
  SPOTLIGHT: number     // Cmd+Space (macOS only)
  TASK_MANAGER: number  // Ctrl+Shift+Esc (Windows only)
  SWITCH_APP: number    // Alt+Tab / Cmd+Tab
  CLOSE_WINDOW: number  // Alt+F4 / Cmd+Shift+W

  // Windows 特有
  SHOW_DESKTOP: number      // Win+D
  OPEN_EXPLORER: number     // Win+E
  RUN_DIALOG: number        // Win+R
  LOCK_SCREEN: number       // Win+L
  TASK_VIEW: number         // Win+Tab
  SNIPPING_TOOL: number     // Win+Shift+S

  // 其他
  NEW_FOLDER: number    // Ctrl+Shift+N
  OTHER: number         // 其他未识别的组合键
}

// ============================================================
// 数据库表类型
// ============================================================

/**
 * 每日统计表（DailyStats）
 * 快速获取每日总敲击次数和活跃时间
 */
export interface DailyStats {
  id: string                      // UUID
  date: string                    // 日期 YYYY-MM-DD
  total_keystrokes: number        // 总敲击次数
  active_minutes: number          // 活跃分钟数
  peak_hour: number               // 最活跃小时 (0-23)
  created_at: string              // 创建时间 ISO
  updated_at: string              // 更新时间 ISO

  // 按键分类统计（扁平化字段）
  category_letter: number         // 字母键
  category_number: number         // 数字键
  category_function: number       // 功能键
  category_control: number        // 控制键
  category_symbol: number         // 符号键
  category_modifier: number       // 修饰键
  category_other: number          // 其他

  // 组合键统计（扁平化字段）
  combo_copy: number
  combo_paste: number
  combo_cut: number
  combo_select_all: number
  combo_undo: number
  combo_redo: number
  combo_save: number
  combo_find: number
  combo_print: number
  combo_new: number
  combo_open: number
  combo_close_tab: number
  combo_new_tab: number
  combo_reopen_tab: number
  combo_next_tab: number
  combo_prev_tab: number
  combo_quit_app: number
  combo_hide_app: number
  combo_minimize: number
  combo_spotlight: number
  combo_task_manager: number
  combo_switch_app: number
  combo_close_window: number
  combo_show_desktop: number
  combo_open_explorer: number
  combo_run_dialog: number
  combo_lock_screen: number
  combo_task_view: number
  combo_snipping_tool: number
  combo_new_folder: number
  combo_other: number
}

/**
 * 时间段统计表（TimeSlotStats）
 * 按小时统计每天活跃情况（方便热力图）
 */
export interface TimeSlotStats {
  id: string                      // UUID
  date: string                    // 日期 YYYY-MM-DD
  hour: number                    // 0-23 小时
  keystrokes: number              // 本小时敲击次数
  active_minutes: number          // 本小时活跃分钟数
}

/**
 * 高频按键统计表（TopKeyStats）
 * 记录每日每个按键的使用次数
 */
export interface TopKeyStats {
  id: string                      // UUID
  date: string                    // 日期 YYYY-MM-DD
  key_name: string                // 按键名称
  key_count: number               // 按键次数
  key_category: string            // 按键分类
}

/**
 * 已解锁称号表（UnlockedTitle）
 * 记录用户已解锁的称号
 */
export interface UnlockedTitle {
  id: string                      // UUID
  title_id: string                // 称号ID
  unlocked_date: string           // 解锁日期 YYYY-MM-DD
}

// ============================================================
// 数据库完整结构
// ============================================================

/**
 * 数据库 Schema
 * lowdb JSON 文件的完整结构
 */
export interface DatabaseSchema {
  dailyStats: DailyStats[]        // 每日统计表
  timeSlotStats: TimeSlotStats[]  // 时间段统计表
  topKeyStats: TopKeyStats[]      // 高频按键统计表
  unlockedTitles: UnlockedTitle[] // 已解锁称号表
  settings: AppSettings           // 应用设置
}

// ============================================================
// 应用设置类型
// ============================================================

/**
 * 应用设置
 * 存储用户偏好设置
 */
export interface AppSettings {
  autoStart: boolean              // 开机自启动
  showFloatingWindow: boolean     // 显示悬浮窗
  dataRetentionDays: number       // 数据保留天数（默认 90 天）
  theme: 'light' | 'dark'         // 主题模式
}

// ============================================================
// 称号系统类型
// ============================================================

/**
 * 称号接口定义
 * 称号是游戏化元素，根据用户的键盘使用习惯解锁
 */
export interface Title {
  id: string                    // 唯一标识符
  name: string                  // 显示名称（含 emoji）
  description: string           // 解锁条件描述
  icon: string                  // emoji 图标
  color: string                 // 主题颜色（用于 UI 显示）
  condition?: () => boolean     // 解锁条件函数（仅在主进程使用）
}

// ============================================================
// API 响应类型
// ============================================================

/**
 * 今日统计数据响应
 */
export interface TodayStatsResponse {
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
 * 周统计数据响应
 */
export interface WeekStatsResponse {
  totalCount: number
  dailyCounts: number[]
  labels: string[]
}

/**
 * 月统计数据响应
 */
export interface MonthStatsResponse {
  totalCount: number
  dailyData: DayData[]
  daysInMonth: number
}

/**
 * 每日数据（用于热力图等展示）
 */
export interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekNumber: number
}

// ============================================================
// 兼容性类型（废弃，保留用于数据迁移）
// ============================================================

/**
 * 旧版每日统计数据（已废弃）
 * @deprecated 使用 DailyStats 代替
 */
export interface DailyStat {
  date: string
  totalCount: number
  hourlyDistribution: number[]
  activeHours: number
  focusSessions: number
  categoryCount: KeyCategoryCount
  topKeys: TopKeyItem[]
  comboCounts: ComboCounts
}

/**
 * 旧版按键数据（已废弃）
 * @deprecated 使用 DailyStats 代替
 */
export interface KeystrokeData {
  id: number
  timestamp: number
  count: number
  hour: number
  date: string
}

// ============================================================
// Electron API 类型
// ============================================================

/**
 * Electron API 接口声明
 */
export interface ElectronAPI {
  platform: string
  getTodayStats: () => Promise<TodayStatsResponse>
  getStatsByDate: (date: string) => Promise<TodayStatsResponse>
  getWeekStats: () => Promise<WeekStatsResponse>
  getMonthStats: () => Promise<MonthStatsResponse>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>
  toggleFloatingWindow: (show: boolean) => Promise<boolean>
  setFloatingIgnoreMouse: (ignore: boolean) => void
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  onKeystrokeUpdate: (callback: (data: TodayStatsResponse) => void) => void
}

export {}