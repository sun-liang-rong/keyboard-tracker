/**
 * index.ts - Electron 主进程入口
 *
 * 功能说明：
 * 这是 Electron 应用的主入口文件，负责：
 * 1. 创建和管理应用窗口（主窗口、悬浮窗）
 * 2. 创建系统托盘图标
 * 3. 注册 IPC 通信处理器
 * 4. 管理应用生命周期（启动、退出）
 * 5. 初始化数据库和键盘监听器
 */

// ============================================================
// 进程级别错误处理（必须在最前面）
// ============================================================

// 忽略 Windows EPIPE 错误（管道断开时写入会触发）
// 这是唯一可靠的方式处理此类错误
process.on('uncaughtException', (error: Error) => {
  // 检查是否是 EPIPE 错误（多种检测方式）
  const isEpipe = (
    (error as any).code === 'EPIPE' ||
    error.message?.includes('EPIPE') ||
    error.message?.includes('broken pipe') ||
    error.name === 'SystemError'
  )
  if (isEpipe) {
    return // 静默忽略
  }
  // 其他错误正常抛出
  throw error
})

process.on('unhandledRejection', (reason: any) => {
  // 检查是否是 EPIPE 相关错误
  const isEpipe = (
    reason?.code === 'EPIPE' ||
    (typeof reason === 'string' && reason.includes('EPIPE')) ||
    reason?.message?.includes('EPIPE') ||
    reason?.message?.includes('broken pipe')
  )
  if (isEpipe) {
    return
  }
  // 不使用 console.error，避免再次触发错误
})

// ============================================================
// 安全日志工具
// ============================================================

function safeLog(..._args: unknown[]): void {
  // 完全静默，不输出任何日志到 stdout
  // 在 Windows 上，stdout 管道随时可能断开
}

function safeError(..._args: unknown[]): void {
  // 完全静默，不输出任何日志到 stderr
}

// ============================================================
// 依赖导入
// ============================================================

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

// 导入 tracker 模块的函数
import {
  startKeyboardTracker,
  getTodayCount,
  getActiveMinutes,
  initTodayCount,
  flushData,
  setFloatingWindowUpdater,
  getCategoryCounts,
  getTodayTopKeys,
  getComboCounts,
  getCurrentTitle,
  getUnlockedTitlesList,
  initSystemStateMonitoring,
} from './tracker'

// 导入 database 模块的函数
import {
  initDatabase,
  saveData,
  getDatabase,
  findDailyStatsByDate,
  getOrCreateDailyStats,
  getHourlyDistribution as dbGetHourlyDistribution,
  getHourlyActiveMinutes,
  getTopKeyStatsByDate,
  extractCategoryCount,
  extractComboCounts,
} from './database'

// 从共享模块导入日期工具函数
import { getLocalDateString, formatLocalDate } from '../shared/utils'

// ============================================================
// 图标处理工具函数
// ============================================================

function getAppIcon(): Electron.NativeImage {
  if (cachedAppIcon) {
    return cachedAppIcon
  }

  const iconPath = getIconPath()
  safeLog('[Main] Loading icon from:', iconPath)
  safeLog('[Main] Icon file exists:', existsSync(iconPath))

  try {
    const icon = nativeImage.createFromPath(iconPath)
    const size = icon.getSize()
    safeLog('[Main] Icon loaded, size:', size, 'isEmpty:', icon.isEmpty())

    if (process.platform === 'win32') {
      if (!icon.isEmpty()) {
        try {
          const resizedIcon = icon.resize({ width: 256, height: 256 })
          safeLog('[Main] Resized icon for Windows:', resizedIcon.getSize())
          return resizedIcon
        } catch (e) {
          safeLog('[Main] Failed to resize icon, using original:', e)
          return icon
        }
      }
    }
    cachedAppIcon = icon
    return icon
  } catch (error) {
    safeError('[Main] Failed to load icon:', error)
    return nativeImage.createEmpty()
  }
}

