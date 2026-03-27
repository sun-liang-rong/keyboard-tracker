/**
 * database.ts - 数据库模块
 *
 * 功能说明：
 * 使用 lowdb 实现 JSON 文件数据库，用于持久化存储键盘统计数据。
 *
 * 数据库表结构：
 * - DailyStats: 每日统计汇总
 * - TimeSlotStats: 按小时统计
 * - TopKeyStats: 高频按键统计
 * - UnlockedTitle: 已解锁称号
 *
 * 数据存储位置：
 * - Windows: %APPDATA%/keyboard-tracker/keyboard-tracker-db.json
 * - macOS: ~/Library/Application Support/keyboard-tracker/keyboard-tracker-db.json
 */

import { Low } from 'lowdb'
import { app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, access } from 'fs/promises'

// ============================================================
// 安全日志工具
// ============================================================

// 静默模式：不输出到 stdout，避免 Windows EPIPE 错误
function safeLog(..._args: unknown[]): void {
  // 静默
}

// 导入共享类型
import type {
  DatabaseSchema,
  DailyStats,
  TimeSlotStats,
  TopKeyStats,
  UnlockedTitle,
  KeyCategoryCount,
  ComboCounts,
  TopKeyItem,
} from '../shared/types'

// 导入共享工具函数
import {
  generateUUID,
  createDefaultDailyStats,
  createDefaultTimeSlotStats,
  createDefaultTopKeyStats,
  extractCategoryCount,
  extractComboCounts,
  updateCategoryCount,
  updateComboCounts,
  getISOTimestamp,
  getLocalDateString,
} from '../shared/utils'

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
  dailyStats: [],
  timeSlotStats: [],
  topKeyStats: [],
  unlockedTitles: [],
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

// 日期索引：快速查找每日统计
let dailyStatsIndex: Map<string, DailyStats> | null = null

// 时间段索引：快速查找小时统计 (key: "date-hour")
let timeSlotIndex: Map<string, TimeSlotStats> | null = null

// TOP Keys 索引：快速查找按键统计 (key: "date-keyName")
let topKeyIndex: Map<string, TopKeyStats> | null = null

// ============================================================
// 数据库初始化
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

  // 确保所有必要的字段都存在
  ensureDatabaseFields()

  // 数据迁移：检测旧格式并转换
  await migrateDataIfNeeded()

  // 构建索引
  buildIndexes()

  return db
}

/**
 * 确保数据库所有字段都存在
 */
function ensureDatabaseFields(): void {
  if (!db) return

  if (!db.data.dailyStats) db.data.dailyStats = []
  if (!db.data.timeSlotStats) db.data.timeSlotStats = []
  if (!db.data.topKeyStats) db.data.topKeyStats = []
  if (!db.data.unlockedTitles) db.data.unlockedTitles = []
  if (!db.data.settings) {
    db.data.settings = {
      autoStart: false,
      showFloatingWindow: true,
      dataRetentionDays: 90,
      theme: 'dark',
    }
  }
}

/**
 * 数据迁移：从旧格式转换为新格式
 */
