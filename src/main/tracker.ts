import { spawn } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { BrowserWindow, app, powerMonitor } from 'electron'

// ============================================================
// 安全日志工具
// ============================================================

// 在 Windows 上，console.log 可能会触发 EPIPE 错误
// 进程级别的错误处理器在 index.ts 中注册
// 这里的 safeLog 函数完全静默，避免任何 stdout 写入

function safeLog(..._args: unknown[]): void {
  // 静默模式：不输出到 stdout
}

function safeError(..._args: unknown[]): void {
  // 静默模式：不输出到 stderr
}

// 数据库操作
import {
  saveData,
  findDailyStatsByDate,
  getHourlyDistribution as dbGetHourlyDistribution,
  getTopKeyStatsByDate,
  updatePeakHour,
  updateDailyStatsFromMemory,
  extractCategoryCount,
  extractComboCounts,
  getOrCreateTimeSlotStats,
  updateTimeSlotStats,
  getOrCreateTopKeyStats,
} from './database'

// Windows 平台的键盘监听库
import { GlobalKeyboardListener } from 'node-global-key-listener'

// 导入类型
import type { KeyCategoryCount, ComboCounts, TopKeyItem } from '../shared/types'

// ============================================================
// 默认值创建函数
// ============================================================

function createDefaultKeyCategoryCount(): KeyCategoryCount {
  return { letter: 0, number: 0, function: 0, control: 0, symbol: 0, modifier: 0, other: 0 }
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

// Windows 键盘监听器的二进制文件路径
const WIN_KEY_SERVER_PATH = join(process.cwd(), 'node_modules', 'node-global-key-listener', 'bin', 'WinKeyServer.exe')

// 键盘监听器实例
let keyboardListener: GlobalKeyboardListener | null = null

// ========== 性能优化配置 ==========
const PERF_CONFIG = {
  // 高频事件节流间隔 (ms)
  KEY_THROTTLE_MS: 100,
  // UI更新节流间隔 (ms)
  UI_UPDATE_INTERVAL: 200,
  // 悬浮窗更新间隔 (ms)
  FLOATING_UPDATE_INTERVAL: 100,
  // 数据保存最小间隔 (ms) - 每50次按键或30秒保存一次
  SAVE_MIN_INTERVAL: 30000,
  // 最大内存缓存按键数
  MAX_KEY_BUFFER_SIZE: 1000,
  // 内存限制 (MB)
  MEMORY_LIMIT_MB: 50,
  // 空闲检测超时 (ms)
  IDLE_TIMEOUT_MS: 60000,
}

// ========== 状态管理 ==========
// 今日按键计数
let todayCount = 0
let mainWindowRef: BrowserWindow | null = null
let todayDate = getLocalDateString()
let currentHour = new Date().getHours()
let hourlyCounts: number[] = new Array(24).fill(0)

// 按键分类统计
let categoryCounts: KeyCategoryCount = createDefaultKeyCategoryCount()

// TOP Keys 统计 (使用 Map 暂存)
let keyCountMap = new Map<string, { count: number; category: string }>()

// 组合键统计
let comboCounts: ComboCounts = {
  COPY: 0, PASTE: 0, CUT: 0, SELECT_ALL: 0, UNDO: 0, REDO: 0,
  SAVE: 0, FIND: 0, PRINT: 0, NEW: 0, OPEN: 0, CLOSE_TAB: 0,
  NEW_TAB: 0, REOPEN_TAB: 0, NEXT_TAB: 0, PREV_TAB: 0,
  QUIT_APP: 0, HIDE_APP: 0, MINIMIZE: 0, SPOTLIGHT: 0,
  TASK_MANAGER: 0, SWITCH_APP: 0, CLOSE_WINDOW: 0,
  SHOW_DESKTOP: 0, OPEN_EXPLORER: 0, RUN_DIALOG: 0,
  LOCK_SCREEN: 0, TASK_VIEW: 0, SNIPPING_TOOL: 0,
  NEW_FOLDER: 0, OTHER: 0
}

// ========== 性能优化状态 ==========
// 系统状态
let isScreenLocked = false
let isSystemSuspended = false
let isTrackerPaused = false

// 节流控制
let lastKeyProcessTime = 0
let pendingKeyEvents: { category: string; keyName: string; timestamp: number }[] = []
let keyProcessTimer: NodeJS.Timeout | null = null

// 数据保存控制
let lastSaveTime = 0

// 内存监控
let lastMemoryCheck = 0

// 悬浮窗更新回调
let floatingWindowUpdater: ((count: number) => void) | null = null

// UI更新节流
let lastUIUpdateTime = 0
let lastFloatingUpdateTime = 0

// 活跃时长计算 - 基于分钟统计
let activeMinuteKeys = new Set<number>()  // 存储今天活跃过的分钟数（每分钟用唯一ID标识）
let activeMinutesCount = 0  // 今日活跃分钟数（缓存）


// 打字速度统计
let typingStartTime: number | null = null
let typingSessionKeyCount = 0
const TYPING_SESSION_TIMEOUT = 5000 // 5秒无输入视为结束
let typingTimeout: NodeJS.Timeout | null = null

// 连续打字记录
let typingSpeeds: number[] = [] // 每分钟的按键数

// 称号定义
export interface Title {
  id: string
  name: string
  description: string
  icon: string
  color: string
  condition: () => boolean
}

// 当前激活的称号
let currentTitle: Title | null = null

// 所有可用称号
export function getAvailableTitles(): Title[] {
  return [
    // 复制粘贴大师系列
    {
      id: 'copy_master',
      name: '📋 复制粘贴大师',
      description: '使用 Ctrl+C/V 超过 50 次',
      icon: '📋',
      color: '#3B82F6',
      condition: () => comboCounts.COPY + comboCounts.PASTE >= 50
    },
    {
      id: 'copy_king',
      name: '👑 复制粘贴之王',
      description: '使用 Ctrl+C/V 超过 200 次',
      icon: '👑',
      color: '#8B5CF6',
      condition: () => comboCounts.COPY + comboCounts.PASTE >= 200
    },
    // 撤销达人
    {
      id: 'undo_master',
      name: '↩️ 撤销达人',
      description: '使用 Ctrl+Z 超过 30 次',
      icon: '↩️',
      color: '#F59E0B',
      condition: () => comboCounts.UNDO >= 30
    },
    // 多任务高手
    {
      id: 'multitasker',
      name: '🎯 多任务高手',
      description: '使用 Alt+Tab 超过 20 次',
      icon: '🎯',
      color: '#10B981',
      condition: () => comboCounts.SWITCH_APP >= 20
    },
    // 桌面整理者
    {
      id: 'desktop_organizer',
      name: '🖥️ 桌面整理者',
      description: '使用 Win+D 超过 10 次',
      icon: '🖥️',
      color: '#6366F1',
      condition: () => comboCounts.SHOW_DESKTOP >= 10
    },
    // 标签页冲浪者
    {
      id: 'tab_surfer',
      name: '🏄 标签页冲浪者',
      description: '使用 Ctrl+Tab/W/T 超过 30 次',
      icon: '🏄',
      color: '#EC4899',
      condition: () => comboCounts.NEXT_TAB + comboCounts.CLOSE_TAB + comboCounts.NEW_TAB >= 30
    },
    // 快捷键专家
    {
      id: 'shortcut_expert',
      name: '⌨️ 快捷键专家',
      description: '使用任意组合键超过 100 次',
      icon: '⌨️',
      color: '#14B8A6',
      condition: () => getTotalComboCount() >= 100
    },
    // 最速打字王系列
    {
      id: 'speed_typer',
      name: '⚡ 速打者',
      description: '打字速度达到 200 键/分钟',
      icon: '⚡',
      color: '#F97316',
      condition: () => typingSpeeds.some(speed => speed >= 200)
    },
    {
      id: 'speed_demon',
      name: '🔥 最速打字王',
      description: '打字速度达到 400 键/分钟',
      icon: '🔥',
      color: '#DC2626',
      condition: () => typingSpeeds.some(speed => speed >= 400)
    },
    // 键盘马拉松选手
    {
      id: 'marathoner',
      name: '🏃 键盘马拉松选手',
      description: '单日按键超过 5000 次',
      icon: '🏃',
      color: '#84CC16',
      condition: () => todayCount >= 5000
    },
    // 键盘毁灭者
    {
      id: 'destroyer',
      name: '💥 键盘毁灭者',
      description: '单日按键超过 10000 次',
      icon: '💥',
      color: '#7C3AED',
      condition: () => todayCount >= 10000
    },
    // 早起的鸟儿
    {
      id: 'early_bird',
      name: '🐦 早起的鸟儿',
      description: '在 6:00-8:00 期间有按键记录',
      icon: '🐦',
      color: '#FBBF24',
      condition: () => hourlyCounts[6] + hourlyCounts[7] > 0
    },
    // 夜猫子
    {
      id: 'night_owl',
      name: '🦉 夜猫子',
      description: '在 23:00-02:00 期间有按键记录',
      icon: '🦉',
      color: '#1E40AF',
      condition: () => hourlyCounts[23] + hourlyCounts[0] + hourlyCounts[1] + hourlyCounts[2] > 0
    },
    // 工作狂
    {
      id: 'workaholic',
      name: '💼 工作狂',
      description: '连续活跃 10 个小时',
      icon: '💼',
      color: '#BE123C',
      condition: () => hourlyCounts.filter(h => h > 0).length >= 10
    },
    // 空格艺术家
    {
      id: 'space_artist',
      name: '🚀 空格艺术家',
      description: '空格键使用超过 1000 次',
      icon: '🚀',
      color: '#06B6D4',
      condition: () => (keyCountMap.get('Space')?.count || 0) >= 1000
    },
    // 回车狂魔
    {
      id: 'enter_fiend',
      name: '⏎ 回车狂魔',
      description: '回车键使用超过 500 次',
      icon: '⏎',
      color: '#E11D48',
      condition: () => (keyCountMap.get('Enter')?.count || 0) >= 500
    },
    // 删除键守护者
    {
      id: 'backspace_guardian',
      name: '🔙 删除键守护者',
      description: 'Backspace 使用超过 500 次',
      icon: '🔙',
      color: '#7C2D12',
      condition: () => (keyCountMap.get('Backspace')?.count || 0) >= 500
    },
    // 数字控
    {
      id: 'number_lover',
      name: '🔢 数字控',
      description: '数字键使用占比超过 30%',
      icon: '🔢',
      color: '#0891B2',
      condition: () => todayCount > 0 && (categoryCounts.number / todayCount) > 0.3
    },
    // 符号大师
    {
      id: 'symbol_master',
      name: '✨ 符号大师',
      description: '符号键使用超过 500 次',
      icon: '✨',
      color: '#C026D3',
      condition: () => categoryCounts.symbol >= 500
    },
    // 完美主义者
    {
      id: 'perfectionist',
      name: '✓ 完美主义者',
      description: 'Backspace 使用少于 1%',
      icon: '✓',
      color: '#059669',
      condition: () => todayCount > 100 && (keyCountMap.get('Backspace')?.count || 0) / todayCount < 0.01
    }
  ]
}

// 获取总组合键次数
function getTotalComboCount(): number {
  return Object.values(comboCounts).reduce((sum, count) => sum + count, 0)
}

// 计算当前应该显示的称号
export function calculateCurrentTitle(): Title | null {
  const titles = getAvailableTitles()
  // 找到最高级别的已解锁称号（从后往前找）
  for (let i = titles.length - 1; i >= 0; i--) {
    if (titles[i].condition()) {
      return titles[i]
    }
  }
  return null
}

// 获取所有已解锁的称号
export function getUnlockedTitles(): Title[] {
  return getAvailableTitles().filter(title => title.condition())
}

// 更新打字速度统计
function updateTypingSpeed() {
  const now = Date.now()

  if (typingStartTime === null) {
    typingStartTime = now
    typingSessionKeyCount = 1
  } else {
    typingSessionKeyCount++
  }

  // 清除之前的超时
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  // 设置新的超时，5秒无输入则计算速度
  typingTimeout = setTimeout(() => {
    if (typingStartTime && typingSessionKeyCount > 5) {
      const duration = (now - typingStartTime) / 1000 / 60 // 分钟
      if (duration > 0) {
        const speed = Math.round(typingSessionKeyCount / duration)
        typingSpeeds.push(speed)
        // 只保留最近 10 次记录
        if (typingSpeeds.length > 10) {
          typingSpeeds.shift()
        }
      }
    }
    typingStartTime = null
    typingSessionKeyCount = 0
  }, TYPING_SESSION_TIMEOUT)
}

// 悬浮窗更新回调（避免循环依赖）

// 性能优化：节流控制
let pendingUpdate = false
const UI_UPDATE_INTERVAL = 100 // 主窗口最多每100ms更新一次

// 悬浮球更新控制
const FLOATING_UPDATE_INTERVAL = 50 // 悬浮球最多每50ms更新一次（更频繁）

export function setFloatingWindowUpdater(updater: (count: number) => void): void {
  floatingWindowUpdater = updater
}

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

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
function getTodayDate(): string {
  return getLocalDateString()
}

/**
 * 获取当前小时 (0-23)
 */
function getCurrentHour(): number {
  return new Date().getHours()
}

/**
 * 初始化今日计数 - 从数据库读取
 */
export async function initTodayCount(): Promise<void> {
  try {
    safeLog('[Tracker] initTodayCount() called')
    const today = getTodayDate()

    safeLog('[Tracker] Today (local):', today)
    safeLog('[Tracker] Memory date:', todayDate)

    // 检查是否跨天了（应用从昨天运行到今天）
    if (today !== todayDate && todayCount > 0) {
      safeLog('[Tracker] Cross-day detected! Saving previous day data for:', todayDate)
      // 保存昨天的数据到数据库
      await saveKeystrokeData()

      // 重置内存中的计数
      todayCount = 0
      todayDate = today
      hourlyCounts = new Array(24).fill(0)
      categoryCounts = createDefaultKeyCategoryCount()
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()

      safeLog('[Tracker] Previous day data saved, reset for new day:', today)
    }

    // 查找今天的统计
    const todayStat = findDailyStatsByDate(today)

    safeLog('[Tracker] Looking for today stat:', today, 'Found:', todayStat ? 'yes' : 'no')

    if (todayStat) {
      // 使用新格式字段名读取数据
      todayCount = todayStat.total_keystrokes
      todayDate = today
      activeMinutesCount = todayStat.active_minutes || 0

      // 直接保留数据库的精确值，不要用推断覆盖
      // activeMinuteKeys 只用于增量统计，不用于恢复

      // 从 TimeSlotStats 表获取小时分布
      const hourlyDist = dbGetHourlyDistribution(today)
      hourlyCounts = hourlyDist

      // 使用 extractCategoryCount 从扁平化字段提取分类统计
      categoryCounts = extractCategoryCount(todayStat)

      // 使用 extractComboCounts 从扁平化字段提取组合键统计
      comboCounts = extractComboCounts(todayStat)

      safeLog('[Tracker] Loaded today count from database:', todayCount, 'active minutes:', activeMinutesCount)

      // 从 TopKeyStats 表获取按键统计
      keyCountMap.clear()
      const topKeys = getTopKeyStatsByDate(today, 100)
      for (const key of topKeys) {
        keyCountMap.set(key.name, { count: key.count, category: key.category })
      }

      safeLog('[Tracker] Loaded hourly distribution:', hourlyCounts.slice(0, 5), '...')
      safeLog('[Tracker] Loaded category counts:', categoryCounts)
    } else {
      // 数据库中没有今天的数据
      todayCount = 0
      todayDate = today
      activeMinutesCount = 0
      activeMinuteKeys.clear()
      hourlyCounts = new Array(24).fill(0)
      categoryCounts = createDefaultKeyCategoryCount()
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()

      safeLog('[Tracker] No previous data for today, starting fresh')
    }
  } catch (error) {
    safeError('[Tracker] Failed to load today count:', error)
    todayCount = 0
    activeMinutesCount = 0
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultKeyCategoryCount()
    comboCounts = createDefaultComboCounts()
    keyCountMap.clear()
  }
}

/**
 * 获取二进制文件路径
 * 开发环境: 从项目根目录 src/bin/ 查找
 * 生产环境: 从 app.getAppPath() 查找
 */
function getBinPath(): string {
  const isWin = process.platform === 'win32'
  const binName = isWin ? 'keytracker-win.exe' : 'keytracker-mac'

  if (app.isPackaged) {
    // 生产环境: app.getAppPath() 指向应用包内部
    return join(app.getAppPath(), 'src', 'bin', binName)
  } else {
    // 开发环境: 从项目根目录查找（process.cwd() 是运行 npm run dev 的目录）
    return join(process.cwd(), 'src', 'bin', binName)
  }
}

/**
 * 启动键盘监听进程
 * 根据平台选择对应的实现方式
 * - Windows: 使用 node-global-key-listener
 * - macOS: 使用原生二进制文件
 */
export async function startKeyboardTracker(mainWindow: BrowserWindow | null): Promise<void> {
  mainWindowRef = mainWindow

  safeLog('[Tracker] Platform:', process.platform)
  safeLog('[Tracker] Performance config:', PERF_CONFIG)

  // 初始化系统状态监听（锁屏、休眠）
  initSystemStateMonitoring()

  if (process.platform === 'win32') {
    // Windows: 使用 node-global-key-listener
    await startWindowsKeyboardTracker()
  } else {
    // macOS: 使用原生二进制文件
    startMacKeyboardTracker()
  }
}

/**
 * Windows 键盘监听器 - 使用 node-global-key-listener
 */
async function startWindowsKeyboardTracker(): Promise<void> {
  safeLog('[Tracker] Starting Windows keyboard tracker with node-global-key-listener...')
  safeLog('[Tracker] WinKeyServer.exe path:', WIN_KEY_SERVER_PATH)

  // 检查二进制文件是否存在
  if (!existsSync(WIN_KEY_SERVER_PATH)) {
    safeError('[Tracker] WinKeyServer.exe not found at:', WIN_KEY_SERVER_PATH)
    safeError('[Tracker] Please run: npm install')
    return
  }

  try {
    keyboardListener = new GlobalKeyboardListener({
      windows: {
        serverPath: WIN_KEY_SERVER_PATH,
        onError: (errorCode) => safeError('[WinKeyServer] ERROR: ' + errorCode),
        onInfo: (info) => safeLog('[WinKeyServer] INFO: ' + info)
      }
    })

    // 监听按键按下 - 回调必须是同步的，不能是 async！
    // 返回 {stopPropagation: false} 明确让事件继续传递
    keyboardListener.addListener((e, down) => {
      // 过滤鼠标事件 (keyCode 1-6 是鼠标按键)
      const keyCode = e.vKey
      if (keyCode >= 1 && keyCode <= 6) {
        // 返回对象格式明确控制传播行为
        return {stopPropagation: false}
      }

      if (e.state === 'DOWN') {
        const keyName = e.name?.toLowerCase() || 'unknown'

        safeLog('[Tracker] Key pressed:', keyName, 'Raw:', e.rawKey?._nameRaw)

        // 检测组合键
        const combo = detectWindowsCombo(keyName, down)
        if (combo) {
          onComboPress(combo)
        }

        // 获取按键分类
        const category = getKeyCategory(keyName)
        onKeyPress(category, keyName, Date.now())
      }

      // 返回对象格式，明确不阻止事件传播
      return {stopPropagation: false}
    })

    safeLog('[Tracker] Windows keyboard tracker started successfully')

    // 应用退出时停止监听器
    process.on('exit', () => {
      if (keyboardListener) {
        keyboardListener.kill()
        keyboardListener = null
      }
    })
  } catch (error) {
    safeError('[Tracker] Failed to start Windows keyboard tracker:', error)
  }
}

/**
 * 检测 Windows 组合键
 * down 对象包含当前按下的键，键名是大写的 (e.g., "LEFT CTRL", "RIGHT META")
 */
function detectWindowsCombo(key: string, down: Record<string, boolean>): string | null {
  const hasCtrl = down['LEFT CTRL'] || down['RIGHT CTRL']
  const hasShift = down['LEFT SHIFT'] || down['RIGHT SHIFT']
  const hasAlt = down['LEFT ALT'] || down['RIGHT ALT']
  const hasWin = down['LEFT META'] || down['RIGHT META']

  // Ctrl + C/V/X/A/Z
  if (hasCtrl && !hasShift && !hasAlt) {
    if (key === 'c') return 'COPY'
    if (key === 'v') return 'PASTE'
    if (key === 'x') return 'CUT'
    if (key === 'a') return 'SELECT_ALL'
    if (key === 'z') return 'UNDO'
    if (key === 's') return 'SAVE'
    if (key === 'f') return 'FIND'
    if (key === 'p') return 'PRINT'
    if (key === 'n') return 'NEW'
    if (key === 'o') return 'OPEN'
    if (key === 'w') return 'CLOSE_TAB'
    if (key === 't') return 'NEW_TAB'
    if (key === 'tab') return 'NEXT_TAB'
  }

  // Ctrl + Shift + Z/T
  if (hasCtrl && hasShift && !hasAlt) {
    if (key === 'z') return 'REDO'
    if (key === 't') return 'REOPEN_TAB'
    if (key === 'tab') return 'PREV_TAB'
    if (key === 'esc') return 'TASK_MANAGER'
  }

  // Alt + Tab/F4
  if (hasAlt && !hasCtrl && !hasShift) {
    if (key === 'tab') return 'SWITCH_APP'
    if (key === 'f4') return 'CLOSE_WINDOW'
  }

  // Win + D/E/R/L
  if (hasWin && !hasCtrl && !hasAlt && !hasShift) {
    if (key === 'd') return 'SHOW_DESKTOP'
    if (key === 'e') return 'OPEN_EXPLORER'
    if (key === 'r') return 'RUN_DIALOG'
    if (key === 'l') return 'LOCK_SCREEN'
  }

  return null
}

/**
 * 获取按键分类
 * 支持 node-global-key-listener 和原生二进制两种格式
 */
function getKeyCategory(key: string): string {
  const lowerKey = key.toLowerCase()

  // 字母键
  if (/^[a-z]$/.test(lowerKey)) return 'letter'

  // 数字键
  if (/^[0-9]$/.test(lowerKey)) return 'number'

  // 功能键 (支持 F1-F24)
  if (lowerKey.startsWith('f') && /^f([1-9]|1[0-9]|2[0-4])$/.test(lowerKey)) return 'function'

  // 控制键 (支持两种命名格式)
  const controlKeys = ['space', 'enter', 'return', 'tab', 'backspace', 'delete', 'escape',
    'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'insert',
    'page up', 'page down', 'pageup', 'pagedown'] // 兼容不同格式
  if (controlKeys.includes(lowerKey)) return 'control'

  // 修饰键
  const modifierKeys = ['left ctrl', 'right ctrl', 'left shift', 'right shift',
    'left alt', 'right alt', 'left meta', 'right meta', 'capslock',
    'ctrl', 'shift', 'alt', 'meta', 'command', 'windows'] // 兼容不同格式
  if (modifierKeys.includes(lowerKey)) return 'modifier'

  // 符号键
  const symbolKeys = ['`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/',
    'comma', 'period', 'slash', 'backslash', 'semicolon', 'quote', 'grave',
    'minus', 'equal', 'bracketleft', 'bracketright', 'minus', 'plus',
    'lbracket', 'rbracket', 'apostrophe'] // 兼容不同格式
  if (symbolKeys.includes(lowerKey)) return 'symbol'

  // 数字键盘按键
  if (lowerKey.startsWith('numpad') || lowerKey.startsWith('num ')) return 'number'

  // 尝试匹配大写键名 (node-global-key-listener 格式)
  const upperKey = key.toUpperCase()
  const controlKeysUpper = ['SPACE', 'ENTER', 'RETURN', 'TAB', 'BACKSPACE', 'DELETE', 'ESCAPE',
    'UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN', 'INSERT',
    'PAGE UP', 'PAGE DOWN']
  if (controlKeysUpper.includes(upperKey)) return 'control'

  return 'other'
}

/**
 * macOS 键盘监听器 - 使用原生二进制文件
 */
function startMacKeyboardTracker(): void {
  const binPath = getBinPath()

  safeLog('[Tracker] Binary path:', binPath)

  // 检查是否存在编译好的二进制文件
  try {
    // 先检查文件是否存在
    if (!existsSync(binPath)) {
      safeError('[Tracker] Binary file not found:', binPath)
      safeError('[Tracker] Please compile the native binary first:')
      safeError('  macOS: cd native/macos && clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac')
      return
    }

    safeLog('[Tracker] Binary file exists, spawning...')

    const tracker = spawn(binPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    safeLog('[Tracker] Keyboard tracker started, PID:', tracker.pid)

    // 监听按键事件
    tracker.stdout.on('data', (data: Buffer) => {
      // 处理 Windows 换行符 \r\n 和 Unix 换行符 \n
      const lines = data.toString().replace(/\r\n/g, '\n').split('\n')
      lines.forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed) return
        if (trimmed.startsWith('KEYDOWN')) {
          // 解析新的格式: KEYDOWN:category:keyName:timestamp
          const parts = trimmed.split(':')
          if (parts.length >= 4) {
            const category = parts[1]
            const keyName = parts[2]
            const timestamp = parseInt(parts[3], 10)
            onKeyPress(category, keyName, timestamp)
          } else if (parts.length === 3) {
            // 兼容旧格式: KEYDOWN:category:keyName
            const category = parts[1]
            const keyName = parts[2]
            onKeyPress(category, keyName, Date.now())
          } else if (parts.length === 1) {
            // 兼容旧格式: 只输出 KEYDOWN
            onKeyPress('other', 'unknown', Date.now())
          }
        } else if (trimmed.startsWith('COMBO')) {
          // 处理组合键事件: COMBO:comboName
          const parts = trimmed.split(':')
          if (parts.length >= 2) {
            const comboName = parts[1]
            onComboPress(comboName)
          }
        }
      })
    })

    // 监听错误
    tracker.stderr.on('data', (data: Buffer) => {
      safeError('[Tracker] Error:', data.toString())
    })

    // 监听进程错误（如可执行文件不存在或启动失败）
    tracker.on('error', (error) => {
      safeError('[Tracker] Failed to start keyboard tracker:', error.message)
    })

    // 进程退出
    tracker.on('exit', (code) => {
      safeLog('[Tracker] Process exited with code:', code)
    })

    // 应用退出时停止监听器
    process.on('exit', () => {
      tracker.kill()
    })
  } catch (error) {
    safeError('[Tracker] Unexpected error starting keyboard tracker:', error)
  }
}

