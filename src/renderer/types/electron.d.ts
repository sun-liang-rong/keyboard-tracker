export interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekNumber: number
}

export interface KeyCategoryCount {
  letter: number
  number: number
  function: number
  control: number
  symbol: number
  modifier: number
  other: number
}

export interface TopKeyItem {
  name: string
  count: number
  category: string
}

export interface Title {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

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

// Electron API 类型声明
export interface ElectronAPI {
  // 平台信息
  platform: string

  // 统计数据
  getTodayStats: () => Promise<TodayStatsResponse>
  getStatsByDate: (date: string) => Promise<TodayStatsResponse>
  getWeekStats: () => Promise<{ totalCount: number; dailyCounts: number[]; labels: string[] }>
  getMonthStats: () => Promise<{ totalCount: number; dailyData: DayData[]; daysInMonth: number }>

  // 设置
  getSettings: () => Promise<{
    autoStart: boolean
    showFloatingWindow: boolean
    dataRetentionDays: number
    theme: 'light' | 'dark'
  }>
  saveSettings: (settings: unknown) => Promise<boolean>

  // 悬浮窗控制
  toggleFloatingWindow: (show: boolean) => Promise<boolean>
  setFloatingIgnoreMouse: (ignore: boolean) => void

  // 窗口控制
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // 监听事件
  onKeystrokeUpdate: (callback: (data: {
    count: number
    hourlyDistribution: number[]
    categoryCount: KeyCategoryCount
    topKeys: TopKeyItem[]
    comboCounts: ComboCounts
    currentTitle: Title | null
  }) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