async function migrateDataIfNeeded(): Promise<void> {
  if (!db) return

  // 检查旧格式数据
  const oldDailyStats = db.data.dailyStats as any[]

  // 如果已经有新格式的数据（检查是否有 total_keystrokes 字段），跳过迁移
  if (oldDailyStats.length > 0 && 'total_keystrokes' in oldDailyStats[0]) {
    safeLog('[Database] Data is already in new format, skipping migration')
    return
  }

  safeLog('[Database] Migrating data from old format to new format...')

  // 迁移旧格式数据
  const migratedDailyStats: DailyStats[] = []
  const migratedTimeSlotStats: TimeSlotStats[] = []
  const migratedTopKeyStats: TopKeyStats[] = []

  for (const oldStat of oldDailyStats) {
    // 检查是否是旧格式（有 totalCount 字段，而不是 total_keystrokes）
    if ('totalCount' in oldStat && !('total_keystrokes' in oldStat)) {
      const date = oldStat.date
      const now = getISOTimestamp()

      // 创建新的 DailyStats
      const newDailyStat: DailyStats = {
        id: generateUUID(),
        date,
        total_keystrokes: oldStat.totalCount || 0,
        active_minutes: (oldStat.activeHours || 0) * 60, // 估算：小时转分钟
        peak_hour: findPeakHour(oldStat.hourlyDistribution),
        created_at: now,
        updated_at: now,
        category_letter: oldStat.categoryCount?.letter || 0,
        category_number: oldStat.categoryCount?.number || 0,
        category_function: oldStat.categoryCount?.function || 0,
        category_control: oldStat.categoryCount?.control || 0,
        category_symbol: oldStat.categoryCount?.symbol || 0,
        category_modifier: oldStat.categoryCount?.modifier || 0,
        category_other: oldStat.categoryCount?.other || 0,
        combo_copy: oldStat.comboCounts?.COPY || 0,
        combo_paste: oldStat.comboCounts?.PASTE || 0,
        combo_cut: oldStat.comboCounts?.CUT || 0,
        combo_select_all: oldStat.comboCounts?.SELECT_ALL || 0,
        combo_undo: oldStat.comboCounts?.UNDO || 0,
        combo_redo: oldStat.comboCounts?.REDO || 0,
        combo_save: oldStat.comboCounts?.SAVE || 0,
        combo_find: oldStat.comboCounts?.FIND || 0,
        combo_print: oldStat.comboCounts?.PRINT || 0,
        combo_new: oldStat.comboCounts?.NEW || 0,
        combo_open: oldStat.comboCounts?.OPEN || 0,
        combo_close_tab: oldStat.comboCounts?.CLOSE_TAB || 0,
        combo_new_tab: oldStat.comboCounts?.NEW_TAB || 0,
        combo_reopen_tab: oldStat.comboCounts?.REOPEN_TAB || 0,
        combo_next_tab: oldStat.comboCounts?.NEXT_TAB || 0,
        combo_prev_tab: oldStat.comboCounts?.PREV_TAB || 0,
        combo_quit_app: oldStat.comboCounts?.QUIT_APP || 0,
        combo_hide_app: oldStat.comboCounts?.HIDE_APP || 0,
        combo_minimize: oldStat.comboCounts?.MINIMIZE || 0,
        combo_spotlight: oldStat.comboCounts?.SPOTLIGHT || 0,
        combo_task_manager: oldStat.comboCounts?.TASK_MANAGER || 0,
        combo_switch_app: oldStat.comboCounts?.SWITCH_APP || 0,
        combo_close_window: oldStat.comboCounts?.CLOSE_WINDOW || 0,
        combo_show_desktop: oldStat.comboCounts?.SHOW_DESKTOP || 0,
        combo_open_explorer: oldStat.comboCounts?.OPEN_EXPLORER || 0,
        combo_run_dialog: oldStat.comboCounts?.RUN_DIALOG || 0,
        combo_lock_screen: oldStat.comboCounts?.LOCK_SCREEN || 0,
        combo_task_view: oldStat.comboCounts?.TASK_VIEW || 0,
        combo_snipping_tool: oldStat.comboCounts?.SNIPPING_TOOL || 0,
        combo_new_folder: oldStat.comboCounts?.NEW_FOLDER || 0,
        combo_other: oldStat.comboCounts?.OTHER || 0,
      }
      migratedDailyStats.push(newDailyStat)

      // 创建 TimeSlotStats
      if (oldStat.hourlyDistribution && Array.isArray(oldStat.hourlyDistribution)) {
        for (let hour = 0; hour < 24; hour++) {
          const keystrokes = oldStat.hourlyDistribution[hour] || 0
          if (keystrokes > 0) {
            migratedTimeSlotStats.push({
              id: generateUUID(),
              date,
              hour,
              keystrokes,
              active_minutes: keystrokes > 0 ? 1 : 0, // 估算
            })
          }
        }
      }

      // 创建 TopKeyStats
      if (oldStat.topKeys && Array.isArray(oldStat.topKeys)) {
        for (const topKey of oldStat.topKeys) {
          migratedTopKeyStats.push({
            id: generateUUID(),
            date,
            key_name: topKey.name,
            key_count: topKey.count,
            key_category: topKey.category,
          })
        }
      }
    } else {
      // 已经是新格式，直接保留
      migratedDailyStats.push(oldStat as DailyStats)
    }
  }

  // 更新数据库
  db.data.dailyStats = migratedDailyStats
  db.data.timeSlotStats = migratedTimeSlotStats
  db.data.topKeyStats = migratedTopKeyStats

  // 保存迁移后的数据
  await db.write()
  safeLog('[Database] Migration completed')
}