/**
 * 发送更新到渲染进程（节流控制）
 * 悬浮球和主窗口分开控制，悬浮球更新更频繁
 */
function sendThrottledUpdate(): void {
  const now = Date.now()

  // 更新悬浮窗计数（更频繁，50ms间隔）
  if (now - lastFloatingUpdateTime >= FLOATING_UPDATE_INTERVAL) {
    lastFloatingUpdateTime = now
    if (floatingWindowUpdater) {
      floatingWindowUpdater(todayCount)
    }
  }

  // 主窗口更新（节流，100ms间隔）
  if (now - lastUIUpdateTime < UI_UPDATE_INTERVAL) {
    if (!pendingUpdate) {
      pendingUpdate = true
      const delay = UI_UPDATE_INTERVAL - (now - lastUIUpdateTime)
      setTimeout(() => {
        sendMainWindowUpdate()
        pendingUpdate = false
      }, delay)
    }
    return
  }

  sendMainWindowUpdate()
}

/**
 * 立即发送主窗口更新
 */
function sendMainWindowUpdate(): void {
  lastUIUpdateTime = Date.now()

  // 序列化称号数据（移除函数）
  const serializedTitle = currentTitle ? {
    id: currentTitle.id,
    name: currentTitle.name,
    description: currentTitle.description,
    icon: currentTitle.icon,
    color: currentTitle.color,
  } : null

  // 发送更新到渲染进程（包含总数、小时分布、分类统计、TOP Keys、组合键和称号）
  // 注意：必须发送数组副本，确保 Vue 能检测到变化
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('keystroke-update', {
      count: todayCount,
      hourlyDistribution: [...hourlyCounts], // 发送副本
      categoryCount: { ...categoryCounts }, // 发送副本
      topKeys: getTopKeys(20),
      comboCounts: { ...comboCounts }, // 发送副本
      currentTitle: serializedTitle,
    })
  }
}

