/**
 * 共享类型定义
 * 这些类型在 main 和 renderer 进程中都会使用
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

/**
 * 每日统计数据
 * 存储单日的完整键盘使用统计
 */
export interface DailyStat {
  date: string                    // 日期，格式 YYYY-MM-DD
  totalCount: number              // 当日总按键数
  hourlyDistribution: number[]    // 24 小时分布，索引 0-23 对应 0-23 点
  activeHours: number             // 活跃小时数（有按键的小时数）
  focusSessions: number           // 专注时段数（连续活跃的时间段）
  categoryCount: KeyCategoryCount // 按键分类统计
  topKeys: TopKeyItem[]           // 高频按键 TOP 20
  comboCounts: ComboCounts        // 组合键统计
}

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

/**
 * 单次按键数据（已废弃，保留用于向后兼容）
 * @deprecated 使用 DailyStat 代替
 */
export interface KeystrokeData {
  id: number
  timestamp: number
  count: number
  hour: number
  date: string
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
// 日期数据类型
// ============================================================

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
// API 响应类型
// ============================================================

/**
 * 今日统计数据响应
 */
export interface TodayStatsResponse {
  count: number
  activeHours: number
  focusSessions: number
  hourlyDistribution: number[]
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

// ============================================================
// 数据库类型
// ============================================================

/**
 * 数据库完整结构
 */
export interface DatabaseSchema {
  keystrokes: KeystrokeData[]     // 历史按键记录（已废弃，保留向后兼容）
  dailyStats: DailyStat[]         // 每日统计数据（主要存储）
  settings: AppSettings           // 应用设置
}

// ============================================================
// Electron API 类型
// ============================================================

/**
 * Electron API 接口声明
 */
export interface ElectronAPI {
  // 平台信息
  platform: string

  // 统计数据
  getTodayStats: () => Promise<TodayStatsResponse>
  getStatsByDate: (date: string) => Promise<TodayStatsResponse>
  getWeekStats: () => Promise<WeekStatsResponse>
  getMonthStats: () => Promise<MonthStatsResponse>

  // 设置
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<boolean>

  // 悬浮窗控制
  toggleFloatingWindow: (show: boolean) => Promise<boolean>
  setFloatingIgnoreMouse: (ignore: boolean) => void

  // 窗口控制
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // 监听事件
  onKeystrokeUpdate: (callback: (data: TodayStatsResponse) => void) => void
}

// Electron Window 接口扩展在 renderer/types/electron.d.ts 中定义
export {}