/**
 * 从小时分布中找到最活跃的小时
 */
function findPeakHour(hourlyDistribution: number[]): number {
  if (!hourlyDistribution || hourlyDistribution.length === 0) return 0
  let maxIndex = 0
  let maxValue = 0
  for (let i = 0; i < hourlyDistribution.length; i++) {
    if (hourlyDistribution[i] > maxValue) {
      maxValue = hourlyDistribution[i]
      maxIndex = i
    }
  }
  return maxIndex
}

/**
 * 构建索引
 */
function buildIndexes(): void {
  if (!db) return

  // 每日统计索引
  dailyStatsIndex = new Map()
  db.data.dailyStats.forEach(stat => {
    dailyStatsIndex!.set(stat.date, stat)
  })

  // 时间段索引
  timeSlotIndex = new Map()
  db.data.timeSlotStats.forEach(stat => {
    timeSlotIndex!.set(`${stat.date}-${stat.hour}`, stat)
  })

  // TOP Keys 索引
  topKeyIndex = new Map()
  db.data.topKeyStats.forEach(stat => {
    topKeyIndex!.set(`${stat.date}-${stat.key_name}`, stat)
  })
}

// ============================================================
// DailyStats 操作
// ============================================================

/**
 * 通过日期查找每日统计
 */
export function findDailyStatsByDate(date: string): DailyStats | undefined {
  if (dailyStatsIndex && dailyStatsIndex.has(date)) {
    return dailyStatsIndex.get(date)
  }
  if (!db) return undefined
  return db.data.dailyStats.find(stat => stat.date === date)
}

/**
 * 获取或创建每日统计
 */
export function getOrCreateDailyStats(date: string): DailyStats {
  let stats = findDailyStatsByDate(date)
  if (!stats) {
    stats = createDefaultDailyStats(date)
    if (db) {
      db.data.dailyStats.push(stats)
      dailyStatsIndex?.set(date, stats)
    }
  }
  return stats
}

/**
 * 更新每日统计
 */
export function updateDailyStats(stats: DailyStats): void {
  if (!db) return
  stats.updated_at = getISOTimestamp()
  dailyStatsIndex?.set(stats.date, stats)
}

// ============================================================
// TimeSlotStats 操作
// ============================================================

/**
 * 通过日期和小时查找时间段统计
 */
export function findTimeSlotStats(date: string, hour: number): TimeSlotStats | undefined {
  const key = `${date}-${hour}`
  if (timeSlotIndex && timeSlotIndex.has(key)) {
    return timeSlotIndex.get(key)
  }
  if (!db) return undefined
  return db.data.timeSlotStats.find(stat => stat.date === date && stat.hour === hour)
}

/**
 * 获取指定日期的所有时间段统计
 */
export function getTimeSlotStatsByDate(date: string): TimeSlotStats[] {
  if (!db) return []
  return db.data.timeSlotStats.filter(stat => stat.date === date)
}

/**
 * 获取或创建时间段统计
 */
export function getOrCreateTimeSlotStats(date: string, hour: number): TimeSlotStats {
  let stats = findTimeSlotStats(date, hour)
  if (!stats) {
    stats = createDefaultTimeSlotStats(date, hour)
    if (db) {
      db.data.timeSlotStats.push(stats)
      timeSlotIndex?.set(`${date}-${hour}`, stats)
    }
  }
  return stats
}

/**
 * 更新时间段统计
 */
export function updateTimeSlotStats(stats: TimeSlotStats): void {
  if (!db) return
  timeSlotIndex?.set(`${stats.date}-${stats.hour}`, stats)
}

/**
 * 获取指定日期的小时分布数组
 */
