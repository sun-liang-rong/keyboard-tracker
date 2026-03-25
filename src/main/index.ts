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
 * 
 * 架构说明：
 * - 主进程：运行 Node.js，可访问系统 API
 * - 渲染进程：运行 Web 内容，通过 IPC 与主进程通信
 * - preload 脚本：安全桥梁，暴露有限的 API 给渲染进程
 */

// ============================================================
// 依赖导入
// ============================================================

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

// 导入 tracker 模块的函数
import {
  startKeyboardTracker,      // 启动键盘监听
  getTodayCount,             // 获取今日计数
  initTodayCount,            // 初始化今日计数
  getHourlyDistribution,     // 获取小时分布
  flushData,                 // 强制保存数据
  setFloatingWindowUpdater,  // 设置悬浮窗更新回调
  getCategoryCounts,         // 获取分类统计
  getTodayTopKeys,           // 获取高频按键
  getComboCounts,            // 获取组合键统计
  getCurrentTitle,           // 获取当前称号
  getUnlockedTitlesList,     // 获取已解锁称号列表
  initSystemStateMonitoring  // 初始化系统状态监听（锁屏检测）
} from './tracker'

// 导入 database 模块的函数
import {
  initDatabase,              // 初始化数据库
  saveData,                  // 保存数据
  getDatabase,               // 获取数据库实例
  findDailyStatByDate,       // 按日期查找统计
  createDefaultComboCounts   // 创建默认组合键统计
} from './database'

// 从共享模块导入日期工具函数
import { getLocalDateString, formatLocalDate } from '../shared/utils'

// ============================================================
// 图标处理工具函数
// ============================================================

/**
 * 获取应用图标 (nativeImage)
 * 
 * Electron 在不同平台上对图标格式有不同要求：
 * - Windows: 优先使用 .ico 格式，支持多尺寸
 * - macOS: 使用 .png 格式
 * 
 * @returns 加载后的图标对象
 */
function getAppIcon(): Electron.NativeImage {
  const iconPath = getIconPath()
  console.log('[Main] Loading icon from:', iconPath)
  console.log('[Main] Icon file exists:', existsSync(iconPath))

  try {
    // 从文件创建图标
    const icon = nativeImage.createFromPath(iconPath)
    const size = icon.getSize()
    console.log('[Main] Icon loaded, size:', size, 'isEmpty:', icon.isEmpty())

    // Windows 特殊处理：创建特定尺寸的图标
    if (process.platform === 'win32') {
      if (!icon.isEmpty()) {
        try {
          // Windows 任务栏需要 256x256 的图标
          const resizedIcon = icon.resize({ width: 256, height: 256 })
          console.log('[Main] Resized icon for Windows:', resizedIcon.getSize())
          return resizedIcon
        } catch (e) {
          console.log('[Main] Failed to resize icon, using original:', e)
          return icon
        }
      }
    }
    return icon
  } catch (error) {
    console.error('[Main] Failed to load icon:', error)
    return nativeImage.createEmpty()
  }
}

/**
 * 获取图标文件路径
 * 
 * 根据运行环境和平台返回正确的图标路径：
 * - 生产环境：从应用包内读取
 * - 开发环境：从项目目录读取
 * - Windows：优先 .ico 格式
 * - macOS：使用 .png 格式
 * 
 * @returns 图标文件的绝对路径
 */
function getIconPath(): string {
  if (app.isPackaged) {
    // 生产环境：应用已打包
    if (process.platform === 'win32') {
      // Windows: 优先使用 ico 格式
      const icoPath = join(process.resourcesPath, 'public', 'logo.ico')
      if (existsSync(icoPath)) {
        console.log('[Main] Using .ico icon:', icoPath)
        return icoPath
      }
      console.log('[Main] .ico not found, using .png')
      return join(process.resourcesPath, 'public', 'logo.png')
    }
    // macOS
    return join(process.resourcesPath, 'public', 'logo.png')
  } else {
    // 开发环境
    if (process.platform === 'win32') {
      const icoPath = join(process.cwd(), 'public', 'logo.ico')
      if (existsSync(icoPath)) {
        console.log('[Main] Using .ico icon (dev):', icoPath)
        return icoPath
      }
      console.log('[Main] .ico not found (dev), using .png')
      return join(process.cwd(), 'public', 'logo.png')
    }
    return join(process.cwd(), 'public', 'logo.png')
  }
}

