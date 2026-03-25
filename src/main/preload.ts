/**
 * preload.ts - 预加载脚本
 * 
 * 功能说明：
 * 在渲染进程加载前执行的脚本，用于安全地暴露主进程 API 给渲染进程。
 * 
 * 为什么需要 preload 脚本？
 * Electron 的安全模型要求：
 * 1. 渲染进程不应直接访问 Node.js API（nodeIntegration: false）
 * 2. 渲染进程与主进程之间的通信必须通过 IPC
 * 3. contextBridge 提供了一种安全的方式来暴露特定 API
 * 
 * 这样可以防止 XSS 攻击获取系统权限，提高应用安全性。
 * 
 * 使用方式：
 * 1. 在 BrowserWindow 配置中指定 preload 脚本路径
 * 2. 使用 contextBridge.exposeInMainWorld 暴露 API
 * 3. 在渲染进程中通过 window.electronAPI 访问
 */

// ============================================================
// 依赖导入
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'

// ============================================================
// API 暴露
// ============================================================

/**
 * 使用 contextBridge 安全地暴露 API 到渲染进程
 * 
 * 暴露的 API 将挂载到 window.electronAPI 对象上
 * 渲染进程可以这样调用：
 * 
 * @example
 * // 在渲染进程中
 * const stats = await window.electronAPI.getTodayStats()
 * window.electronAPI.minimizeWindow()
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ----------------------------------------------------------
  // 平台信息
  // ----------------------------------------------------------
  
  /**
   * 当前操作系统平台
   * 'win32' - Windows
   * 'darwin' - macOS
   * 'linux' - Linux
   */
  platform: process.platform,

  // ----------------------------------------------------------
  // 统计数据 API
  // ----------------------------------------------------------
  
  /**
   * 获取今日统计数据
   * @returns 包含今日按键数、小时分布、分类统计等的 Promise
   * @example
   * const stats = await window.electronAPI.getTodayStats()
   * console.log('今日按键数:', stats.count)
   */
  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),
  
  /**
   * 获取指定日期的统计数据
   * @param date - 日期字符串，格式 YYYY-MM-DD
   * @returns 包含该日期统计数据的 Promise
   * @example
   * const stats = await window.electronAPI.getStatsByDate('2026-03-25')
   */
  getStatsByDate: (date: string) => ipcRenderer.invoke('get-stats-by-date', date),
  
  /**
   * 获取本周统计数据
   * @returns 包含近7天每日统计的 Promise
   * @example
   * const weekStats = await window.electronAPI.getWeekStats()
   * console.log('本周总按键:', weekStats.totalCount)
   */
  getWeekStats: () => ipcRenderer.invoke('get-week-stats'),
  
  /**
   * 获取本月统计数据
   * @returns 包含当月每日统计的 Promise，用于热力图展示
   * @example
   * const monthStats = await window.electronAPI.getMonthStats()
   */
  getMonthStats: () => ipcRenderer.invoke('get-month-stats'),

  // ----------------------------------------------------------
  // 设置 API
  // ----------------------------------------------------------
  
  /**
   * 获取应用设置
   * @returns 当前设置的 Promise
   * @example
   * const settings = await window.electronAPI.getSettings()
   * console.log('主题:', settings.theme)
   */
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  /**
   * 保存应用设置
   * @param settings - 新的设置对象（部分更新）
   * @returns 保存是否成功的 Promise
   * @example
   * await window.electronAPI.saveSettings({ theme: 'light' })
   */
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  // ----------------------------------------------------------
  // 悬浮窗控制 API
  // ----------------------------------------------------------
  
  /**
   * 显示/隐藏悬浮窗
   * @param show - true 显示，false 隐藏
   * @returns 操作是否成功的 Promise
   */
  toggleFloatingWindow: (show: boolean) => ipcRenderer.invoke('toggle-floating-window', show),
  
  /**
   * 设置悬浮窗鼠标穿透
   * @param ignore - true 开启穿透（点击穿透到下层窗口），false 关闭穿透
   * 
   * 智能穿透逻辑：
   * - 鼠标离开悬浮窗时开启穿透，避免遮挡其他窗口
   * - 鼠标进入悬浮窗时关闭穿透，允许拖拽和点击
   */
  setFloatingIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-floating-ignore-mouse', ignore),

  // ----------------------------------------------------------
  // 窗口控制 API
  // ----------------------------------------------------------
  
  /**
   * 最小化主窗口
   * 最小化时会自动显示悬浮窗（如果设置中启用）
   */
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  
  /**
   * 关闭主窗口
   * 触发应用退出流程，会先保存数据
   */
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // ----------------------------------------------------------
  // 事件监听 API
  // ----------------------------------------------------------
  
  /**
   * 监听键盘敲击更新事件
   * 
   * 当用户按键时，主进程会发送此事件，包含最新的统计数据
   * 用于实现实时更新 UI 的功能
   * 
   * @param callback - 接收更新数据的回调函数
   * @example
   * // 在 Vue 组件中
   * window.electronAPI.onKeystrokeUpdate((data) => {
   *   todayCount.value = data.count
   *   hourlyDistribution.value = data.hourlyDistribution
   * })
   */
  onKeystrokeUpdate: (callback: (data: {
    /** 今日总按键数 */
    count: number
    /** 24小时分布，索引0-23对应0-23点 */
    hourlyDistribution: number[]
    /** 按键分类统计 */
    categoryCount: {
      letter: number
      number: number
      function: number
      control: number
      symbol: number
      modifier: number
      other: number
    }
    /** 高频按键 TOP 20 */
    topKeys: { name: string; count: number; category: string }[]
    /** 组合键统计 */
    comboCounts: Record<string, number>
    /** 当前称号 */
    currentTitle: {
      id: string
      name: string
      description: string
      icon: string
      color: string
    } | null
  }) => void) => {
    // 注册 IPC 事件监听器
    // ipcRenderer.on 的第一个参数是事件名，第二个是数据
    ipcRenderer.on('keystroke-update', (_, data) => callback(data))
  },
})