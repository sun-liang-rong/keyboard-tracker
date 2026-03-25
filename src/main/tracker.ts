/**
 * tracker.ts - 键盘监听核心模块
 * 
 * 功能说明：
 * 这是应用的核心模块，负责监听和统计键盘使用情况。
 * 
 * 主要职责：
 * 1. 启动跨平台键盘监听器
 * 2. 统计按键次数、分类、组合键
 * 3. 计算并管理称号系统
 * 4. 性能优化（节流、内存管理）
 * 5. 与主进程和数据库交互
 * 
 * 平台支持：
 * - Windows: 使用 node-global-key-listener 库
 * - macOS: 使用原生二进制文件 (keytracker-mac)
 * 
 * 数据流：
 * 按键事件 → 节流处理 → 分类统计 → 内存更新 → 定期保存到数据库
 */

// ============================================================
// 依赖导入
// ============================================================

import { spawn } from 'child_process'          // 用于启动原生二进制进程
import { join } from 'path'
import { existsSync } from 'fs'
import { BrowserWindow, app, powerMonitor } from 'electron'

// 数据库操作
import {
  getDatabase,
  saveData,
  findDailyStatByDate,
  createDefaultDailyStat,
  createDefaultCategoryCount,
  createDefaultComboCounts,
  upsertDailyStat,
  type KeyCategoryCount,
  type TopKeyItem,
  type ComboCounts
} from './database'

// Windows 平台的键盘监听库
import { GlobalKeyboardListener } from 'node-global-key-listener'

// 从共享模块导入日期工具函数
import { getLocalDateString, getCurrentHour } from '../shared/utils'

// ============================================================
// 工具函数：获取 Windows 键盘监听器路径
// ============================================================

/**
 * 获取 Windows 键盘监听器的二进制文件路径
 * 
 * node-global-key-listener 需要一个名为 WinKeyServer.exe 的辅助程序
 * 该程序随 npm 包一起安装
 * 
 * @returns WinKeyServer.exe 的绝对路径
 */
function getWinKeyServerPath(): string {
  if (app.isPackaged) {
    // 生产环境: 从应用包内部查找
    return join(app.getAppPath(), 'node_modules', 'node-global-key-listener', 'bin', 'WinKeyServer.exe')
  } else {
    // 开发环境: 从项目根目录查找
    return join(process.cwd(), 'node_modules', 'node-global-key-listener', 'bin', 'WinKeyServer.exe')
  }
}

// ============================================================
// 全局变量：键盘监听器实例
// ============================================================

/** 键盘监听器实例（Windows 使用） */
let keyboardListener: GlobalKeyboardListener | null = null

// ============================================================
// 性能优化配置
// ============================================================

/**
 * 性能配置常量
 * 
 * 这些值经过调优，在响应性和性能之间取得平衡
 */
const PERF_CONFIG = {
  // 高频事件节流间隔 (ms)
  // 100ms 意味着每秒最多处理 10 次按键事件
  KEY_THROTTLE_MS: 100,
  
  // UI更新节流间隔 (ms)
  UI_UPDATE_INTERVAL: 200,
  
  // 悬浮窗更新间隔 (ms)
  // 悬浮窗更新更频繁，提供更好的实时反馈
  FLOATING_UPDATE_INTERVAL: 100,
  
  // 数据保存最小间隔 (ms)
  // 每 50 次按键或 30 秒保存一次
  SAVE_MIN_INTERVAL: 30000,
  
  // 最大内存缓存按键数
  // 超过此值会触发清理
  MAX_KEY_BUFFER_SIZE: 1000,
  
  // 内存限制 (MB)
  // 超过此值会触发强制清理
  MEMORY_LIMIT_MB: 50,
  
  // 空闲检测超时 (ms)
  IDLE_TIMEOUT_MS: 60000,
}

// ============================================================
// 状态管理变量
// ============================================================

// ---------- 今日统计 ----------

/** 今日按键总数 */
let todayCount = 0

/** 主窗口引用（用于发送更新事件） */
let mainWindowRef: BrowserWindow | null = null

/** 当前日期字符串 (YYYY-MM-DD) */
let todayDate = getLocalDateString()

/** 当前小时 (0-23) */
let currentHour = new Date().getHours()

/** 24 小时分布，索引 0-23 对应 0-23 点的按键数 */
let hourlyCounts: number[] = new Array(24).fill(0)

// ---------- 分类统计 ----------

/** 按键分类统计（字母、数字、功能键等） */
let categoryCounts: KeyCategoryCount = createDefaultCategoryCount()

// ---------- TOP Keys 统计 ----------

/**
 * 按键计数 Map
 * Key: 按键名称（如 "a", "Enter"）
 * Value: { count: 次数, category: 分类 }
 */