function getIconPath(): string {
  if (app.isPackaged) {
    if (process.platform === 'win32') {
      const icoPath = join(process.resourcesPath, 'public', 'logo.ico')
      if (existsSync(icoPath)) {
        return icoPath
      }
      return join(process.resourcesPath, 'public', 'logo.png')
    }
    return join(process.resourcesPath, 'public', 'logo.png')
  } else {
    if (process.platform === 'win32') {
      const icoPath = join(process.cwd(), 'public', 'logo.ico')
      if (existsSync(icoPath)) {
        return icoPath
      }
      return join(process.cwd(), 'public', 'logo.png')
    }
    return join(process.cwd(), 'public', 'logo.png')
  }
}

// ============================================================
// 全局变量
// ============================================================

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let tray: Tray | null = null
let dateCheckInterval: NodeJS.Timeout | null = null
let isQuitting = false
let cachedAppIcon: Electron.NativeImage | null = null

// ============================================================
// 辅助函数
// ============================================================

function isWindowValid(win: BrowserWindow | null): boolean {
  return win !== null && !win.isDestroyed()
}

function showMainWindow(): void {
  if (!isWindowValid(mainWindow)) {
    createMainWindow()
  } else {
    if (!mainWindow!.isVisible()) {
      mainWindow!.show()
    }
    mainWindow!.focus()
  }
}

// ============================================================
// 常量定义
// ============================================================

const DATE_CHECK_INTERVAL_MS = 60000

// ============================================================
// IPC 处理程序注册
// ============================================================

safeLog('[Main] Registering IPC handlers...')

ipcMain.removeHandler('get-today-stats')
ipcMain.removeHandler('get-stats-by-date')
ipcMain.removeHandler('get-week-stats')
ipcMain.removeHandler('get-month-stats')
ipcMain.removeHandler('get-settings')
ipcMain.removeHandler('save-settings')
ipcMain.removeHandler('minimize-window')
ipcMain.removeHandler('close-window')

/**
 * IPC: 获取今日统计数据
 */
ipcMain.handle('get-today-stats', async () => {
  const today = getLocalDateString()

  try {
    const todayStats = getOrCreateDailyStats(today)

    // 优先使用内存中的计数（实时更新）
    const count = getTodayCount() || todayStats.total_keystrokes
    // 优先使用内存中的活跃分钟数（实时更新）
    const activeMins = getActiveMinutes() || todayStats.active_minutes

    // 获取小时分布
    const hourlyDist = dbGetHourlyDistribution(today)
    const hourlyActiveMins = getHourlyActiveMinutes(today)

    // 获取分类统计
    const categoryCount = getCategoryCounts()

    // 获取 TOP Keys
    const topKeys = getTodayTopKeys(20)

    // 获取组合键统计
    const comboCounts = getComboCounts()

    // 当前称号
    const rawCurrentTitle = getCurrentTitle()
    const currentTitle = rawCurrentTitle ? {
      id: rawCurrentTitle.id,
      name: rawCurrentTitle.name,
      description: rawCurrentTitle.description,
      icon: rawCurrentTitle.icon,
      color: rawCurrentTitle.color,
    } : null

    // 已解锁称号列表
    const rawUnlockedTitles = getUnlockedTitlesList()
    const unlockedTitles = rawUnlockedTitles.map(title => ({
      id: title.id,
      name: title.name,
      description: title.description,
      icon: title.icon,
      color: title.color,
    }))

    safeLog('[Main] get-today-stats called, count:', count, 'active minutes:', activeMins)

    return {
      count,
      activeMinutes: activeMins,
      peakHour: todayStats.peak_hour,
      hourlyDistribution: hourlyDist,
      hourlyActiveMinutes: hourlyActiveMins,
      categoryCount,
      topKeys,
      comboCounts,
      currentTitle,
      unlockedTitles,
    }
  } catch (error) {
    safeError('[Main] Failed to get today stats:', error)
    return {
      count: getTodayCount(),
      activeMinutes: getActiveMinutes(),
      peakHour: 0,
      hourlyDistribution: new Array(24).fill(0),
      hourlyActiveMinutes: new Array(24).fill(0),
      categoryCount: getCategoryCounts(),
      topKeys: getTodayTopKeys(20),
      comboCounts: getComboCounts(),
      currentTitle: null,
      unlockedTitles: [],
    }
  }
})

/**
 * IPC: 按日期获取统计数据
 */