// ============================================================
// 全局变量
// ============================================================

/** 主窗口实例引用（保持引用防止被垃圾回收） */
let mainWindow: BrowserWindow | null = null

/** 悬浮窗实例引用 */
let floatingWindow: BrowserWindow | null = null

/** 系统托盘实例引用 */
let tray: Tray | null = null

/** 日期检查定时器 */
let dateCheckInterval: NodeJS.Timeout | null = null

/** 是否正在退出（防止递归退出） */
let isQuitting = false

// ============================================================
// IPC 处理程序注册
// ============================================================

console.log('[Main] Registering IPC handlers...')

/**
 * 移除可能存在的旧 handler
 * 
 * 在热重载时，旧的 handler 可能仍然存在，需要先移除
 * 使用 removeHandler 可以安全移除，不会报错
 */
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
 * 
 * 返回今日的完整统计数据，包括：
 * - 总按键数
 * - 小时分布
 * - 分类统计
 * - 高频按键
 * - 组合键统计
 * - 称号信息
 */
ipcMain.handle('get-today-stats', async () => {
  const today = getLocalDateString()

  try {
    const todayStat = findDailyStatByDate(today)

    // 优先使用内存中的计数（实时更新），如果没有则使用数据库
    const count = getTodayCount() || (todayStat?.totalCount || 0)

    // 优先使用内存中的小时分布（实时更新）
    const memoryHourlyDist = getHourlyDistribution()
    const hourlyDist = memoryHourlyDist.length === 24
      ? memoryHourlyDist
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
    
    // 当前称号（序列化，移除函数属性）
    const rawCurrentTitle = getCurrentTitle()
    const currentTitle = rawCurrentTitle ? {
      id: rawCurrentTitle.id,
      name: rawCurrentTitle.name,
      description: rawCurrentTitle.description,
      icon: rawCurrentTitle.icon,
      color: rawCurrentTitle.color,
    } : null
    
    // 已解锁称号列表（序列化，移除函数属性）
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
    // 出错时返回默认值
    const hourlyDist = getHourlyDistribution()
    return {
      count: getTodayCount(),
      activeHours: 0,
      focusSessions: 0,
      hourlyDistribution: hourlyDist.length === 24 ? hourlyDist : new Array(24).fill(0),
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
 * 
 * 如果是今天，返回实时数据；如果是历史日期，从数据库读取
 */
ipcMain.handle('get-stats-by-date', async (_, date: string) => {
  try {
    const stat = findDailyStatByDate(date)
    const today = getLocalDateString()

    // 如果是今天，优先使用内存数据
    if (date === today) {
      const rawCurrentTitle = getCurrentTitle()
      const rawUnlockedTitles = getUnlockedTitlesList()

      // 组合键统计：优先内存数据
      const memoryComboCounts = getComboCounts()
      const hasComboData = Object.values(memoryComboCounts).some(count => count > 0)
      const comboCounts = hasComboData ? memoryComboCounts : (stat?.comboCounts || createDefaultComboCounts())

      // 小时分布：优先内存数据
      const hourlyDist = getHourlyDistribution()

      return {
        count: getTodayCount() || (stat?.totalCount || 0),
        activeHours: stat?.activeHours || 0,
        focusSessions: stat?.focusSessions || 0,
        hourlyDistribution: hourlyDist.length === 24 ? hourlyDist : (stat?.hourlyDistribution || new Array(24).fill(0)),
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

    // 历史日期：从数据库读取
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
    // 出错时返回默认值
    return {
      count: 0,
      activeHours: 0,
      focusSessions: 0,
      hourlyDistribution: new Array(24).fill(0),
      categoryCount: {
        letter: 0, number: 0, function: 0, control: 0, symbol: 0, modifier: 0, other: 0
      },
      topKeys: [],
      comboCounts: createDefaultComboCounts(),
      currentTitle: null,
      unlockedTitles: [],
    }
  }
})

/**
 * IPC: 获取本周统计数据
 * 
 * 返回过去 7 天的每日统计，用于周趋势图
 */
ipcMain.handle('get-week-stats', async () => {
  try {
    const today = new Date()
    const weekData = []
    const weekLabels = []

    // 从 6 天前到今天，共 7 天
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = formatLocalDate(date)
      const dayStat = findDailyStatByDate(dateStr)

      weekData.push(dayStat?.totalCount || 0)

      // 格式化标签：月/日
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

/**
 * IPC: 获取本月统计数据
 * 
 * 返回当月每天的统计，用于月热力图（GitHub 风格贡献图）
 */
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
        dayOfWeek: date.getDay(),  // 0=周日, 1=周一...
        weekNumber: Math.floor((day + firstDay.getDay() - 1) / 7),  // 第几周
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

/**
 * IPC: 获取应用设置
 */
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

/**
 * IPC: 保存应用设置
 */
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

/**
 * IPC: 最小化主窗口
 * 最小化时自动显示悬浮窗
 */
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

/**
 * IPC: 关闭主窗口
 * 会触发应用退出流程
 */
ipcMain.handle('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close()
  }
})

// ============================================================
// 悬浮窗拖拽相关 IPC
// ============================================================

/** 拖拽偏移量（鼠标相对于窗口左上角的位置） */
let dragOffset = { x: 0, y: 0 }

/**
 * IPC: 开始拖拽
 * 记录鼠标相对于窗口的偏移量
 */
ipcMain.on('start-drag', (_, { x, y }) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    const [winX, winY] = floatingWindow.getPosition()
    // 记录鼠标相对于窗口左上角的偏移
    dragOffset.x = x - winX
    dragOffset.y = y - winY
  }
})

/**
 * IPC: 拖拽中
 * 更新窗口位置
 */
ipcMain.on('dragging', (_, { x, y }) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    // 新位置 = 鼠标位置 - 偏移量
    const newX = x - dragOffset.x
    const newY = y - dragOffset.y
    floatingWindow.setPosition(newX, newY)
  }
})

/**
 * IPC: 显示主窗口
 * 点击悬浮窗时触发
 */
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
  
  // 隐藏悬浮窗
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.hide()
  }
})