let keyCountMap = new Map<string, { count: number; category: string }>()

// ---------- 组合键统计 ----------

/** 组合键统计（Ctrl+C、Ctrl+V 等） */
let comboCounts: ComboCounts = createDefaultComboCounts()

// ============================================================
// 性能优化状态
// ============================================================

// ---------- 系统状态 ----------

/** 屏幕是否锁定 */
let isScreenLocked = false

/** 系统是否休眠 */
let isSystemSuspended = false

/** 追踪器是否暂停（锁屏/休眠时暂停） */
let isTrackerPaused = false

// ---------- 节流控制 ----------

/** 上次处理按键的时间戳 */
let lastKeyProcessTime = 0

/** 待处理的按键事件队列 */
let pendingKeyEvents: { category: string; keyName: string; timestamp: number }[] = []

/** 按键处理定时器 */
let keyProcessTimer: NodeJS.Timeout | null = null

// ---------- 数据保存控制 ----------

/** 上次保存时间戳 */
let lastSaveTime = 0

// ---------- 内存监控 ----------

/** 上次内存检查时间戳 */
let lastMemoryCheck = 0

// ---------- UI 更新控制 ----------

/** 悬浮窗更新回调函数 */
let floatingWindowUpdater: ((count: number) => void) | null = null

/** 上次主窗口 UI 更新时间 */
let lastUIUpdateTime = 0

/** 上次悬浮窗更新时间 */
let lastFloatingUpdateTime = 0

// ---------- 打字速度统计 ----------

/** 打字会话开始时间 */
let typingStartTime: number | null = null

/** 当前打字会话的按键数 */
let typingSessionKeyCount = 0

/** 打字会话超时时间 (ms)，超过此时间无输入视为会话结束 */
const TYPING_SESSION_TIMEOUT = 5000

/** 打字超时定时器 */
let typingTimeout: NodeJS.Timeout | null = null

/** 打字速度记录（每分钟的按键数） */
let typingSpeeds: number[] = []

// ============================================================
// 称号系统
// ============================================================

/**
 * 称号接口定义
 * 
 * 称号是游戏化元素，根据用户的键盘使用习惯解锁
 * 每个称号有独特的名称、图标和解锁条件
 */
export interface Title {
  id: string                    // 唯一标识符
  name: string                  // 显示名称（含 emoji）
  description: string           // 解锁条件描述
  icon: string                  // emoji 图标
  color: string                 // 主题颜色（用于 UI 显示）
  condition: () => boolean      // 解锁条件函数
}

/** 当前激活的称号 */
let currentTitle: Title | null = null

/**
 * 获取所有可用称号列表
 * 
 * 称号按难度排序，越往后越难解锁
 * 用户会获得已解锁称号中难度最高的那个
 * 
 * @returns 称号数组
 */