ipcMain.handle('get-stats-by-date', async (_, date: string) => {
  try {
    const stats = findDailyStatsByDate(date)
    const today = getLocalDateString()

    // 如果是今天，优先使用内存数据
    if (date === today) {
      const rawCurrentTitle = getCurrentTitle()
      const rawUnlockedTitles = getUnlockedTitlesList()

      return {
        count: getTodayCount() || (stats?.total_keystrokes || 0),
        activeMinutes: stats?.active_minutes || 0,
        peakHour: stats?.peak_hour || 0,
        hourlyDistribution: dbGetHourlyDistribution(date),
        hourlyActiveMinutes: getHourlyActiveMinutes(date),
        categoryCount: getCategoryCounts(),
        topKeys: getTodayTopKeys(20),
        comboCounts: getComboCounts(),
        currentTitle: rawCurrentTitle ? {
          id: rawCurrentTitle.id,
          name: rawCurrentTitle.name,
          description: rawCurrentTitle.description,
          icon: rawCurrentTitle.icon,
          color: rawCurrentTitle.color,
        } : null,
        unlockedTitles: rawUnlockedTitles.map(title => ({
          id: title.id,
          name: title.name,
          description: title.description,
          icon: title.icon,
          color: title.color,
        })),
      }
    }

    // 历史日期：从数据库读取
    return {
      count: stats?.total_keystrokes || 0,
      activeMinutes: stats?.active_minutes || 0,
      peakHour: stats?.peak_hour || 0,
      hourlyDistribution: dbGetHourlyDistribution(date),
      hourlyActiveMinutes: getHourlyActiveMinutes(date),
      categoryCount: stats ? extractCategoryCount(stats) : {
        letter: 0, number: 0, function: 0, control: 0, symbol: 0, modifier: 0, other: 0
      },
      topKeys: getTopKeyStatsByDate(date, 20),
      comboCounts: stats ? extractComboCounts(stats) : {
        COPY: 0, PASTE: 0, CUT: 0, SELECT_ALL: 0, UNDO: 0, REDO: 0,
        SAVE: 0, FIND: 0, PRINT: 0, NEW: 0, OPEN: 0, CLOSE_TAB: 0,
        NEW_TAB: 0, REOPEN_TAB: 0, NEXT_TAB: 0, PREV_TAB: 0,
        QUIT_APP: 0, HIDE_APP: 0, MINIMIZE: 0, SPOTLIGHT: 0,
        TASK_MANAGER: 0, SWITCH_APP: 0, CLOSE_WINDOW: 0,
        SHOW_DESKTOP: 0, OPEN_EXPLORER: 0, RUN_DIALOG: 0,
        LOCK_SCREEN: 0, TASK_VIEW: 0, SNIPPING_TOOL: 0,
        NEW_FOLDER: 0, OTHER: 0
      },
      currentTitle: null,
      unlockedTitles: [],
    }
  } catch (error) {
    safeError('[Main] Failed to get stats by date:', error)
    return {
      count: 0,
      activeMinutes: 0,
      peakHour: 0,
      hourlyDistribution: new Array(24).fill(0),
      hourlyActiveMinutes: new Array(24).fill(0),
      categoryCount: {
        letter: 0, number: 0, function: 0, control: 0, symbol: 0, modifier: 0, other: 0
      },
      topKeys: [],
      comboCounts: {
        COPY: 0, PASTE: 0, CUT: 0, SELECT_ALL: 0, UNDO: 0, REDO: 0,
        SAVE: 0, FIND: 0, PRINT: 0, NEW: 0, OPEN: 0, CLOSE_TAB: 0,
        NEW_TAB: 0, REOPEN_TAB: 0, NEXT_TAB: 0, PREV_TAB: 0,
        QUIT_APP: 0, HIDE_APP: 0, MINIMIZE: 0, SPOTLIGHT: 0,
        TASK_MANAGER: 0, SWITCH_APP: 0, CLOSE_WINDOW: 0,
        SHOW_DESKTOP: 0, OPEN_EXPLORER: 0, RUN_DIALOG: 0,
        LOCK_SCREEN: 0, TASK_VIEW: 0, SNIPPING_TOOL: 0,
        NEW_FOLDER: 0, OTHER: 0
      },
      currentTitle: null,
      unlockedTitles: [],
    }
  }
})

/**
 * IPC: 获取本周统计数据
 */