/**
 * IPC: 显示/隐藏悬浮窗
 */
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

/**
 * IPC: 设置悬浮窗鼠标穿透
 */
ipcMain.on('set-floating-ignore-mouse', (_, ignore: boolean) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    // forward: true 表示将事件转发到下层窗口
    floatingWindow.setIgnoreMouseEvents(ignore, { forward: true })
  }
})

/**
 * IPC: 悬浮窗加载完成
 * 发送初始计数值
 */
ipcMain.on('floating-window-ready', () => {
  console.log('[Main] Floating window ready, sending initial count')
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    const initialCount = getTodayCount()
    floatingWindow.webContents.send('update-count', initialCount)
  }
})

console.log('[Main] IPC handlers registered successfully')

// ============================================================
// 窗口创建函数
// ============================================================

/**
 * 创建主窗口
 * 
 * 主窗口特点：
 * - 自定义标题栏（无边框）
 * - 支持拖拽移动
 * - 支持最小化/关闭按钮
 * - 深色主题
 * 
 * @param showImmediately - 是否立即显示窗口
 */
function createMainWindow(showImmediately = true): void {
  // 如果窗口已存在，不再创建
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('[Main] Main window already exists, skipping creation')
    return
  }

  // 加载图标为 nativeImage
  const windowIcon = getAppIcon()

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',  // macOS 风格的隐藏标题栏
    frame: false,                  // 无边框窗口
    icon: windowIcon,
    show: false,                   // 初始隐藏，等加载完成后再显示
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,      // 启用上下文隔离（安全）
      nodeIntegration: false,      // 禁用 Node.js 集成（安全）
    },
  })

  // Windows/Linux: 隐藏默认菜单栏
  if (process.platform !== 'darwin') {
    mainWindow.setMenu(null)
  }

  // 加载页面
  if (process.env.VITE_DEV_SERVER_URL) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 等待页面加载完成后显示窗口
  const win = mainWindow
  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && showImmediately) {
      // Windows: 显示前再次设置图标，确保任务栏显示正确
      if (process.platform === 'win32') {
        try {
          const icon = getAppIcon()
          if (!icon.isEmpty()) {
            win.setIcon(icon)
            console.log('[Main] Window icon set for Windows taskbar')
          }
        } catch (error) {
          console.error('[Main] Failed to set window icon:', error)
        }
      }
      win.show()
      win.focus()
    }
  })

  // 窗口关闭事件
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

