import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { startKeyboardTracker, getTodayCount, initTodayCount, getHourlyDistribution, flushData, setFloatingWindowUpdater, getCategoryCounts, getTodayTopKeys, getComboCounts, getCurrentTitle, getUnlockedTitlesList, initSystemStateMonitoring, getTodayPatternSummary, getPatternHistory, detectSlackDuringWork, analyzeGamingImpact } from './tracker'
import { initDatabase, saveData, getDatabase, findDailyStatByDate, createDefaultComboCounts } from './database'

/**
 * 获取图标路径
 * 开发环境: 从项目 public 目录
 * 生产环境: 从应用资源目录
 */
function getIconPath(): string {
  if (app.isPackaged) {
    // 生产环境: resources/public/logo.png
    return join(process.resourcesPath, 'public', 'logo.png')
  } else {
    // 开发环境: 项目根目录/public/logo.png
    return join(process.cwd(), 'public', 'logo.png')
  }
}


// 全局窗口引用
let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let tray: Tray | null = null
let dateCheckInterval: NodeJS.Timeout | null = null
export let isQuitting = false // 防止递归退出


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
 * 将 Date 对象转换为本地时区的日期字符串 YYYY-MM-DD
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ========== IPC 处理程序（全局注册，确保先注册）==========
console.log('[Main] Registering IPC handlers...')

// 先移除可能存在的旧 handler
ipcMain.removeHandler('get-today-stats')
ipcMain.removeHandler('get-stats-by-date')
ipcMain.removeHandler('get-week-stats')
ipcMain.removeHandler('get-month-stats')
ipcMain.removeHandler('get-settings')
ipcMain.removeHandler('save-settings')
ipcMain.removeHandler('minimize-window')
ipcMain.removeHandler('close-window')

// 统计数据 API - 从数据库读取今日数据
ipcMain.handle('get-today-stats', async () => {
  const today = getLocalDateString()

  try {
    const todayStat = findDailyStatByDate(today)

    // 优先使用内存中的计数（实时更新），如果没有则使用数据库
    const count = getTodayCount() || (todayStat?.totalCount || 0)
    // 优先使用内存中的小时分布（实时更新）
    const hourlyDist = getHourlyDistribution().length === 24
      ? getHourlyDistribution()
      : (todayStat?.hourlyDistribution || new Array(24).fill(0))
    // 优先使用内存中的分类统计
    const categoryCount = getCategoryCounts()
    // 优先使用内存中的 TOP Keys
    const topKeys = getTodayTopKeys(20)
    // 优先使用内存中的组合键统计（应用刚启动时内存为0，使用数据库）
    const memoryComboCounts = getComboCounts()
    const hasComboData = Object.values(memoryComboCounts).some(count => count > 0)
    const comboCounts = hasComboData ? memoryComboCounts : (todayStat?.comboCounts || createDefaultComboCounts())
    console.log('[Main] comboCounts source:', hasComboData ? 'memory' : 'database', 'value:', comboCounts)
    // 当前称号（序列化，移除函数）
    const rawCurrentTitle = getCurrentTitle()
    const currentTitle = rawCurrentTitle ? {
      id: rawCurrentTitle.id,
      name: rawCurrentTitle.name,
      description: rawCurrentTitle.description,
      icon: rawCurrentTitle.icon,
      color: rawCurrentTitle.color,
    } : null
    // 已解锁称号列表（序列化，移除函数）
    const rawUnlockedTitles = getUnlockedTitlesList()
    const unlockedTitles = rawUnlockedTitles.map(title => ({
      id: title.id,
      name: title.name,
      description: title.description,
      icon: title.icon,
      color: title.color,
    }))

    console.log('[Main] get-today-stats called, count:', count, 'hourly:', hourlyDist)
    return {
      count,
      activeHours: todayStat?.activeHours || 0,
      focusSessions: todayStat?.focusSessions || 0,
      hourlyDistribution: hourlyDist,
      categoryCount,
      topKeys,
      comboCounts,
      currentTitle,
      unlockedTitles,
    }
  } catch (error) {
    console.error('[Main] Failed to get today stats:', error)
    return {
      count: getTodayCount(),
      activeHours: 0,
      focusSessions: 0,
      hourlyDistribution: getHourlyDistribution().length === 24
        ? getHourlyDistribution()
        : new Array(24).fill(0),
      categoryCount: getCategoryCounts(),
      topKeys: getTodayTopKeys(20),
      comboCounts: getComboCounts(),
      currentTitle: null,
      unlockedTitles: [],
    }
  }
})