export function getHourlyDistribution(date: string): number[] {
  const result = new Array(24).fill(0)
  const slots = getTimeSlotStatsByDate(date)
  for (const slot of slots) {
    result[slot.hour] = slot.keystrokes
  }
  return result
}

/**
 * 获取指定日期的每小时活跃分钟数
 */
export function getHourlyActiveMinutes(date: string): number[] {
  const result = new Array(24).fill(0)
  const slots = getTimeSlotStatsByDate(date)
  for (const slot of slots) {
    result[slot.hour] = slot.active_minutes
  }
  return result
}

// ============================================================
// TopKeyStats 操作
// ============================================================

/**
 * 获取指定日期的 TOP Keys
 */
export function getTopKeyStatsByDate(date: string, limit: number = 20): TopKeyItem[] {
  if (!db) return []
  const stats = db.data.topKeyStats
    .filter(stat => stat.date === date)
    .sort((a, b) => b.key_count - a.key_count)
    .slice(0, limit)

  return stats.map(stat => ({
    name: stat.key_name,
    count: stat.key_count,
    category: stat.key_category,
  }))
}

/**
 * 获取或创建 TOP Key 统计
 */
export function getOrCreateTopKeyStats(date: string, keyName: string, category: string): TopKeyStats {
  const key = `${date}-${keyName}`
  let stats = topKeyIndex?.get(key)
  if (!stats) {
    stats = createDefaultTopKeyStats(date, keyName, category)
    if (db) {
      db.data.topKeyStats.push(stats)
      topKeyIndex?.set(key, stats)
    }
  }
  return stats
}

/**
 * 更新按键计数
 */
export function updateKeyCount(date: string, keyName: string, category: string, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateTopKeyStats(date, keyName, category)
  stats.key_count += increment
  topKeyIndex?.set(`${date}-${keyName}`, stats)
}

// ============================================================
// UnlockedTitle 操作
// ============================================================

/**
 * 获取所有已解锁称号
 */
export function getUnlockedTitles(): UnlockedTitle[] {
  if (!db) return []
  // 确保数组存在
  if (!db.data.unlockedTitles) {
    db.data.unlockedTitles = []
  }
  return db.data.unlockedTitles
}

/**
 * 添加已解锁称号
 */
export function addUnlockedTitle(titleId: string): void {
  if (!db) return

  // 确保数组存在
  if (!db.data.unlockedTitles) {
    db.data.unlockedTitles = []
  }

  // 检查是否已经解锁
  const existing = db.data.unlockedTitles.find(t => t.title_id === titleId)
  if (existing) return

  db.data.unlockedTitles.push({
    id: generateUUID(),
    title_id: titleId,
    unlocked_date: getLocalDateString(),
  })
}

// ============================================================
// 统计更新函数
// ============================================================

/**
 * 更新按键分类统计
 */
export function incrementCategoryCount(date: string, category: keyof KeyCategoryCount, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)

  switch (category) {
    case 'letter': stats.category_letter += increment; break
    case 'number': stats.category_number += increment; break
    case 'function': stats.category_function += increment; break
    case 'control': stats.category_control += increment; break
    case 'symbol': stats.category_symbol += increment; break
    case 'modifier': stats.category_modifier += increment; break
    case 'other': stats.category_other += increment; break
  }

  updateDailyStats(stats)
}

/**
 * 更新组合键统计
 */