/**
 * 创建悬浮窗
 * 
 * 悬浮窗特点：
 * - 始终置顶
 * - 透明背景
 * - 不显示在任务栏
 * - 可拖拽
 * - 显示实时计数
 */
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
    width: 100,
    height: 30,
    useContentSize: true,       // 使用内容尺寸而非窗口尺寸
    x: width - 120,             // 右上角位置
    y: 100,
    frame: false,               // 无边框
    alwaysOnTop: true,          // 始终置顶
    skipTaskbar: true,          // 不显示在任务栏
    transparent: true,          // 透明背景
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    thickFrame: false,
    webPreferences: {
      nodeIntegration: true,    // 悬浮窗需要直接访问 IPC
      contextIsolation: false,  // 简化通信
    },
  })

  floatingWindow.loadFile(join(__dirname, 'floating-window.html'))

  // 悬浮窗加载完成后，发送 logo 路径
  floatingWindow.webContents.on('dom-ready', () => {
    const logoPath = getIconPath()
    // Windows 下将反斜杠转为正斜杠，并添加 file:// 协议
    const normalizedPath = logoPath.replace(/\\/g, '/')
    const fileUrl = normalizedPath.startsWith('file://') ? normalizedPath : `file://${normalizedPath}`
    floatingWindow?.webContents.send('logo-path', fileUrl)
  })

  // 悬浮窗不显示在任务栏
  floatingWindow.setSkipTaskbar(true)

  floatingWindow.on('closed', () => {
    floatingWindow = null
  })
}

/**
 * 创建系统托盘
 * 
 * 托盘功能：
 * - 显示应用图标
 * - 右键菜单：显示主界面、退出
 * - 托盘提示文字
 */