// 按日期获取统计数据
ipcMain.handle('get-stats-by-date', async (_, date: string) => {
  try {
    const stat = findDailyStatByDate(date)
    const today = getLocalDateString()

    // 如果是今天，优先使用内存数据
    if (date === today) {
      const rawCurrentTitle = getCurrentTitle()
      const rawUnlockedTitles = getUnlockedTitlesList()
      // 优先使用内存中的组合键统计（应用刚启动时内存为0，使用数据库）
      const memoryComboCounts = getComboCounts()
      const hasComboData = Object.values(memoryComboCounts).some(count => count > 0)
      const comboCounts = hasComboData ? memoryComboCounts : (stat?.comboCounts || createDefaultComboCounts())
      return {
        count: getTodayCount() || (stat?.totalCount || 0),
        activeHours: stat?.activeHours || 0,
        focusSessions: stat?.focusSessions || 0,
        hourlyDistribution: getHourlyDistribution().length === 24
          ? getHourlyDistribution()
          : (stat?.hourlyDistribution || new Array(24).fill(0)),
        categoryCount: getCategoryCounts(),
        topKeys: getTodayTopKeys(20),
        comboCounts,
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

    // 历史日期从数据库读取
    return {
      count: stat?.totalCount || 0,
      activeHours: stat?.activeHours || 0,
      focusSessions: stat?.focusSessions || 0,
      hourlyDistribution: stat?.hourlyDistribution || new Array(24).fill(0),
      categoryCount: stat?.categoryCount || {
        letter: 0, number: 0, function: 0, control: 0, symbol: 0, modifier: 0, other: 0
      },
      topKeys: stat?.topKeys || [],
      comboCounts: { ...createDefaultComboCounts(), ...stat?.comboCounts },
      currentTitle: null,
      unlockedTitles: [],
    }
  } catch (error) {
    console.error('[Main] Failed to get stats by date:', error)
    return {
      count: 0,
      activeHours: 0,
      focusSessions: 0,
      hourlyDistribution: new Array(24).fill(0),
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

ipcMain.handle('get-week-stats', async () => {
  try {
    // 获取过去7天的日期
    const today = new Date()
    const weekData = []
    const weekLabels = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatLocalDate(date)
      const dayStat = findDailyStatByDate(dateStr)

      weekData.push(dayStat?.totalCount || 0)

      // 格式化标签：周一、周二... 或 3/20
      const month = date.getMonth() + 1
      const day = date.getDate()
      weekLabels.push(`${month}/${day}`)
    }

    const totalCount = weekData.reduce((sum: number, count: number) => sum + count, 0)

    console.log('[Main] get-week-stats called, total:', totalCount)
    return { totalCount, dailyCounts: weekData, labels: weekLabels }
  } catch (error) {
    console.error('[Main] Failed to get week stats:', error)
    return { totalCount: 0, dailyCounts: new Array(7).fill(0), labels: [] }
  }
})

ipcMain.handle('get-month-stats', async () => {
  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // 获取当月所有数据
    const monthData = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatLocalDate(date)
      const dayStat = findDailyStatByDate(dateStr)

      monthData.push({
        date: dateStr,
        count: dayStat?.totalCount || 0,
        dayOfWeek: date.getDay(), // 0=周日, 1=周一...
        weekNumber: Math.floor((day + firstDay.getDay() - 1) / 7), // 第几周
      })
    }

    const totalCount = monthData.reduce((sum: number, d: { count: number }) => sum + d.count, 0)

    console.log('[Main] get-month-stats called, total:', totalCount, 'days:', daysInMonth)
    return { totalCount, dailyData: monthData, daysInMonth }
  } catch (error) {
    console.error('[Main] Failed to get month stats:', error)
    return { totalCount: 0, dailyData: [], daysInMonth: 30 }
  }
})

// 设置 API
ipcMain.handle('get-settings', async () => {
  try {
    const db = getDatabase()
    return db.data.settings
  } catch (error) {
    console.error('[Main] Failed to get settings:', error)
    return {
      autoStart: false,
      showFloatingWindow: true,
      dataRetentionDays: 90,
      theme: 'dark',
    }
  }
})

ipcMain.handle('save-settings', async (_, newSettings) => {
  console.log('[Main] save-settings called:', newSettings)
  try {
    const db = getDatabase()
    db.data.settings = { ...db.data.settings, ...newSettings }
    await saveData()
    return true
  } catch (error) {
    console.error('[Main] Failed to save settings:', error)
    return false
  }
})

// 窗口控制 API
ipcMain.handle('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize()
  }
  // 最小化时显示悬浮球
  try {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.show()
    }
  } catch (error) {
    console.error('[Main] Failed to show floating window on minimize:', error)
  }
})