/**
 * 处理组合键事件
 */
function onComboPress(comboName: string): void {
  // 更新组合键计数
  if (comboName in comboCounts) {
    comboCounts[comboName as keyof ComboCounts]++
  } else {
    comboCounts.OTHER++
  }

  // 更新称号
  const newTitle = calculateCurrentTitle()
  if (newTitle && newTitle.id !== currentTitle?.id) {
    currentTitle = newTitle
    safeLog('[Tracker] New title unlocked:', newTitle.name)
  }

  // 触发 UI 更新（组合键变化实时显示）
  sendThrottledUpdate()

  // 立即保存到数据库（确保数据不丢失）
  saveKeystrokeData()
}

/**
 * 处理按键事件（入口，使用节流）
 */
function onKeyPress(category: string, keyName: string, timestamp: number = Date.now()): void {
  processKeyEvent(category, keyName, timestamp)
}

/**
 * 获取 TOP N 按键（按使用次数排序）
 */
function getTopKeys(n: number): TopKeyItem[] {
  const items: TopKeyItem[] = []
  keyCountMap.forEach((value, name) => {
    items.push({
      name,
      count: value.count,
      category: value.category,
    })
  })
  // 按使用次数降序排序，取前 N
  return items.sort((a, b) => b.count - a.count).slice(0, n)
}