ipcMain.handle('get-week-stats', async () => {
  try {
    const today = new Date()
    const weekData = []
    const weekLabels = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatLocalDate(date)
      const dayStat = findDailyStatsByDate(dateStr)

      weekData.push(dayStat?.total_keystrokes || 0)

      const month = date.getMonth() + 1
      const day = date.getDate()
      weekLabels.push(`${month}/${day}`)
    }

    const totalCount = weekData.reduce((sum: number, count: number) => sum + count, 0)

    safeLog('[Main] get-week-stats called, total:', totalCount)
    return { totalCount, dailyCounts: weekData, labels: weekLabels }
  } catch (error) {
    safeError('[Main] Failed to get week stats:', error)
    return { totalCount: 0, dailyCounts: new Array(7).fill(0), labels: [] }
  }
})

/**
 * IPC: 获取本月统计数据
 */
ipcMain.handle('get-month-stats', async () => {
  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    const monthData = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatLocalDate(date)
      const dayStat = findDailyStatsByDate(dateStr)

      monthData.push({
        date: dateStr,
        count: dayStat?.total_keystrokes || 0,
        dayOfWeek: date.getDay(),
        weekNumber: Math.floor((day + firstDay.getDay() - 1) / 7),
      })
    }

    const totalCount = monthData.reduce((sum: number, d: { count: number }) => sum + d.count, 0)

    safeLog('[Main] get-month-stats called, total:', totalCount, 'days:', daysInMonth)
    return { totalCount, dailyData: monthData, daysInMonth }
  } catch (error) {
    safeError('[Main] Failed to get month stats:', error)
    return { totalCount: 0, dailyData: [], daysInMonth: 30 }
  }
})

/**
 * IPC: 获取应用设置
 */
ipcMain.handle('get-settings', async () => {
  try {
    const db = getDatabase()
    return db.data.settings
  } catch (error) {
    safeError('[Main] Failed to get settings:', error)
    return {
      autoStart: false,
      showFloatingWindow: true,
      dataRetentionDays: 90,
      theme: 'dark',
    }
  }
})

/**
 * IPC: 保存应用设置
 */
ipcMain.handle('save-settings', async (_, newSettings) => {
  safeLog('[Main] save-settings called:', newSettings)
  try {
    const db = getDatabase()
    db.data.settings = { ...db.data.settings, ...newSettings }
    await saveData()

    // 处理开机自启动
    if (newSettings.autoStart !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: newSettings.autoStart,
        openAsHidden: true, // macOS: 启动时隐藏窗口
        path: app.getPath('exe'), // Windows: 指定可执行文件路径
      })
      safeLog('[Main] Auto-start set to:', newSettings.autoStart)
    }

    return true
  } catch (error) {
    safeError('[Main] Failed to save settings:', error)
    return false
  }
})

/**
 * IPC: 最小化主窗口
 */
ipcMain.handle('minimize-window', () => {
  if (isWindowValid(mainWindow)) {
    mainWindow!.minimize()
  }

  try {
    if (isWindowValid(floatingWindow)) {
      floatingWindow!.show()
    }
  } catch (error) {
    safeError('[Main] Failed to show floating window on minimize:', error)
  }
})

/**
 * IPC: 关闭主窗口
 */
ipcMain.handle('close-window', () => {
  if (isWindowValid(mainWindow)) {
    mainWindow!.close()
  }
})

/**
 * IPC: 切换最大化状态
 */
ipcMain.handle('toggle-maximize', () => {
  if (isWindowValid(mainWindow)) {
    if (mainWindow!.isMaximized()) {
      mainWindow!.unmaximize()
      return false
    } else {
      mainWindow!.maximize()
      return true
    }
  }
  return false
})

/**
 * IPC: 获取当前最大化状态
 */
ipcMain.handle('is-maximized', () => {
  if (isWindowValid(mainWindow)) {
    return mainWindow!.isMaximized()
  }
  return false
})

// ============================================================
// 悬浮窗拖拽相关 IPC
// ============================================================

let dragOffset = { x: 0, y: 0 }

ipcMain.on('start-drag', (_, { x, y }) => {
  if (isWindowValid(floatingWindow)) {
    const [winX, winY] = floatingWindow!.getPosition()
    dragOffset.x = x - winX
    dragOffset.y = y - winY
  }
})