export function getAvailableTitles(): Title[] {
  return [
    // ========== 复制粘贴大师系列 ==========
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
    
    // ========== 撤销达人 ==========
    {
      id: 'undo_master',
      name: '↩️ 撤销达人',
      description: '使用 Ctrl+Z 超过 30 次',
      icon: '↩️',
      color: '#F59E0B',
      condition: () => comboCounts.UNDO >= 30
    },
    
    // ========== 多任务高手 ==========
    {
      id: 'multitasker',
      name: '🎯 多任务高手',
      description: '使用 Alt+Tab 超过 20 次',
      icon: '🎯',
      color: '#10B981',
      condition: () => comboCounts.SWITCH_APP >= 20
    },
    
    // ========== 桌面整理者 ==========
    {
      id: 'desktop_organizer',
      name: '🖥️ 桌面整理者',
      description: '使用 Win+D 超过 10 次',
      icon: '🖥️',
      color: '#6366F1',
      condition: () => comboCounts.SHOW_DESKTOP >= 10
    },
    
    // ========== 标签页冲浪者 ==========
    {
      id: 'tab_surfer',
      name: '🏄 标签页冲浪者',
      description: '使用 Ctrl+Tab/W/T 超过 30 次',
      icon: '🏄',
      color: '#EC4899',
      condition: () => comboCounts.NEXT_TAB + comboCounts.CLOSE_TAB + comboCounts.NEW_TAB >= 30
    },
    
    // ========== 快捷键专家 ==========
    {
      id: 'shortcut_expert',
      name: '⌨️ 快捷键专家',
      description: '使用任意组合键超过 100 次',
      icon: '⌨️',
      color: '#14B8A6',
      condition: () => getTotalComboCount() >= 100
    },
    
    // ========== 最速打字王系列 ==========
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
    
    // ========== 键盘马拉松选手 ==========
    {
      id: 'marathoner',
      name: '🏃 键盘马拉松选手',
      description: '单日按键超过 5000 次',
      icon: '🏃',
      color: '#84CC16',
      condition: () => todayCount >= 5000
    },
    
    // ========== 键盘毁灭者 ==========
    {
      id: 'destroyer',
      name: '💥 键盘毁灭者',
      description: '单日按键超过 10000 次',
      icon: '💥',
      color: '#7C3AED',
      condition: () => todayCount >= 10000
    },
    
    // ========== 早起的鸟儿 ==========
    {
      id: 'early_bird',
      name: '🐦 早起的鸟儿',
      description: '在 6:00-8:00 期间有按键记录',
      icon: '🐦',
      color: '#FBBF24',
      condition: () => hourlyCounts[6] + hourlyCounts[7] > 0
    },
    
    // ========== 夜猫子 ==========
    {
      id: 'night_owl',
      name: '🦉 夜猫子',
      description: '在 23:00-02:00 期间有按键记录',
      icon: '🦉',
      color: '#1E40AF',
      condition: () => hourlyCounts[23] + hourlyCounts[0] + hourlyCounts[1] + hourlyCounts[2] > 0
    },
    
    // ========== 工作狂 ==========
    {
      id: 'workaholic',
      name: '💼 工作狂',
      description: '连续活跃 10 个小时',
      icon: '💼',
      color: '#BE123C',
      condition: () => hourlyCounts.filter(h => h > 0).length >= 10
    },
    
    // ========== 空格艺术家 ==========
    {
      id: 'space_artist',
      name: '🚀 空格艺术家',
      description: '空格键使用超过 1000 次',
      icon: '🚀',
      color: '#06B6D4',
      condition: () => (keyCountMap.get('Space')?.count || 0) >= 1000
    },
    
    // ========== 回车狂魔 ==========
    {
      id: 'enter_fiend',
      name: '⏎ 回车狂魔',
      description: '回车键使用超过 500 次',
      icon: '⏎',
      color: '#E11D48',
      condition: () => (keyCountMap.get('Enter')?.count || 0) >= 500
    },
    
    // ========== 删除键守护者 ==========
    {
      id: 'backspace_guardian',
      name: '🔙 删除键守护者',
      description: 'Backspace 使用超过 500 次',
      icon: '🔙',
      color: '#7C2D12',
      condition: () => (keyCountMap.get('Backspace')?.count || 0) >= 500
    },
    
    // ========== 数字控 ==========
    {
      id: 'number_lover',
      name: '🔢 数字控',
      description: '数字键使用占比超过 30%',
      icon: '🔢',
      color: '#0891B2',
      condition: () => todayCount > 0 && (categoryCounts.number / todayCount) > 0.3
    },
    
    // ========== 符号大师 ==========
    {
      id: 'symbol_master',
      name: '✨ 符号大师',
      description: '符号键使用超过 500 次',
      icon: '✨',
      color: '#C026D3',
      condition: () => categoryCounts.symbol >= 500
    },
    
    // ========== 完美主义者 ==========
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

/**
 * 计算总组合键次数
 * @returns 所有组合键使用次数的总和
 */
function getTotalComboCount(): number {
  return Object.values(comboCounts).reduce((sum, count) => sum + count, 0)
}

/**
 * 计算当前应该显示的称号
 * 
 * 从后往前遍历称号列表，返回第一个已解锁的称号
 * 这样可以确保用户获得难度最高的已解锁称号
 * 
 * @returns 当前称号，如果没有解锁任何称号则返回 null
 */
export function calculateCurrentTitle(): Title | null {
  const titles = getAvailableTitles()
  // 从后往前找，确保获得最高级别的已解锁称号
  for (let i = titles.length - 1; i >= 0; i--) {
    if (titles[i].condition()) {
      return titles[i]
    }
  }
  return null
}

/**
 * 获取所有已解锁的称号
 * @returns 已解锁称号的数组
 */
export function getUnlockedTitles(): Title[] {
  return getAvailableTitles().filter(title => title.condition())
}

// ============================================================
// 打字速度统计
// ============================================================

/**
 * 更新打字速度统计
 * 
 * 工作原理：
 * 1. 记录打字会话的开始时间和按键数
 * 2. 如果 5 秒内没有新按键，计算打字速度（键/分钟）
 * 3. 保存最近 10 次打字速度记录
 */
function updateTypingSpeed() {
  const now = Date.now()

  if (typingStartTime === null) {
    // 开始新的打字会话
    typingStartTime = now
    typingSessionKeyCount = 1
  } else {
    // 继续当前会话
    typingSessionKeyCount++
  }

  // 清除之前的超时定时器
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  // 设置新的超时，5 秒无输入则计算速度
  typingTimeout = setTimeout(() => {
    if (typingStartTime && typingSessionKeyCount > 5) {
      const duration = (now - typingStartTime) / 1000 / 60 // 转换为分钟
      if (duration > 0) {
        const speed = Math.round(typingSessionKeyCount / duration)
        typingSpeeds.push(speed)
        // 只保留最近 10 次记录，防止内存无限增长
        if (typingSpeeds.length > 10) {
          typingSpeeds.shift()
        }
      }
    }
    // 重置会话
    typingStartTime = null
    typingSessionKeyCount = 0
  }, TYPING_SESSION_TIMEOUT)
}

// ============================================================
// UI 更新控制
// ============================================================

/** 是否有待处理的 UI 更新 */
let pendingUpdate = false

/**
 * 设置悬浮窗更新回调
 * 
 * 由于 tracker.ts 和 index.ts 之间的循环依赖问题，
 * 使用回调函数而不是直接导入
 * 
 * @param updater - 更新函数，接收计数作为参数
 */
export function setFloatingWindowUpdater(updater: (count: number) => void): void {
  floatingWindowUpdater = updater
}

// ============================================================
// 今日计数初始化与跨天处理
// ============================================================

/**
 * 初始化今日计数
 * 
 * 这个函数在以下情况被调用：
 * 1. 应用启动时
 * 2. 每分钟定时检查日期变化
 * 
 * 主要功能：
 * 1. 如果跨天了，保存昨天的数据并重置计数
 * 2. 从数据库加载今天的已有数据
 * 3. 初始化内存中的各项统计
 */
export async function initTodayCount(): Promise<void> {
  try {
    console.log('[Tracker] initTodayCount() called')
    const db = getDatabase()
    const today = getLocalDateString()

    console.log('[Tracker] Today (local):', today)
    console.log('[Tracker] Memory date:', todayDate)

    // ---------- 检查是否跨天 ----------
    // 如果内存中的日期与当前日期不同，且有数据，说明跨天了
    if (today !== todayDate && todayCount > 0) {
      console.log('[Tracker] Cross-day detected! Saving previous day data for:', todayDate)
      
      // 保存昨天的数据到数据库
      let prevDayStat = findDailyStatByDate(todayDate)
      if (!prevDayStat) {
        prevDayStat = createDefaultDailyStat(todayDate)
        db.data.dailyStats.push(prevDayStat)
      }
      
      // 更新昨天的统计数据
      prevDayStat.totalCount = todayCount
      prevDayStat.hourlyDistribution = [...hourlyCounts]
      prevDayStat.activeHours = hourlyCounts.filter((h: number) => h > 0).length
      prevDayStat.categoryCount = { ...categoryCounts }
      prevDayStat.topKeys = getTopKeys(20)
      prevDayStat.comboCounts = { ...comboCounts }

      // 使用 upsert 确保索引正确更新
      upsertDailyStat(prevDayStat)

      // 保存到数据库文件
      await saveData()

      // 重置内存中的计数，开始新的一天
      todayCount = 0
      todayDate = today
      hourlyCounts = new Array(24).fill(0)
      categoryCounts = createDefaultCategoryCount()
      comboCounts = createDefaultComboCounts()
      keyCountMap.clear()

      console.log('[Tracker] Previous day data saved, reset for new day:', today)
    }

    // ---------- 加载今天的数据 ----------
    const todayStat = findDailyStatByDate(today)

    if (todayStat) {
      // 如果内存中没有今天的数据（应用刚启动或跨天），从数据库加载
      if (todayDate !== today || todayCount === 0) {
        todayCount = todayStat.totalCount
        todayDate = today
        hourlyCounts = todayStat.hourlyDistribution.length === 24
          ? [...todayStat.hourlyDistribution]
          : new Array(24).fill(0)
        categoryCounts = todayStat.categoryCount || createDefaultCategoryCount()
        comboCounts = { ...createDefaultComboCounts(), ...todayStat.comboCounts }
        
        // 恢复 topKeys 到 Map
        keyCountMap.clear()
        if (todayStat.topKeys) {
          todayStat.topKeys.forEach(item => {
            keyCountMap.set(item.name, { count: item.count, category: item.category })
          })
        }
        
        console.log('[Tracker] Loaded today count from database:', todayCount)
      }
    } else {
      // 数据库中没有今天的数据，初始化为空
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
    // 出错时重置为默认值
    todayCount = 0
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultCategoryCount()
    comboCounts = createDefaultComboCounts()
    keyCountMap.clear()
  }
}

// ============================================================
// 原生二进制路径获取
// ============================================================

/**
 * 获取原生二进制文件路径
 * 
 * macOS 使用原生二进制监听键盘，因为需要较低级别的系统权限
 * 
 * @returns 二进制文件的绝对路径
 */
function getBinPath(): string {
  const isWin = process.platform === 'win32'
  const binName = isWin ? 'keytracker-win.exe' : 'keytracker-mac'

  if (app.isPackaged) {
    // 生产环境
    return join(app.getAppPath(), 'src', 'bin', binName)
  } else {
    // 开发环境
    return join(process.cwd(), 'src', 'bin', binName)
  }
}

// ============================================================
// 键盘监听器启动
// ============================================================

/**
 * 启动键盘监听器
 * 
 * 根据平台选择不同的实现：
 * - Windows: 使用 node-global-key-listener
 * - macOS: 使用原生二进制文件
 * 
 * @param mainWindow - 主窗口引用，用于发送更新事件
 */
export async function startKeyboardTracker(mainWindow: BrowserWindow | null): Promise<void> {
  mainWindowRef = mainWindow

  console.log('[Tracker] Platform:', process.platform)
  console.log('[Tracker] Performance config:', PERF_CONFIG)

  // 初始化系统状态监听
  initSystemStateMonitoring()

  if (process.platform === 'win32') {
    await startWindowsKeyboardTracker()
  } else {
    startMacKeyboardTracker()
  }
}

// ============================================================
// Windows 键盘监听器
// ============================================================

/**
 * 启动 Windows 键盘监听器
 * 
 * 使用 node-global-key-listener 库，该库通过 WinKeyServer.exe
 * 实现全局键盘钩子
 */
async function startWindowsKeyboardTracker(): Promise<void> {
  console.log('[Tracker] Starting Windows keyboard tracker with node-global-key-listener...')
  console.log('[Tracker] WinKeyServer.exe path:', getWinKeyServerPath())

  // 检查二进制文件是否存在
  if (!existsSync(getWinKeyServerPath())) {
    console.error('[Tracker] WinKeyServer.exe not found at:', getWinKeyServerPath())
    console.error('[Tracker] Please run: npm install')
    return
  }

  try {
    // 创建监听器实例
    keyboardListener = new GlobalKeyboardListener({
      windows: {
        serverPath: getWinKeyServerPath(),
        onError: (errorCode) => console.error('[WinKeyServer] ERROR: ' + errorCode),
        onInfo: (info) => console.info('[WinKeyServer] INFO: ' + info)
      }
    })

    // 添加按键监听器
    // 注意：回调必须是同步的，不能是 async！
    keyboardListener.addListener((e, down) => {
      // 过滤鼠标事件 (keyCode 1-6 是鼠标按键)
      const keyCode = e.vKey
      if (keyCode >= 1 && keyCode <= 6) {
        return false
      }

      if (e.state === 'DOWN') {
        const keyName = e.name?.toLowerCase() || 'unknown'

        // 检测组合键
        const combo = detectWindowsCombo(keyName, down)
        if (combo) {
          onComboPress(combo)
        }

        // 获取按键分类并处理
        const category = getKeyCategory(keyName)
        onKeyPress(category, keyName, Date.now())
      }

      // 返回 false 确保按键事件继续传递到其他应用程序
      return false
    })

    console.log('[Tracker] Windows keyboard tracker started successfully')

    // 应用退出时停止监听器
    process.on('exit', () => {
      if (keyboardListener) {
        keyboardListener.kill()
        keyboardListener = null
      }
    })
  } catch (error) {
    console.error('[Tracker] Failed to start Windows keyboard tracker:', error)
  }
}

/**
 * 检测 Windows 组合键
 * 
 * 根据 down 对象中当前按下的修饰键判断是否为组合键
 * 
 * @param key - 当前按下的键名
 * @param down - 当前所有按下键的状态对象
 * @returns 组合键名称，如果不是组合键则返回 null
 */
function detectWindowsCombo(key: string, down: Record<string, boolean>): string | null {
  // 获取修饰键状态
  const hasCtrl = down['LEFT CTRL'] || down['RIGHT CTRL']
  const hasShift = down['LEFT SHIFT'] || down['RIGHT SHIFT']
  const hasAlt = down['LEFT ALT'] || down['RIGHT ALT']
  const hasWin = down['LEFT META'] || down['RIGHT META']

  // ---------- Ctrl 组合键 ----------
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

  // ---------- Ctrl+Shift 组合键 ----------
  if (hasCtrl && hasShift && !hasAlt) {
    if (key === 'z') return 'REDO'
    if (key === 't') return 'REOPEN_TAB'
    if (key === 'tab') return 'PREV_TAB'
    if (key === 'esc') return 'TASK_MANAGER'
  }

  // ---------- Alt 组合键 ----------
  if (hasAlt && !hasCtrl && !hasShift) {
    if (key === 'tab') return 'SWITCH_APP'
    if (key === 'f4') return 'CLOSE_WINDOW'
  }

  // ---------- Win 组合键 ----------
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
 * 
 * 将按键按类型分组，用于分类统计
 * 
 * @param key - 按键名称
 * @returns 分类名称
 */
function getKeyCategory(key: string): string {
  const lowerKey = key.toLowerCase()

  // 字母键 A-Z
  if (/^[a-z]$/.test(lowerKey)) return 'letter'

  // 数字键 0-9
  if (/^[0-9]$/.test(lowerKey)) return 'number'

  // 功能键 F1-F24
  if (lowerKey.startsWith('f') && /^f([1-9]|1[0-9]|2[0-4])$/.test(lowerKey)) return 'function'

  // 控制键
  const controlKeys = ['space', 'enter', 'return', 'tab', 'backspace', 'delete', 'escape',
    'up', 'down', 'left', 'right', 'home', 'end', 'pageup', 'pagedown', 'insert',
    'page up', 'page down']
  if (controlKeys.includes(lowerKey)) return 'control'

  // 修饰键
  const modifierKeys = ['left ctrl', 'right ctrl', 'left shift', 'right shift',
    'left alt', 'right alt', 'left meta', 'right meta', 'capslock',
    'ctrl', 'shift', 'alt', 'meta', 'command', 'windows']
  if (modifierKeys.includes(lowerKey)) return 'modifier'

  // 符号键
  const symbolKeys = ['`', '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/',
    'comma', 'period', 'slash', 'backslash', 'semicolon', 'quote', 'grave']
  if (symbolKeys.includes(lowerKey)) return 'symbol'

  // 数字键盘
  if (lowerKey.startsWith('numpad') || lowerKey.startsWith('num ')) return 'number'

  return 'other'
}

// ============================================================
// macOS 键盘监听器
// ============================================================

/**
 * 启动 macOS 键盘监听器
 * 
 * 使用原生二进制文件，通过 child_process 启动
 * 二进制文件输出按键事件到 stdout
 */
function startMacKeyboardTracker(): void {
  const binPath = getBinPath()

  console.log('[Tracker] Binary path:', binPath)

  // 检查二进制文件是否存在
  if (!existsSync(binPath)) {
    console.error('[Tracker] Binary file not found:', binPath)
    console.error('[Tracker] Please compile the native binary first:')
    console.error('  macOS: cd native/macos && clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac')
    return
  }

  console.log('[Tracker] Binary file exists, spawning...')

  // 启动二进制进程
  const tracker = spawn(binPath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  console.log('[Tracker] Keyboard tracker started, PID:', tracker.pid)

  // 监听标准输出
  tracker.stdout.on('data', (data: Buffer) => {
    // 处理不同平台的换行符
    const lines = data.toString().replace(/\r\n/g, '\n').split('\n')
    
    lines.forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      
      if (trimmed.startsWith('KEYDOWN')) {
        // 解析格式: KEYDOWN:category:keyName:timestamp
        const parts = trimmed.split(':')
        if (parts.length >= 4) {
          const category = parts[1]
          const keyName = parts[2]
          const timestamp = parseInt(parts[3], 10)
          onKeyPress(category, keyName, timestamp)
        } else if (parts.length === 3) {
          // 兼容旧格式
          const category = parts[1]
          const keyName = parts[2]
          onKeyPress(category, keyName, Date.now())
        }
      } else if (trimmed.startsWith('COMBO')) {
        // 处理组合键: COMBO:comboName
        const parts = trimmed.split(':')
        if (parts.length >= 2) {
          const comboName = parts[1]
          onComboPress(comboName)
        }
      }
    })
  })

  // 监听错误输出
  tracker.stderr.on('data', (data: Buffer) => {
    console.error('[Tracker] Error:', data.toString())
  })

  // 监听进程错误
  tracker.on('error', (error) => {
    console.error('[Tracker] Failed to start keyboard tracker:', error.message)
  })

  // 监听进程退出
  tracker.on('exit', (code) => {
    console.log('[Tracker] Process exited with code:', code)
  })

  // 应用退出时停止
  process.on('exit', () => {
    tracker.kill()
  })
}

// ============================================================
// UI 更新发送
// ============================================================

/**
 * 发送节流更新的 UI 更新
 * 
 * 悬浮球和主窗口分开控制更新频率：
 * - 悬浮球：50ms 间隔，更实时
 * - 主窗口：100ms 间隔，节省性能
 */
function sendThrottledUpdate(): void {
  const now = Date.now()

  // 更新悬浮窗计数
  if (now - lastFloatingUpdateTime >= PERF_CONFIG.FLOATING_UPDATE_INTERVAL) {
    lastFloatingUpdateTime = now
    if (floatingWindowUpdater) {
      floatingWindowUpdater(todayCount)
    }
  }

  // 主窗口更新（节流）
  if (now - lastUIUpdateTime < PERF_CONFIG.UI_UPDATE_INTERVAL) {
    if (!pendingUpdate) {
      pendingUpdate = true
      const delay = PERF_CONFIG.UI_UPDATE_INTERVAL - (now - lastUIUpdateTime)
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
 * 
 * 通过 IPC 发送 keystroke-update 事件，包含所有统计数据
 */
function sendMainWindowUpdate(): void {
  lastUIUpdateTime = Date.now()

  // 序列化称号数据（移除函数属性，因为不能通过 IPC 传输）
  const serializedTitle = currentTitle ? {
    id: currentTitle.id,
    name: currentTitle.name,
    description: currentTitle.description,
    icon: currentTitle.icon,
    color: currentTitle.color,
  } : null

  // 发送更新到渲染进程
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

// ============================================================
// 按键事件处理
// ============================================================

/**
 * 处理组合键事件
 * 
 * @param comboName - 组合键名称
 */
function onComboPress(comboName: string): void {
  // 更新组合键计数
  if (comboName in comboCounts) {
    comboCounts[comboName as keyof ComboCounts]++
  } else {
    comboCounts.OTHER++
  }

  // 检查是否解锁新称号
  const newTitle = calculateCurrentTitle()
  if (newTitle && newTitle.id !== currentTitle?.id) {
    currentTitle = newTitle
    console.log('[Tracker] New title unlocked:', newTitle.name)
  }

  // 触发 UI 更新
  sendThrottledUpdate()

  // 立即保存到数据库（确保数据不丢失）
  saveKeystrokeData()
}

/**
 * 处理按键事件（入口函数）
 * 
 * @param category - 按键分类
 * @param keyName - 按键名称
 * @param timestamp - 时间戳
 */
function onKeyPress(category: string, keyName: string, timestamp: number = Date.now()): void {
  processKeyEvent(category, keyName, timestamp)
}

/**
 * 获取 TOP N 按键
 * 
 * @param n - 返回的数量
 * @returns 按使用次数降序排列的按键列表
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
  return items.sort((a, b) => b.count - a.count).slice(0, n)
}

/**
 * 保存按键数据到数据库
 */
async function saveKeystrokeData(): Promise<void> {
  try {
    const db = getDatabase()
    const today = getLocalDateString()
    const hour = getCurrentHour()

    // 检查是否跨天
    if (today !== todayDate) {
      console.log('[Tracker] Date changed from', todayDate, 'to', today)
      // 保存旧数据并重置（已在 initTodayCount 中处理）
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

    // 更新统计数据
    todayStat.totalCount = todayCount
    todayStat.hourlyDistribution = [...hourlyCounts]
    todayStat.categoryCount = { ...categoryCounts }
    todayStat.topKeys = getTopKeys(20)
    todayStat.comboCounts = { ...comboCounts }

    // 计算活跃小时数
    todayStat.activeHours = todayStat.hourlyDistribution.filter((h: number) => h > 0).length

    // 更新索引和数据库
    upsertDailyStat(todayStat)
    await saveData()

    console.log('[Tracker] Saved keystrokes today:', todayCount)
  } catch (error) {
    console.error('[Tracker] Failed to save keystroke data:', error)
  }
}

// ============================================================
// 导出的 getter 函数
// ============================================================

/** 获取今日按键数 */
export function getTodayCount(): number {
  return todayCount
}

/** 获取今日小时分布 */
export function getHourlyDistribution(): number[] {
  return [...hourlyCounts]
}

/**
 * 强制保存当前数据到数据库
 * 
 * 用于应用退出前确保数据不丢失
 */
export async function flushData(): Promise<void> {
  console.log('[Tracker] Flushing data to database...')

  try {
    const db = getDatabase()

    // 保存内存中的数据
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

    upsertDailyStat(memoryDateStat)
    await saveData()
    
    console.log('[Tracker] Data flushed successfully for date:', todayDate)
  } catch (error) {
    console.error('[Tracker] Failed to flush data:', error)
  }
}

/** 重置今日计数 */
export function resetTodayCount(): void {
  todayCount = 0
  hourlyCounts = new Array(24).fill(0)
  categoryCounts = createDefaultCategoryCount()
  keyCountMap.clear()
}

/** 获取分类统计 */
export function getCategoryCounts(): KeyCategoryCount {
  return { ...categoryCounts }
}

/** 获取高频按键 */
export function getTodayTopKeys(n: number = 20): TopKeyItem[] {
  return getTopKeys(n)
}

/** 获取组合键统计 */
export function getComboCounts(): ComboCounts {
  return { ...comboCounts }
}

/** 获取当前称号 */
export function getCurrentTitle(): Title | null {
  return currentTitle
}

/** 获取已解锁称号列表 */
export function getUnlockedTitlesList(): Title[] {
  return getUnlockedTitles()
}

// ============================================================
// 系统状态监听（锁屏、休眠检测）
// ============================================================

/**
 * 初始化系统状态监听
 * 
 * 监听以下事件：
 * - 锁屏/解锁：暂停/恢复采集
 * - 休眠/唤醒：保存数据/恢复采集
 * - 关机：保存数据
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
    checkAndHandleDateChange()
  })

  // 监听系统休眠
  powerMonitor.on('suspend', () => {
    console.log('[Tracker] System suspended - pausing tracker')
    isSystemSuspended = true
    isTrackerPaused = true
    flushData()
  })

  // 监听系统唤醒
  powerMonitor.on('resume', () => {
    console.log('[Tracker] System resumed - resuming tracker')
    isSystemSuspended = false
    isTrackerPaused = false
    checkAndHandleDateChange()
  })

  // 监听系统关机
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
    saveKeystrokeData()
    todayCount = 0
    todayDate = today
    hourlyCounts = new Array(24).fill(0)
    categoryCounts = createDefaultCategoryCount()
    keyCountMap.clear()
    initTodayCount()
  }
}

/**
 * 检查系统是否处于空闲状态
 */
function isSystemIdle(): boolean {
  return isScreenLocked || isSystemSuspended || isTrackerPaused
}

// ============================================================
// 内存监控与清理
// ============================================================

/**
 * 检查内存使用情况
 */
function checkMemoryUsage(): void {
  const now = Date.now()
  if (now - lastMemoryCheck < 60000) return  // 每分钟检查一次
  lastMemoryCheck = now

  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const rssMB = Math.round(usage.rss / 1024 / 1024)

  console.log(`[Tracker] Memory usage: Heap ${heapUsedMB}MB, RSS ${rssMB}MB`)

  if (rssMB > PERF_CONFIG.MEMORY_LIMIT_MB) {
    console.log(`[Tracker] Memory limit exceeded, cleaning up...`)
    performMemoryCleanup()
  }
}

/**
 * 执行内存清理
 */
function performMemoryCleanup(): void {
  // 限制 keyCountMap 大小
  if (keyCountMap.size > PERF_CONFIG.MAX_KEY_BUFFER_SIZE) {
    const sorted = Array.from(keyCountMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 500)
    keyCountMap.clear()
    sorted.forEach(([key, value]) => keyCountMap.set(key, value))
    console.log('[Tracker] Cleaned up keyCountMap, new size:', keyCountMap.size)
  }

  // 清理打字速度历史
  if (typingSpeeds.length > 10) {
    typingSpeeds = typingSpeeds.slice(-10)
  }

  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc()
    console.log('[Tracker] Forced garbage collection')
  }
}

// ============================================================
// 节流处理的按键事件处理
// ============================================================

/**
 * 处理按键事件（带节流）
 * 
 * 使用节流机制避免高频按键事件占用过多 CPU
 */
function processKeyEvent(category: string, keyName: string, timestamp: number = Date.now()): void {
  const now = Date.now()

  // 如果系统处于暂停状态，不处理
  if (isSystemIdle()) {
    return
  }

  // 检查内存使用
  checkMemoryUsage()

  // 将事件加入队列
  pendingKeyEvents.push({ category, keyName, timestamp })

  // 如果已经有定时器在等待，不重复创建
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
 */
function processSingleKeyEvent(category: string, keyName: string, _timestamp: number): void {
  // 更新总计数
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

  // 更新打字速度
  updateTypingSpeed()

  // 检查是否解锁新称号
  const newTitle = calculateCurrentTitle()
  if (newTitle && newTitle.id !== currentTitle?.id) {
    currentTitle = newTitle
    console.log('[Tracker] New title unlocked:', newTitle.name)
  }

  // 节流发送 UI 更新
  sendThrottledUpdate()

  // 检查是否需要保存（每 50 次按键或 30 秒）
  const now = Date.now()
  if (todayCount % 50 === 0 || (now - lastSaveTime > PERF_CONFIG.SAVE_MIN_INTERVAL)) {
    saveKeystrokeData()
    lastSaveTime = now
  }
}

// ============================================================
// 性能统计
// ============================================================

/**
 * 获取性能统计信息
 * 
 * @returns 包含内存使用、暂停状态等信息的对象
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
    cpuPercent: 0,  // Electron 不直接提供 CPU 使用率
    isPaused: isTrackerPaused,
    pendingEvents: pendingKeyEvents.length,
    lastSaveTime,
  }
}