/**
 * 保存按键数据到数据库
 */
async function saveKeystrokeData(): Promise<void> {
  try {
    const today = getTodayDate()
    const hour = getCurrentHour()

    // 检查是否是新的一天
    if (today !== todayDate) {
      safeLog('[Tracker] Date changed from', todayDate, 'to', today, '- saving previous day data and resetting')

      // 保存昨天的数据到数据库（包括小时分布和按键统计）
      const previousDate = todayDate
      const previousHourlyCounts = [...hourlyCounts]
      const previousCategoryCounts = { ...categoryCounts }
      const previousComboCounts = { ...comboCounts }
      const previousTotalCount = todayCount
      const previousKeyCountMap = new Map(keyCountMap)
      const previousActiveMinutes = activeMinutesCount

      // 先保存昨天的统计数据
      updateDailyStatsFromMemory(previousDate, previousTotalCount, previousCategoryCounts, previousComboCounts, previousActiveMinutes)

      // 保存昨天的小时分布数据到 timeSlotStats 表
      for (let h = 0; h < 24; h++) {
        if (previousHourlyCounts[h] > 0) {
          const slot = getOrCreateTimeSlotStats(previousDate, h)
          slot.keystrokes = previousHourlyCounts[h]
          updateTimeSlotStats(slot)
        }
      }

      // 保存昨天的按键统计到 topKeyStats 表
      previousKeyCountMap.forEach((value, keyName) => {
        const stats = getOrCreateTopKeyStats(previousDate, keyName, value.category)
        stats.key_count = value.count
      })

      // 立即写入数据库，确保昨天的数据不丢失
      await saveData()
      safeLog('[Tracker] Saved previous day data for:', previousDate, 'count:', previousTotalCount)

      // 新的一天，重置计数
      todayCount = 1
      todayDate = today
      activeMinutesCount = 0
      activeMinuteKeys.clear()
      hourlyCounts = new Array(24).fill(0)
      hourlyCounts[hour] = 1
      categoryCounts = createDefaultKeyCategoryCount()
      categoryCounts.other = 1
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()
      keyCountMap.set('unknown', { count: 1, category: 'other' })
      currentHour = hour
    }

    // 检查是否跨小时
    if (hour !== currentHour) {
      currentHour = hour
    }

    // 使用 updateDailyStatsFromMemory 保存数据（正确处理新格式）
    updateDailyStatsFromMemory(today, todayCount, categoryCounts, comboCounts, activeMinutesCount)

    // 保存小时分布数据到 timeSlotStats 表
    for (let h = 0; h < 24; h++) {
      if (hourlyCounts[h] > 0) {
        const slot = getOrCreateTimeSlotStats(today, h)
        slot.keystrokes = hourlyCounts[h]
        updateTimeSlotStats(slot)
      }
    }

    // 保存按键统计到 topKeyStats 表
    keyCountMap.forEach((value, keyName) => {
      const stats = getOrCreateTopKeyStats(today, keyName, value.category)
      stats.key_count = value.count
    })

    // 更新最活跃小时
    const hourlyDist = dbGetHourlyDistribution(today)
    let maxHour = 0
    let maxCount = 0
    for (let i = 0; i < hourlyDist.length; i++) {
      if (hourlyDist[i] > maxCount) {
        maxCount = hourlyDist[i]
        maxHour = i
      }
    }
    updatePeakHour(today, maxHour)

    // 写入数据库
    await saveData()

    safeLog('[Tracker] Saved keystrokes today:', todayCount)
  } catch (error) {
    safeError('[Tracker] Failed to save keystroke data:', error)
  }
}