export function incrementComboCount(date: string, comboKey: keyof ComboCounts, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)

  const mapping: Record<keyof ComboCounts, keyof DailyStats> = {
    COPY: 'combo_copy',
    PASTE: 'combo_paste',
    CUT: 'combo_cut',
    SELECT_ALL: 'combo_select_all',
    UNDO: 'combo_undo',
    REDO: 'combo_redo',
    SAVE: 'combo_save',
    FIND: 'combo_find',
    PRINT: 'combo_print',
    NEW: 'combo_new',
    OPEN: 'combo_open',
    CLOSE_TAB: 'combo_close_tab',
    NEW_TAB: 'combo_new_tab',
    REOPEN_TAB: 'combo_reopen_tab',
    NEXT_TAB: 'combo_next_tab',
    PREV_TAB: 'combo_prev_tab',
    QUIT_APP: 'combo_quit_app',
    HIDE_APP: 'combo_hide_app',
    MINIMIZE: 'combo_minimize',
    SPOTLIGHT: 'combo_spotlight',
    TASK_MANAGER: 'combo_task_manager',
    SWITCH_APP: 'combo_switch_app',
    CLOSE_WINDOW: 'combo_close_window',
    SHOW_DESKTOP: 'combo_show_desktop',
    OPEN_EXPLORER: 'combo_open_explorer',
    RUN_DIALOG: 'combo_run_dialog',
    LOCK_SCREEN: 'combo_lock_screen',
    TASK_VIEW: 'combo_task_view',
    SNIPPING_TOOL: 'combo_snipping_tool',
    NEW_FOLDER: 'combo_new_folder',
    OTHER: 'combo_other',
  }

  const field = mapping[comboKey]
  if (field) {
    (stats as any)[field] += increment
  }

  updateDailyStats(stats)
}

/**
 * 增加总按键数
 */
export function incrementTotalKeystrokes(date: string, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)
  stats.total_keystrokes += increment
  updateDailyStats(stats)
}

/**
 * 增加活跃分钟数
 */
export function incrementActiveMinutes(date: string, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)
  stats.active_minutes += increment
  updateDailyStats(stats)
}

/**
 * 更新最活跃小时
 */
export function updatePeakHour(date: string, hour: number): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)
  stats.peak_hour = hour
  updateDailyStats(stats)
}

/**
 * 增加时间段统计
 */
export function incrementTimeSlotKeystrokes(date: string, hour: number, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateTimeSlotStats(date, hour)
  stats.keystrokes += increment
  updateTimeSlotStats(stats)
}

/**
 * 增加时间段活跃分钟
 */
export function incrementTimeSlotActiveMinutes(date: string, hour: number, increment: number = 1): void {
  if (!db) return
  const stats = getOrCreateTimeSlotStats(date, hour)
  stats.active_minutes += increment
  updateTimeSlotStats(stats)
}

// ============================================================
// 数据获取函数
// ============================================================

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

/**
 * 从 DailyStats 提取分类统计
 */
export { extractCategoryCount, extractComboCounts }

/**
 * 批量更新 DailyStats 的分类和组合键统计
 */
export function updateDailyStatsFromMemory(
  date: string,
  totalCount: number,
  categoryCount: KeyCategoryCount,
  comboCounts: ComboCounts
): void {
  if (!db) return
  const stats = getOrCreateDailyStats(date)
  stats.total_keystrokes = totalCount
  updateCategoryCount(stats, categoryCount)
  updateComboCounts(stats, comboCounts)
  updateDailyStats(stats)
}

/**
 * 获取日期范围内的每日统计
 */
export function getDailyStatsInRange(startDate: string, endDate: string): DailyStats[] {
  if (!db) return []
  return db.data.dailyStats.filter(stat => stat.date >= startDate && stat.date <= endDate)
}

/**
 * 清理过期数据
 */
export async function cleanOldData(retentionDays: number): Promise<void> {
  if (!db) return

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  // 清理每日统计
  const oldDailyCount = db.data.dailyStats.length
  db.data.dailyStats = db.data.dailyStats.filter(stat => stat.date >= cutoffStr)

  // 清理时间段统计
  const oldTimeSlotCount = db.data.timeSlotStats.length
  db.data.timeSlotStats = db.data.timeSlotStats.filter(stat => stat.date >= cutoffStr)

  // 清理 TOP Keys 统计
  const oldTopKeyCount = db.data.topKeyStats.length
  db.data.topKeyStats = db.data.topKeyStats.filter(stat => stat.date >= cutoffStr)

  // 重建索引
  buildIndexes()

  safeLog(`[Database] Cleaned old data: ${oldDailyCount - db.data.dailyStats.length} daily stats, ` +
    `${oldTimeSlotCount - db.data.timeSlotStats.length} time slots, ` +
    `${oldTopKeyCount - db.data.topKeyStats.length} top keys`)

  await saveData()
}