ipcMain.handle('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
})

// 悬浮窗控制 API
ipcMain.on('start-drag', (_, { x, y }) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    const [winX, winY] = floatingWindow.getPosition()
    floatingWindow.webContents.send('drag-start', { winX, winY, mouseX: x, mouseY: y })
  }
})

ipcMain.on('dragging', (_, { x, y }) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.setPosition(x - 40, y - 20)
  }
})

ipcMain.on('show-main-window', () => {
  // 如果主窗口不存在或已销毁，重新创建
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
  } else {
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  }
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.hide()
  }
})

// 显示/隐藏悬浮窗
ipcMain.handle('toggle-floating-window', async (_, show: boolean) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    if (show) {
      floatingWindow.show()
    } else {
      floatingWindow.hide()
    }
    return true
  }
  return false
})

// 行为模式识别 IPC 处理
ipcMain.handle('get-pattern-summary', async () => {
  try {
    return getTodayPatternSummary()
  } catch (error) {
    console.error('[Main] Failed to get pattern summary:', error)
    return {
      work: { duration: 0, percentage: 0 },
      slack: { duration: 0, percentage: 0 },
      gaming: { duration: 0, percentage: 0 },
      idle: { duration: 0, percentage: 0 }
    }
  }
})

ipcMain.handle('get-pattern-history', async () => {
  try {
    return getPatternHistory()
  } catch (error) {
    console.error('[Main] Failed to get pattern history:', error)
    return []
  }
})

ipcMain.handle('detect-slack-during-work', async () => {
  try {
    return detectSlackDuringWork()
  } catch (error) {
    console.error('[Main] Failed to detect slack during work:', error)
    return {
      isAbnormal: false,
      slackDuration: 0,
      workDuration: 0,
      suggestion: ''
    }
  }
})

ipcMain.handle('analyze-gaming-impact', async () => {
  try {
    return analyzeGamingImpact()
  } catch (error) {
    console.error('[Main] Failed to analyze gaming impact:', error)
    return {
      gamingTime: 0,
      postGamingEfficiency: 100,
      recommendation: ''
    }
  }
})

// 监听悬浮窗加载完成，发送初始计数值
ipcMain.on('floating-window-ready', () => {
  console.log('[Main] Floating window ready, sending initial count')
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    const initialCount = getTodayCount()
    floatingWindow.webContents.send('update-count', initialCount)
  }
})

console.log('[Main] IPC handlers registered successfully')
// ========== IPC 处理程序结束 ==========

// 创建主窗口
function createMainWindow(showImmediately = true): void {
  // 如果窗口已存在，不再创建
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[Main] Main window already exists, skipping creation')
    return
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    icon: getIconPath(),
    show: false, // 初始隐藏，等加载完成后再显示
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 等待页面加载完成后显示窗口
  const win = mainWindow
  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && showImmediately) {
      win.show()
      win.focus()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 监听系统最小化事件（标题栏最小化按钮）
  mainWindow.on('minimize', () => {
    console.log('[Main] Window minimized via system button, showing floating window')
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      try {
        const db = getDatabase()
        if (db.data.settings.showFloatingWindow) {
          floatingWindow.show()
        }
      } catch (error) {
        console.error('[Main] Failed to show floating window on minimize:', error)
      }
    }
  })

  // 监听窗口恢复事件，隐藏悬浮球
  mainWindow.on('restore', () => {
    console.log('[Main] Window restored, hiding floating window')
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.hide()
    }
  })
}

// 创建悬浮窗
function createFloatingWindow(): void {
  // 如果窗口已存在，不再创建
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    console.log('[Main] Floating window already exists, skipping creation')
    return
  }

  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize

  floatingWindow = new BrowserWindow({
    width: 140,
    height: 50,
    x: width - 160,
    y: 100,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  floatingWindow.loadFile(join(__dirname, 'floating-window.html'))

  // 悬浮窗不显示在任务栏
  floatingWindow.setSkipTaskbar(true)

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })
}

// 创建系统托盘
function createTray(): void {
  // 如果托盘已存在，不再创建
  if (tray) {
    console.log('[Main] Tray already exists, skipping creation')
    return
  }

  // 使用 logo.png 作为托盘图标
  try {
    const iconPath = getIconPath()
    const icon = nativeImage.createFromPath(iconPath)
    // macOS 需要调整图标大小
    if (process.platform === 'darwin') {
      tray = new Tray(icon.resize({ width: 22, height: 22 }))
    } else {
      tray = new Tray(icon)
    }
  } catch (error) {
    console.log('[Main] Logo not found or failed to load, skipping tray creation:', error)
    return
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主界面', click: () => {
      console.log('[Main] Tray menu: show main window clicked')
      // 如果主窗口不存在或已销毁，重新创建
      if (!mainWindow || mainWindow.isDestroyed()) {
        console.log('[Main] Creating new main window from tray')
        createMainWindow()
      } else {
        console.log('[Main] Showing existing main window from tray')
        if (!mainWindow.isVisible()) {
          mainWindow.show()
        }
        mainWindow.focus()
      }
    }},
    { label: '今日统计', enabled: false },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip('KeyboardTracker')
}