/**
 * 获取今日按键数
 */
export function getTodayCount(): number {
  return todayCount
}

/**
 * 获取今日活跃分钟数
 */
export function getActiveMinutes(): number {
  return activeMinutesCount
}

/**
 * 获取今日小时分布
 */
export function getHourlyDistribution(): number[] {
  return [...hourlyCounts]
}

/**
 * 强制保存当前数据到数据库（用于应用退出前）
 * 保存内存中的数据到 todayDate（可能是昨天或今天的日期）
 */
export async function flushData(): Promise<void> {
  safeLog('[Tracker] Flushing data to database...')
  safeLog('[Tracker] Current memory date:', todayDate, 'count:', todayCount, 'active minutes:', activeMinutesCount)

  try {
    // 使用 updateDailyStatsFromMemory 保存数据（正确处理新格式）
    updateDailyStatsFromMemory(todayDate, todayCount, categoryCounts, comboCounts, activeMinutesCount)

    // 保存小时分布数据到 timeSlotStats 表
    for (let h = 0; h < 24; h++) {
      if (hourlyCounts[h] > 0) {
        const slot = getOrCreateTimeSlotStats(todayDate, h)
        slot.keystrokes = hourlyCounts[h]
        updateTimeSlotStats(slot)
      }
    }

    // 保存按键统计到 topKeyStats 表
    keyCountMap.forEach((value, keyName) => {
      const stats = getOrCreateTopKeyStats(todayDate, keyName, value.category)
      stats.key_count = value.count
    })

    // 检查是否是新的一天，如果是则同时保存今天的数据
    const today = getTodayDate()
    if (today !== todayDate) {
      safeLog('[Tracker] Date changed detected during flush, creating new day entry for:', today)
      // 今天还没有数据，创建一个空的条目
      updateDailyStatsFromMemory(today, 0, createDefaultKeyCategoryCount(), createDefaultComboCounts(), 0)
    }

    // 保存到数据库
    await saveData()
    safeLog('[Tracker] Data flushed successfully for date:', todayDate)
  } catch (error) {
    safeError('[Tracker] Failed to flush data:', error)
  }
}

