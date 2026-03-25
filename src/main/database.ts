import { Low } from 'lowdb'
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, access } from 'fs/promises'

// 自定义 JSON 适配器 - 禁用原子写入以修复 Windows 上的 EXDEV 错误
class JSONFileWithoutAtomic<T> {
  private filename: string

  constructor(filename: string) {
    this.filename = filename
  }

  async read(): Promise<T | null> {
    try {
      await access(this.filename)
      const data = await readFile(this.filename, 'utf-8')
      return JSON.parse(data) as T
    } catch {
      return null
    }
  }

  async write(data: T): Promise<void> {
    const serialized = JSON.stringify(data, null, 2)
    // 直接写入文件，不使用原子重命名
    await writeFile(this.filename, serialized, 'utf-8')
  }
}

// 数据类型定义
export interface KeystrokeData {
  id: number
  timestamp: number
  count: number
  hour: number
  date: string
}

export interface KeyCategoryCount {
  letter: number      // 字母键 A-Z
  number: number      // 数字键 0-9
  function: number    // 功能键 F1-F12
  control: number     // 控制键 Ctrl/Shift/Alt/Enter/Space等
  symbol: number      // 符号键
  modifier: number    // 修饰键 (Shift, Ctrl, Alt, Cmd/Win)
  other: number       // 其他按键
}

// 单个按键统计项 (用于 TOP Keys)
export interface TopKeyItem {
  name: string        // 按键名称，如 "a", "Enter", "F1"
  count: number
  category: string    // 所属分类
}

// 组合键统计
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

// 默认组合键统计（全为0）
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

// 默认分类统计（全为0）
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

export interface DailyStat {
  date: string
  totalCount: number
  hourlyDistribution: number[]
  activeHours: number
  focusSessions: number
  // 新增：按键分类统计
  categoryCount: KeyCategoryCount
  // 新增：高频按键 TOP 20
  topKeys: TopKeyItem[]
  // 新增：组合键统计
  comboCounts: ComboCounts
}

// 创建默认的每日统计（用于兼容旧数据）
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

export interface AppSettings {
  autoStart: boolean
  showFloatingWindow: boolean
  dataRetentionDays: number
  theme: 'light' | 'dark'
}

export interface DatabaseSchema {
  keystrokes: KeystrokeData[]
  dailyStats: DailyStat[]
  settings: AppSettings
}

// 默认数据
const defaultData: DatabaseSchema = {
  keystrokes: [],
  dailyStats: [],
  settings: {
    autoStart: false,
    showFloatingWindow: true,
    dataRetentionDays: 90,
    theme: 'dark',
  },
}

// 数据库实例
let db: Low<DatabaseSchema> | null = null

// 日期索引，加速日期查询
let dateIndex: Map<string, DailyStat> | null = null

export async function initDatabase(): Promise<Low<DatabaseSchema>> {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'keyboard-tracker-db.json')
  const adapter = new JSONFileWithoutAtomic<DatabaseSchema>(dbPath)
  db = new Low<DatabaseSchema>(adapter, defaultData)

  await db.read()

  // 构建日期索引
  buildDateIndex()

  return db
}

/**
 * 构建日期索引
 */
function buildDateIndex(): void {
  if (!db) return
  dateIndex = new Map()
  db.data.dailyStats.forEach(stat => {
    dateIndex!.set(stat.date, stat)
  })
}

/**
 * 通过日期快速查找统计数据（O(1)）
 */
export function findDailyStatByDate(date: string): DailyStat | undefined {
  // 优先使用索引
  if (dateIndex && dateIndex.has(date)) {
    return dateIndex.get(date)
  }
  // 降级到线性查找
  if (!db) return undefined
  return db.data.dailyStats.find(stat => stat.date === date)
}

/**
 * 添加或更新日期统计数据，同时维护索引
 */
export function upsertDailyStat(stat: DailyStat): void {
  if (!db) return

  const existing = findDailyStatByDate(stat.date)
  if (existing) {
    Object.assign(existing, stat)
  } else {
    db.data.dailyStats.push(stat)
    dateIndex?.set(stat.date, stat)
  }
}

export function getDatabase(): Low<DatabaseSchema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export async function saveData(): Promise<void> {
  if (db) {
    await db.write()
  }
}