ipcMain.on('dragging', (_, { x, y }) => {
  if (isWindowValid(floatingWindow)) {
    const newX = x - dragOffset.x
    const newY = y - dragOffset.y
    floatingWindow!.setPosition(newX, newY)
  }
})

ipcMain.on('show-main-window', () => {
  showMainWindow()
  if (isWindowValid(floatingWindow)) {
    floatingWindow!.hide()
  }
})

ipcMain.handle('toggle-floating-window', async (_, show: boolean) => {
  if (isWindowValid(floatingWindow)) {
    if (show) {
      floatingWindow!.show()
    } else {
      floatingWindow!.hide()
    }
    return true
  }
  return false
})

ipcMain.on('set-floating-ignore-mouse', (_, ignore: boolean) => {
  if (isWindowValid(floatingWindow)) {
    floatingWindow!.setIgnoreMouseEvents(ignore, { forward: true })
  }
})

ipcMain.on('floating-window-ready', () => {
  safeLog('[Main] Floating window ready, sending initial count')
  if (isWindowValid(floatingWindow)) {
    const initialCount = getTodayCount()
    floatingWindow!.webContents.send('update-count', initialCount)
  }
})

safeLog('[Main] IPC handlers registered successfully')

// ============================================================
// 窗口创建函数
// ============================================================