/**
 * 重置今日计数（用于日期切换）
 */
export function resetTodayCount(): void {
  todayCount = 0
  hourlyCounts = new Array(24).fill(0)
  categoryCounts = createDefaultKeyCategoryCount()
  keyCountMap.clear()
}

/**
 * 获取今日按键分类统计
 */
export function getCategoryCounts(): KeyCategoryCount {
  return { ...categoryCounts }
}

/**
 * 获取今日高频按键 TOP N
 */
export function getTodayTopKeys(n: number = 20): TopKeyItem[] {
  return getTopKeys(n)
}

/**
 * 获取组合键统计
 */
export function getComboCounts(): ComboCounts {
  return { ...comboCounts }
}

/**
 * 获取当前称号
 */
export function getCurrentTitle(): Title | null {
  return currentTitle
}

/**
 * 获取所有已解锁的称号
 */
export function getUnlockedTitlesList(): Title[] {
  return getUnlockedTitles()
}

// ========== 性能优化：锁屏检测与自动暂停 ==========

/**
 * 初始化系统状态监听（锁屏、休眠）
 */
export function initSystemStateMonitoring(): void {
  safeLog('[Tracker] Initializing system state monitoring...')

  // 监听屏幕锁定
  powerMonitor.on('lock-screen', () => {
    safeLog('[Tracker] Screen locked - pausing tracker')
    isScreenLocked = true
    isTrackerPaused = true
  })

  // 监听屏幕解锁
  powerMonitor.on('unlock-screen', () => {
    safeLog('[Tracker] Screen unlocked - resuming tracker')
    isScreenLocked = false
    isTrackerPaused = false
    // 刷新日期，防止跨天问题
    checkAndHandleDateChange()
  })

  // 监听系统挂起（休眠）
  powerMonitor.on('suspend', () => {
    safeLog('[Tracker] System suspended - pausing tracker')
    isSystemSuspended = true
    isTrackerPaused = true
    // 保存当前数据
    flushData()
  })

  // 监听系统恢复
  powerMonitor.on('resume', () => {
    safeLog('[Tracker] System resumed - resuming tracker')
    isSystemSuspended = false
    isTrackerPaused = false
    // 刷新日期，防止跨天问题
    checkAndHandleDateChange()
  })

  // 监听显示器关闭（笔记本合盖）
  powerMonitor.on('shutdown', () => {
    safeLog('[Tracker] System shutting down - saving data')
    flushData()
  })
}