function createTray(): void {
  // 如果托盘已存在，不再创建
  if (tray) {
    console.log('[Main] Tray already exists, skipping creation')
    return
  }

  try {
    const icon = getAppIcon()
    if (icon.isEmpty()) {
      console.log('[Main] Logo is empty, skipping tray creation')
      return
    }
    
    // macOS 需要调整图标大小（托盘图标较小）
    if (process.platform === 'darwin') {
      tray = new Tray(icon.resize({ width: 22, height: 22 }))
    } else {
      tray = new Tray(icon)
    }
    console.log('[Main] Tray icon created successfully')
  } catch (error) {
    console.log('[Main] Logo not found or failed to load, skipping tray creation:', error)
    return
  }

  // 构建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主界面',
      click: () => {
        console.log('[Main] Tray menu: show main window clicked')
        if (!mainWindow || mainWindow.isDestroyed()) {
          createMainWindow()
        } else {
          if (!mainWindow.isVisible()) {
            mainWindow.show()
          }
          mainWindow.focus()
        }
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

/**
 * 应用就绪事件
 * 
 * 这是应用的主要初始化流程：
 * 1. 设置任务栏图标
 * 2. 初始化数据库
 * 3. 加载今日计数
 * 4. 初始化系统状态监听
 * 5. 创建窗口和托盘
 * 6. 启动键盘监听器
 */
app.whenReady().then(async () => {
  console.log('[Main] App is ready, initializing...')

  // --------------------------------------------------------
  // Windows: 设置任务栏图标
  // --------------------------------------------------------
  if (process.platform === 'win32') {
    try {
      const icon = getAppIcon()
      console.log('[Main] Windows icon loaded, isEmpty:', icon.isEmpty(), 'size:', icon.getSize())
      
      // 设置应用用户模型 ID，影响任务栏分组
      app.setAppUserModelId('com.keyboardtracker.app')
      console.log('[Main] Windows UserModelId set')
    } catch (error) {
      console.error('[Main] Failed to set Windows taskbar icon:', error)
    }
  }

  // --------------------------------------------------------
  // macOS: 设置 Dock 图标
  // --------------------------------------------------------
  if (process.platform === 'darwin') {
    try {
      const dockIcon = nativeImage.createFromPath(getIconPath())
      app.dock.setIcon(dockIcon)
      console.log('[Main] Dock icon set')
    } catch (error) {
      console.error('[Main] Failed to set dock icon:', error)
    }
  }

  // --------------------------------------------------------
  // 初始化数据库
  // --------------------------------------------------------
  try {
    await initDatabase()
    console.log('[Main] Database initialized')
    const db = getDatabase()
    const dbPath = join(app.getPath('userData'), 'keyboard-tracker-db.json')
    console.log('[Main] Database file path:', dbPath)
    console.log('[Main] Daily stats count:', db.data.dailyStats.length)
  } catch (error) {
    console.error('[Main] Failed to initialize database:', error)
  }

  // --------------------------------------------------------
  // 加载今日计数
  // --------------------------------------------------------
  try {
    await initTodayCount()
    console.log('[Main] Today count initialized')
  } catch (error) {
    console.error('[Main] Failed to initialize today count:', error)
  }

  // --------------------------------------------------------
  // 初始化系统状态监听（锁屏、休眠检测）
  // --------------------------------------------------------
  try {
    initSystemStateMonitoring()
    console.log('[Main] System state monitoring initialized')
  } catch (error) {
    console.error('[Main] Failed to initialize system state monitoring:', error)
  }

  // --------------------------------------------------------
  // 创建窗口和托盘
  // --------------------------------------------------------
  createMainWindow(false)  // 先创建但不显示
  createTray()
  createFloatingWindow()

  // macOS: 等待页面加载完成后再显示窗口
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
      win.once('ready-to-show', () => {
        if (!win.isDestroyed()) {
          win.show()
          win.focus()
        }
      })
    }
  }

  // --------------------------------------------------------
  // 设置悬浮窗更新回调
  // --------------------------------------------------------
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

  // 默认隐藏悬浮窗
  try {
    if (floatingWindow) {
      floatingWindow.hide()
    }
  } catch (error) {
    console.error('[Main] Failed to hide floating window:', error)
  }

  // --------------------------------------------------------
  // 启动键盘监听器
  // --------------------------------------------------------
  console.log('[Main] Starting keyboard tracker...')
  await startKeyboardTracker(mainWindow)

  // --------------------------------------------------------
  // 定时检查日期变化
  // --------------------------------------------------------
  if (dateCheckInterval) {
    clearInterval(dateCheckInterval)
    dateCheckInterval = null
  }

  // 每分钟检查一次日期变化
  dateCheckInterval = setInterval(async () => {
    await initTodayCount()
  }, 60000)

  console.log('[Main] Initialization complete')
})

/**
 * 应用退出前事件
 * 
 * 在应用退出前保存数据
 * 使用 event.preventDefault() 阻止立即退出，等待数据保存完成
 */
app.on('before-quit', (event) => {
  // 如果已经在退出过程中，不再处理
  if (isQuitting) {
    return
  }

  console.log('[Main] App quitting, saving data...')
  event.preventDefault()
  isQuitting = true

  // 保存数据后退出
  flushData().then(() => {
    console.log('[Main] Data saved successfully')
    app.exit(0)
  }).catch((error) => {
    console.error('[Main] Failed to save data:', error)
    app.exit(1)
  })
})

/**
 * 所有窗口关闭事件
 * 
 * macOS 上通常不会退出应用，而是保持 Dock 图标
 * Windows/Linux 上则退出应用
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用激活事件 (macOS)
 * 
 * 点击 Dock 图标时触发
 * 如果没有可见窗口，创建新窗口
 */
app.on('activate', () => {
  console.log('[Main] App activated via Dock click')
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('[Main] Main window not exists, creating...')
    createMainWindow()
  } else {
    console.log('[Main] Main window exists, showing and focusing')
    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }
    mainWindow.focus()
  }
})