function createMainWindow(): void {
  if (isWindowValid(mainWindow)) {
    safeLog('[Main] Main window already exists, skipping creation')
    return
  }

  const windowIcon = getAppIcon()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    frame: false,
    icon: windowIcon,
    show: false,
    backgroundColor: '#191c1e', // 暗色背景，避免白屏
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null)
  }

  // 禁用 Windows 窗口拖拽预览（显示 px * px 的预览框）
  mainWindow.on('will-resize', (e) => {
    e.preventDefault()
  })
  mainWindow.on('will-move', (e) => {
    e.preventDefault()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow!.on('minimize', () => {
    safeLog('[Main] Window minimized via system button, showing floating window')
    if (isWindowValid(floatingWindow)) {
      try {
        const db = getDatabase()
        if (db.data.settings.showFloatingWindow) {
          floatingWindow!.show()
        }
      } catch (error) {
        safeError('[Main] Failed to show floating window on minimize:', error)
      }
    }
  })

  mainWindow!.on('restore', () => {
    safeLog('[Main] Window restored, hiding floating window')
    if (isWindowValid(floatingWindow)) {
      floatingWindow!.hide()
    }
  })
}

function createFloatingWindow(): void {
  if (isWindowValid(floatingWindow)) {
    safeLog('[Main] Floating window already exists, skipping creation')
    return
  }

  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  floatingWindow = new BrowserWindow({
    width: 100,
    height: 30,
    useContentSize: true,
    x: width - 120,
    y: 100,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    thickFrame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  floatingWindow!.loadFile(join(__dirname, 'floating-window.html'))

  floatingWindow!.webContents.on('dom-ready', () => {
    const logoPath = getIconPath()
    const normalizedPath = logoPath.replace(/\\/g, '/')
    const fileUrl = normalizedPath.startsWith('file://') ? normalizedPath : `file://${normalizedPath}`
    if (isWindowValid(floatingWindow)) {
      floatingWindow!.webContents.send('logo-path', fileUrl)
      const initialCount = getTodayCount()
      floatingWindow!.webContents.send('update-count', initialCount)
    }
  })

  floatingWindow!.setSkipTaskbar(true)

  floatingWindow!.on('closed', () => {
    floatingWindow = null
  })
}

function createTray(): void {
  if (tray) {
    safeLog('[Main] Tray already exists, skipping creation')
    return
  }

  try {
    const icon = getAppIcon()
    if (icon.isEmpty()) {
      safeLog('[Main] Logo is empty, skipping tray creation')
      return
    }

    if (process.platform === 'darwin') {
      tray = new Tray(icon.resize({ width: 22, height: 22 }))
    } else {
      tray = new Tray(icon)
    }
    safeLog('[Main] Tray icon created successfully')
  } catch (error) {
    safeLog('[Main] Logo not found or failed to load, skipping tray creation:', error)
    return
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => {
        safeLog('[Main] Tray menu: show main window clicked')
        showMainWindow()
      }
    },
    { label: '今日统计', enabled: false },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('KeyboardTracker')
}

// ============================================================
// 应用生命周期
// ============================================================

app.whenReady().then(async () => {
  safeLog('[Main] App is ready, initializing...')

  if (process.platform === 'win32') {
    try {
      const icon = getAppIcon()
      safeLog('[Main] Windows icon loaded, isEmpty:', icon.isEmpty(), 'size:', icon.getSize())
      app.setAppUserModelId('com.keyboardtracker.app')
      safeLog('[Main] Windows UserModelId set')
    } catch (error) {
      safeError('[Main] Failed to set Windows taskbar icon:', error)
    }
  }

  if (process.platform === 'darwin') {
    try {
      const dockIcon = nativeImage.createFromPath(getIconPath())
      app.dock.setIcon(dockIcon)
      safeLog('[Main] Dock icon set')
    } catch (error) {
      safeError('[Main] Failed to set dock icon:', error)
    }
  }

  // 先创建窗口，让用户尽快看到界面
  createMainWindow()
  createTray()
  createFloatingWindow()

  // 设置窗口显示逻辑
  if (mainWindow) {
    const win = mainWindow
    win.once('ready-to-show', () => {
      if (isWindowValid(win)) {
        if (process.platform === 'win32') {
          try {
            if (cachedAppIcon && !cachedAppIcon.isEmpty()) {
              win.setIcon(cachedAppIcon)
              safeLog('[Main] Window icon set for Windows taskbar')
            }
          } catch (error) {
            safeError('[Main] Failed to set window icon:', error)
          }
        }

        if (process.platform === 'darwin') {
          setTimeout(() => {
            if (isWindowValid(win)) {
              safeLog('[Main] Showing main window after Dock icon set')
              win.show()
              win.focus()
            }
          }, 100)
        } else {
          win.show()
          win.focus()
        }
      }
    })
  }

  // 异步初始化数据库和其他组件（不阻塞窗口显示）
  ;(async () => {
    try {
      await initDatabase()
      safeLog('[Main] Database initialized')
      const db = getDatabase()
      const dbPath = join(app.getPath('userData'), 'keyboard-tracker-db.json')
      safeLog('[Main] Database file path:', dbPath)
      safeLog('[Main] Daily stats count:', db.data.dailyStats.length)

      // 同步开机自启动设置（应用启动时根据数据库设置系统登录项）
      const settings = db.data.settings
      if (settings.autoStart) {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: true,
          path: app.getPath('exe'),
        })
        safeLog('[Main] Auto-start enabled from settings')
      }
    } catch (error) {
      safeError('[Main] Failed to initialize database:', error)
    }

    try {
      await initTodayCount()
      safeLog('[Main] Today count initialized')
    } catch (error) {
      safeError('[Main] Failed to initialize today count:', error)
    }

    try {
      initSystemStateMonitoring()
      safeLog('[Main] System state monitoring initialized')
    } catch (error) {
      safeError('[Main] Failed to initialize system state monitoring:', error)
    }

    setFloatingWindowUpdater((count: number) => {
      if (isWindowValid(floatingWindow)) {
        floatingWindow!.webContents.send('update-count', count)
      }
    })

    try {
      if (isWindowValid(floatingWindow)) {
        floatingWindow!.hide()
      }
    } catch (error) {
      safeError('[Main] Failed to hide floating window:', error)
    }

    safeLog('[Main] Starting keyboard tracker...')
    await startKeyboardTracker(mainWindow)

    if (dateCheckInterval) {
      clearInterval(dateCheckInterval)
      dateCheckInterval = null
    }

    dateCheckInterval = setInterval(async () => {
      await initTodayCount()
    }, DATE_CHECK_INTERVAL_MS)

    safeLog('[Main] Initialization complete')
  })()
})

app.on('before-quit', (event) => {
  if (isQuitting) {
    return
  }

  safeLog('[Main] App quitting, saving data...')
  event.preventDefault()
  isQuitting = true

  flushData().then(() => {
    safeLog('[Main] Data saved successfully')
    app.exit(0)
  }).catch((error) => {
    safeError('[Main] Failed to save data:', error)
    app.exit(1)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  safeLog('[Main] App activated via Dock click')
  showMainWindow()
})