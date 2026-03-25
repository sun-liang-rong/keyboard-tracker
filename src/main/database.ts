/**
 * database.ts - 数据库模块
 *
 * 功能说明：
 * 使用 lowdb 实现 JSON 文件数据库，用于持久化存储键盘统计数据。
 *
 * 主要职责：
 * 1. 初始化数据库连接
 * 2. 提供数据读写 API
 * 3. 维护日期索引以加速查询
 *
 * 数据存储位置：
 * - Windows: %APPDATA%/keyboard-tracker/keyboard-tracker-db.json
 * - macOS: ~/Library/Application Support/keyboard-tracker/keyboard-tracker-db.json
 */

import { Low } from 'lowdb'
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, access } from 'fs/promises'

// 导入共享类型
import type {
  DatabaseSchema,
  DailyStat,
  AppSettings,
  KeystrokeData,
  KeyCategoryCount,
  TopKeyItem,
  ComboCounts,
} from '../shared/types'

// 导入共享工具函数
import {
  createDefaultDailyStat,
  createDefaultComboCounts,
  createDefaultCategoryCount,
} from '../shared/utils'

// 重新导出类型和函数，保持向后兼容
export {
  type KeyCategoryCount,
  type TopKeyItem,
  type ComboCounts,
  type DailyStat,
  type AppSettings,
  type KeystrokeData,
  createDefaultComboCounts,
  createDefaultCategoryCount,
  createDefaultDailyStat,
}

// ============================================================
// 自定义 JSON 适配器
// ============================================================

/**
 * 自定义 JSON 文件适配器
 * lowdb 默认使用原子写入，但在 Windows 上可能触发 EXDEV 错误
 */
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
    await writeFile(this.filename, serialized, 'utf-8')
  }
}

// ============================================================
// 默认数据
// ============================================================

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

// ============================================================
// 数据库实例与索引
// ============================================================

let db: Low<DatabaseSchema> | null = null
let dateIndex: Map<string, DailyStat> | null = null

// ============================================================
// 数据库操作函数
// ============================================================

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<Low<DatabaseSchema>> {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'keyboard-tracker-db.json')
  const adapter = new JSONFileWithoutAtomic<DatabaseSchema>(dbPath)
  db = new Low<DatabaseSchema>(adapter, defaultData)

  await db.read()
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
 * 通过日期查找统计数据
 */
export function findDailyStatByDate(date: string): DailyStat | undefined {
  if (dateIndex && dateIndex.has(date)) {
    return dateIndex.get(date)
  }
  if (!db) return undefined
  return db.data.dailyStats.find(stat => stat.date === date)
}

/**
 * 添加或更新日期统计数据
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

/**
 * 获取数据库实例
 */
export function getDatabase(): Low<DatabaseSchema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * 保存数据到文件
 */
export async function saveData(): Promise<void> {
  if (db) {
    await db.write()
  }
}