/**
 * 检查并处理日期变更
 */
function checkAndHandleDateChange(): void {
  const today = getLocalDateString()
  if (today !== todayDate) {
    safeLog('[Tracker] Date changed from', todayDate, 'to', today)
    // 保存旧数据
    saveKeystrokeData()
    // 重置计数
    todayCount = 0
    todayDate = today
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultKeyCategoryCount()
    keyCountMap.clear()
    // 重新加载今日数据
    initTodayCount()
  }
}

/**
 * 检查系统是否处于空闲状态（用于暂停采集）
 */
function isSystemIdle(): boolean {
  return isScreenLocked || isSystemSuspended || isTrackerPaused
}

// ========== 性能优化：内存监控 ==========

/**
 * 检查内存使用情况
 */
function checkMemoryUsage(): void {
  const now = Date.now()
  if (now - lastMemoryCheck < 60000) return // 每分钟检查一次
  lastMemoryCheck = now

  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const rssMB = Math.round(usage.rss / 1024 / 1024)

  safeLog(`[Tracker] Memory usage: Heap ${heapUsedMB}MB, RSS ${rssMB}MB`)

  // 如果内存超过限制，执行清理
  if (rssMB > PERF_CONFIG.MEMORY_LIMIT_MB) {
    safeLog(`[Tracker] Memory limit exceeded (${rssMB}MB > ${PERF_CONFIG.MEMORY_LIMIT_MB}MB), cleaning up...`)
    performMemoryCleanup()
  }
}