// 应用初始化
app.whenReady().then(async () => {
  console.log('[Main] App is ready, initializing...')

  // 设置 macOS Dock 图标
  if (process.platform === 'darwin') {
    try {
      const dockIcon = nativeImage.createFromPath(getIconPath())
      app.dock.setIcon(dockIcon)
      console.log('[Main] Dock icon set')
    } catch (error) {
      console.error('[Main] Failed to set dock icon:', error)
    }
  }

  // 先初始化数据库
  try {
    await initDatabase()
    console.log('[Main] Database initialized')
  } catch (error) {
    console.error('[Main] Failed to initialize database:', error)
  }

  // 加载今日计数
  try {
    await initTodayCount()
    console.log('[Main] Today count initialized')
  } catch (error) {
    console.error('[Main] Failed to initialize today count:', error)
  }

  // 初始化系统状态监听（锁屏、休眠检测）
  try {
    initSystemStateMonitoring()
    console.log('[Main] System state monitoring initialized')
  } catch (error) {
    console.error('[Main] Failed to initialize system state monitoring:', error)
  }

  // 创建主窗口（初始不显示）
  createMainWindow(false)

  createTray()
  createFloatingWindow()

  // macOS: 等待页面加载完成后再显示窗口，确保 Dock 图标先设置好
  if (mainWindow) {
    const win = mainWindow
    if (process.platform === 'darwin') {
      win.once('ready-to-show', () => {
        setTimeout(() => {
          if (!win.isDestroyed()) {
            console.log('[Main] Showing main window after Dock icon set')
            win.show()
            win.focus()
          }
        }, 100)
      })
    } else {
      // 非 macOS: 页面加载完成后直接显示
      win.once('ready-to-show', () => {
        if (!win.isDestroyed()) {
          win.show()
          win.focus()
        }
      })
    }
  }

  // 设置悬浮窗更新回调（避免循环依赖）
  setFloatingWindowUpdater((count: number) => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.webContents.send('update-count', count)
    }
  })

  // 悬浮窗 DOM 准备好后发送初始值
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.on('dom-ready', () => {
      console.log('[Main] Floating window DOM ready')
      const initialCount = getTodayCount()
      floatingWindow?.webContents.send('update-count', initialCount)
    })
  }

  // 根据设置决定是否显示悬浮窗
  // 默认隐藏，只有在窗口最小化时才显示
  try {
    // 默认隐藏悬浮窗
    if (floatingWindow) {
      floatingWindow.hide()
    }
  } catch (error) {
    console.error('[Main] Failed to hide floating window:', error)
  }

  // 启动键盘监听器
  console.log('[Main] Starting keyboard tracker...')
  startKeyboardTracker(mainWindow)

  // 清理旧的定时器（热更新时）
  if (dateCheckInterval) {
    clearInterval(dateCheckInterval)
    dateCheckInterval = null
  }

  // 定时检查日期变化（每分钟检查一次）
  dateCheckInterval = setInterval(async () => {
    // 通过重新调用 initTodayCount 来处理日期变化
    await initTodayCount()
  }, 60000)

  console.log('[Main] Initialization complete')
})

// 应用退出前保存数据
app.on('before-quit', async (event) => {
  // 如果已经在退出过程中，不再处理
  if (isQuitting) return

  console.log('[Main] App quitting, saving data...')
  try {
    // 阻止应用立即退出
    event.preventDefault()
    isQuitting = true
    // 先保存 tracker 中的内存数据
    await flushData()
    console.log('[Main] Data saved successfully')
    // 保存完成后退出应用
    app.quit()
  } catch (error) {
    console.error('[Main] Failed to save data:', error)
    // 即使保存失败也退出应用
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  console.log('[Main] App activated via Dock click')
  // 如果主窗口不存在或已销毁，创建新窗口
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('[Main] Main window not exists, creating...')
    createMainWindow() // 默认 showImmediately = true
  } else {
    // 窗口存在，确保显示并聚焦
    console.log('[Main] Main window exists, showing and focusing')
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  }
})
