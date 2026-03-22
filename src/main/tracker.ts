import { spawn } from 'child_process'
import { join } from 'path'
import { BrowserWindow, app, powerMonitor } from 'electron'
import { getDatabase, saveData, findDailyStatByDate, createDefaultDailyStat, createDefaultCategoryCount, createDefaultComboCounts, upsertDailyStat, type KeyCategoryCount, type TopKeyItem, type ComboCounts } from './database'

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
let categoryCounts: KeyCategoryCount = createDefaultCategoryCount()

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
let pendingKeyEvents: { category: string; keyName: string }[] = []
let keyProcessTimer: NodeJS.Timeout | null = null

// 数据保存控制
let lastSaveTime = 0
let pendingSave = false

// 内存监控
let lastMemoryCheck = 0

// 悬浮窗更新回调
let floatingWindowUpdater: ((count: number) => void) | null = null

// UI更新节流
let lastUIUpdateTime = 0
let pendingUIUpdate = false
let lastFloatingUpdateTime = 0


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
    console.log('[Tracker] initTodayCount() called')
    const db = getDatabase()
    const today = getTodayDate()

    console.log('[Tracker] Today (local):', today)
    console.log('[Tracker] Memory date:', todayDate)
    console.log('[Tracker] dailyStats count:', db.data.dailyStats.length)

    // 检查是否跨天了（应用从昨天运行到今天）
    if (today !== todayDate && todayCount > 0) {
      console.log('[Tracker] Cross-day detected! Saving previous day data for:', todayDate)
      // 保存昨天的数据到数据库
      let prevDayStat = findDailyStatByDate(todayDate)
      if (!prevDayStat) {
        prevDayStat = createDefaultDailyStat(todayDate)
        db.data.dailyStats.push(prevDayStat)
      }
      prevDayStat.totalCount = todayCount
      prevDayStat.hourlyDistribution = [...hourlyCounts]
      prevDayStat.activeHours = hourlyCounts.filter((h: number) => h > 0).length
      prevDayStat.categoryCount = { ...categoryCounts }
      prevDayStat.topKeys = getTopKeys(20)
      prevDayStat.comboCounts = { ...comboCounts }

      // 使用 upsertDailyStat 确保索引正确更新
      upsertDailyStat(prevDayStat)

      // 重置内存中的计数
      todayCount = 0
      todayDate = today
      hourlyCounts = new Array(24).fill(0)
      categoryCounts = createDefaultCategoryCount()
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()

      console.log('[Tracker] Previous day data saved, reset for new day:', today)
    }

    // 查找今天的统计
    const todayStat = findDailyStatByDate(today)

    if (todayStat) {
      // 如果内存中没有今天的数据（应用刚启动或者是跨天），从数据库加载
      if (todayDate !== today || todayCount === 0) {
        todayCount = todayStat.totalCount
        todayDate = today
        hourlyCounts = todayStat.hourlyDistribution.length === 24
          ? [...todayStat.hourlyDistribution]
          : new Array(24).fill(0)
        categoryCounts = todayStat.categoryCount || createDefaultCategoryCount()
        comboCounts = { ...createDefaultComboCounts(), ...todayStat.comboCounts }
        console.log('[Tracker] Loaded combo counts:', comboCounts)
        // 恢复 topKeys 到 Map
        keyCountMap.clear()
        if (todayStat.topKeys) {
          todayStat.topKeys.forEach(item => {
            keyCountMap.set(item.name, { count: item.count, category: item.category })
          })
        }
        console.log('[Tracker] Loaded today count from database:', todayCount)
        console.log('[Tracker] Loaded hourly distribution:', hourlyCounts)
        console.log('[Tracker] Loaded category counts:', categoryCounts)
      }
    } else {
      // 数据库中没有今天的数据
      todayCount = 0
      todayDate = today
      hourlyCounts = new Array(24).fill(0)
      categoryCounts = createDefaultCategoryCount()
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()
      console.log('[Tracker] No previous data for today, starting fresh')
    }
  } catch (error) {
    console.error('[Tracker] Failed to load today count:', error)
    todayCount = 0
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultCategoryCount()
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
 * 根据平台选择对应的可执行文件
 */
export function startKeyboardTracker(mainWindow: BrowserWindow | null): void {
  mainWindowRef = mainWindow
  const binPath = getBinPath()

  console.log('[Tracker] Platform:', process.platform)
  console.log('[Tracker] Binary path:', binPath)
  console.log('[Tracker] Performance config:', PERF_CONFIG)

  // 初始化系统状态监听（锁屏、休眠）
  initSystemStateMonitoring()

  // 检查是否存在编译好的二进制文件
  try {
    const tracker = spawn(binPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    console.log('[Tracker] Keyboard tracker started')

    // 监听按键事件
    tracker.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      lines.forEach((line) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('KEYDOWN')) {
          // 解析新的格式: KEYDOWN:category:keyName
          const parts = trimmed.split(':')
          if (parts.length >= 3) {
            const category = parts[1]
            const keyName = parts[2]
            onKeyPress(category, keyName)
          } else if (parts.length === 1) {
            // 兼容旧格式: 只输出 KEYDOWN
            onKeyPress('other', 'unknown')
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
      console.error('[Tracker] Error:', data.toString())
    })

    // 进程退出
    tracker.on('exit', (code) => {
      console.log('[Tracker] Process exited with code:', code)
    })

    // 应用退出时停止监听器
    process.on('exit', () => {
      tracker.kill()
    })
  } catch (error) {
    console.error('[Tracker] Failed to start keyboard tracker:', error)
    console.log('[Tracker] Please compile the native binary first:')
    console.log('  macOS: cd native/macos && make')
    console.log('  Windows: cd native/windows && compile-ahk.bat')
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
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('keystroke-update', {
      count: todayCount,
      hourlyDistribution: hourlyCounts,
      categoryCount: categoryCounts,
      topKeys: getTopKeys(20),
      comboCounts,
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
    console.log('[Tracker] New title unlocked:', newTitle.name)
  }

  // 触发 UI 更新（组合键变化实时显示）
  sendThrottledUpdate()

  // 立即保存到数据库（确保数据不丢失）
  saveKeystrokeData()
}

/**
 * 处理按键事件（入口，使用节流）
 */
function onKeyPress(category: string, keyName: string): void {
  processKeyEvent(category, keyName)
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
    const db = getDatabase()
    const today = getTodayDate()
    const hour = getCurrentHour()

    // 检查是否是新的一天
    if (today !== todayDate) {
      console.log('[Tracker] Date changed from', todayDate, 'to', today, '- saving previous day data and resetting')
      // 先保存昨天的数据到数据库
      const prevDayStat = findDailyStatByDate(todayDate)
      if (prevDayStat) {
        prevDayStat.totalCount = todayCount
        prevDayStat.hourlyDistribution = [...hourlyCounts]
        prevDayStat.activeHours = hourlyCounts.filter((h: number) => h > 0).length
        prevDayStat.categoryCount = { ...categoryCounts }
        prevDayStat.topKeys = getTopKeys(20)
        prevDayStat.comboCounts = { ...comboCounts }
      }
      // 新的一天，重置计数
      todayCount = 1
      todayDate = today
      hourlyCounts = new Array(24).fill(0)
      hourlyCounts[hour] = 1
      categoryCounts = createDefaultCategoryCount()
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

    // 查找或创建今日统计
    let todayStat = findDailyStatByDate(today)

    if (!todayStat) {
      todayStat = createDefaultDailyStat(today)
      db.data.dailyStats.push(todayStat)
    }

    // 更新统计数据 - 使用内存中的数据
    todayStat.totalCount = todayCount
    todayStat.hourlyDistribution = [...hourlyCounts]
    todayStat.categoryCount = { ...categoryCounts }
    todayStat.topKeys = getTopKeys(20)
    todayStat.comboCounts = { ...comboCounts }

    console.log('[Tracker] Saving comboCounts:', todayStat.comboCounts)

    // 计算活跃小时数
    todayStat.activeHours = todayStat.hourlyDistribution.filter((h: number) => h > 0).length

    // 使用 upsertDailyStat 确保索引正确更新
    upsertDailyStat(todayStat)

    // 写入数据库
    await saveData()

    console.log('[Tracker] Saved keystrokes today:', todayCount, 'hourly:', hourlyCounts, 'category:', categoryCounts)
  } catch (error) {
    console.error('[Tracker] Failed to save keystroke data:', error)
  }
}

/**
 * 获取今日按键数
 */
export function getTodayCount(): number {
  return todayCount
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
  console.log('[Tracker] Flushing data to database...')
  console.log('[Tracker] Current memory date:', todayDate, 'count:', todayCount)

  try {
    const db = getDatabase()

    // 首先保存内存中的数据到 todayDate（可能是昨天的日期）
    let memoryDateStat = findDailyStatByDate(todayDate)
    if (!memoryDateStat) {
      memoryDateStat = createDefaultDailyStat(todayDate)
      db.data.dailyStats.push(memoryDateStat)
    }
    memoryDateStat.totalCount = todayCount
    memoryDateStat.hourlyDistribution = [...hourlyCounts]
    memoryDateStat.activeHours = hourlyCounts.filter((h: number) => h > 0).length
    memoryDateStat.categoryCount = { ...categoryCounts }
    memoryDateStat.topKeys = getTopKeys(20)
    memoryDateStat.comboCounts = { ...comboCounts }

    // 使用 upsertDailyStat 确保索引正确更新
    upsertDailyStat(memoryDateStat)

    // 检查是否是新的一天，如果是则同时保存今天的数据
    const today = getTodayDate()
    if (today !== todayDate) {
      console.log('[Tracker] Date changed detected during flush, creating new day entry for:', today)
      // 今天还没有数据，创建一个空的条目
      let todayStat = findDailyStatByDate(today)
      if (!todayStat) {
        todayStat = createDefaultDailyStat(today)
        db.data.dailyStats.push(todayStat)
        upsertDailyStat(todayStat)
      }
    }

    // 保存到数据库
    await saveData()
    console.log('[Tracker] Data flushed successfully for date:', todayDate)
  } catch (error) {
    console.error('[Tracker] Failed to flush data:', error)
  }
}

/**
 * 重置今日计数（用于日期切换）
 */
export function resetTodayCount(): void {
  todayCount = 0
  hourlyCounts = new Array(24).fill(0)
  categoryCounts = createDefaultCategoryCount()
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
  console.log('[Tracker] Initializing system state monitoring...')

  // 监听屏幕锁定
  powerMonitor.on('lock-screen', () => {
    console.log('[Tracker] Screen locked - pausing tracker')
    isScreenLocked = true
    isTrackerPaused = true
  })

  // 监听屏幕解锁
  powerMonitor.on('unlock-screen', () => {
    console.log('[Tracker] Screen unlocked - resuming tracker')
    isScreenLocked = false
    isTrackerPaused = false
    // 刷新日期，防止跨天问题
    checkAndHandleDateChange()
  })

  // 监听系统挂起（休眠）
  powerMonitor.on('suspend', () => {
    console.log('[Tracker] System suspended - pausing tracker')
    isSystemSuspended = true
    isTrackerPaused = true
    // 保存当前数据
    flushData()
  })

  // 监听系统恢复
  powerMonitor.on('resume', () => {
    console.log('[Tracker] System resumed - resuming tracker')
    isSystemSuspended = false
    isTrackerPaused = false
    // 刷新日期，防止跨天问题
    checkAndHandleDateChange()
  })

  // 监听显示器关闭（笔记本合盖）
  powerMonitor.on('shutdown', () => {
    console.log('[Tracker] System shutting down - saving data')
    flushData()
  })
}

/**
 * 检查并处理日期变更
 */
function checkAndHandleDateChange(): void {
  const today = getLocalDateString()
  if (today !== todayDate) {
    console.log('[Tracker] Date changed from', todayDate, 'to', today)
    // 保存旧数据
    saveKeystrokeData()
    // 重置计数
    todayCount = 0
    todayDate = today
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultCategoryCount()
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

  console.log(`[Tracker] Memory usage: Heap ${heapUsedMB}MB, RSS ${rssMB}MB`)

  // 如果内存超过限制，执行清理
  if (rssMB > PERF_CONFIG.MEMORY_LIMIT_MB) {
    console.log(`[Tracker] Memory limit exceeded (${rssMB}MB > ${PERF_CONFIG.MEMORY_LIMIT_MB}MB), cleaning up...`)
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
    console.log('[Tracker] Cleaned up keyCountMap, new size:', keyCountMap.size)
  }

  // 清空打字速度历史
  if (typingSpeeds.length > 10) {
    typingSpeeds = typingSpeeds.slice(-10)
  }

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc()
    console.log('[Tracker] Forced garbage collection')
  }
}

// ========== 性能优化：节流控制 ==========

/**
 * 处理按键事件（带节流）
 */
function processKeyEvent(category: string, keyName: string): void {
  const now = Date.now()

  // 如果系统处于暂停状态，不处理
  if (isSystemIdle()) {
    return
  }

  // 检查内存使用情况
  checkMemoryUsage()

  // 将事件加入队列
  pendingKeyEvents.push({ category, keyName })

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
      processSingleKeyEvent(event.category, event.keyName)
    })

    lastKeyProcessTime = Date.now()
    keyProcessTimer = null

    // 如果还有积压的事件，继续处理
    if (pendingKeyEvents.length > 0) {
      processKeyEvent(pendingKeyEvents[0].category, pendingKeyEvents[0].keyName)
    }
  }, delay)
}

/**
 * 处理单个按键事件（实际统计逻辑）
 */
function processSingleKeyEvent(category: string, keyName: string): void {
  todayCount++

  // 更新当前小时的计数
  const hour = getCurrentHour()
  if (!hourlyCounts[hour]) {
    hourlyCounts[hour] = 0
  }
  hourlyCounts[hour]++

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
    console.log('[Tracker] New title unlocked:', newTitle.name)
  }

  // 节流发送更新
  sendThrottledUpdate()

  // 检查是否需要保存（每50次按键或间隔超过30秒）
  const now = Date.now()
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