/**
 * 执行内存清理
 */
function performMemoryCleanup(): void {
  // 限制 keyCountMap 大小
  if (keyCountMap.size > PERF_CONFIG.MAX_KEY_BUFFER_SIZE) {
    // 按计数排序，只保留前500个
    const sorted = Array.from(keyCountMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 500)
    keyCountMap.clear()
    sorted.forEach(([key, value]) => keyCountMap.set(key, value))
    safeLog('[Tracker] Cleaned up keyCountMap, new size:', keyCountMap.size)
  }

  // 清空打字速度历史
  if (typingSpeeds.length > 10) {
    typingSpeeds = typingSpeeds.slice(-10)
  }

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc()
    safeLog('[Tracker] Forced garbage collection')
  }
}

// ========== 性能优化：节流控制 ==========

/**
 * 处理按键事件（带节流）
 */
function processKeyEvent(category: string, keyName: string, timestamp: number = Date.now()): void {
  const now = Date.now()

  // 如果系统处于暂停状态，不处理
  if (isSystemIdle()) {
    return
  }

  // 检查内存使用情况
  checkMemoryUsage()

  // 将事件加入队列
  pendingKeyEvents.push({ category, keyName, timestamp })

  // 如果已经有定时器，不重复创建
  if (keyProcessTimer) {
    return
  }

  // 计算距离下次处理的延迟
  const timeSinceLastProcess = now - lastKeyProcessTime
  const delay = Math.max(0, PERF_CONFIG.KEY_THROTTLE_MS - timeSinceLastProcess)

  keyProcessTimer = setTimeout(() => {
    // 批量处理队列中的所有事件
    const events = pendingKeyEvents.splice(0, pendingKeyEvents.length)
    events.forEach(event => {
      processSingleKeyEvent(event.category, event.keyName, event.timestamp)
    })

    lastKeyProcessTime = Date.now()
    keyProcessTimer = null

    // 如果还有积压的事件，继续处理
    if (pendingKeyEvents.length > 0) {
      const nextEvent = pendingKeyEvents[0]
      processKeyEvent(nextEvent.category, nextEvent.keyName, nextEvent.timestamp)
    }
  }, delay)
}

/**
 * 处理单个按键事件（实际统计逻辑）
 * @param _timestamp - 按键时间戳（毫秒）- 暂未使用
 */
function processSingleKeyEvent(category: string, keyName: string, _timestamp: number): void {
  const now = Date.now()

  // 更新总按键计数
  todayCount++

  // 更新当前小时的计数
  const hour = getCurrentHour()
  if (!hourlyCounts[hour]) {
    hourlyCounts[hour] = 0
  }
  hourlyCounts[hour]++

  // 精确活跃分钟统计：用小时*60+分钟作为唯一标识
  const currentMinute = hour * 60 + new Date().getMinutes()
  if (!activeMinuteKeys.has(currentMinute)) {
    activeMinuteKeys.add(currentMinute)
    // 只有当确实累计了新分钟时才+1，不要用Set大小覆盖！
    activeMinutesCount++
  }

  // 更新分类计数
  if (category in categoryCounts) {
    categoryCounts[category as keyof KeyCategoryCount]++
  }

  // 更新 TOP Keys Map
  const existing = keyCountMap.get(keyName)
  if (existing) {
    existing.count++
  } else {
    keyCountMap.set(keyName, { count: 1, category })
  }

  // 更新打字速度统计
  updateTypingSpeed()

  // 更新称号
  const newTitle = calculateCurrentTitle()
  if (newTitle && newTitle.id !== currentTitle?.id) {
    currentTitle = newTitle
    safeLog('[Tracker] New title unlocked:', newTitle.name)
  }

  // 节流发送更新
  sendThrottledUpdate()

  // 检查是否需要保存（每50次按键或间隔超过30秒）
  if (todayCount % 50 === 0 || (now - lastSaveTime > PERF_CONFIG.SAVE_MIN_INTERVAL)) {
    saveKeystrokeData()
    lastSaveTime = now
  }
}

/**
 * 获取性能统计信息
 */
export function getPerformanceStats(): {
  memoryMB: number
  cpuPercent: number
  isPaused: boolean
  pendingEvents: number
  lastSaveTime: number
} {
  const usage = process.memoryUsage()
  return {
    memoryMB: Math.round(usage.rss / 1024 / 1024),
    cpuPercent: 0, // Electron 不直接提供 CPU 使用率，需要通过其他方式获取
    isPaused: isTrackerPaused,
    pendingEvents: pendingKeyEvents.length,
    lastSaveTime,
  }
}


