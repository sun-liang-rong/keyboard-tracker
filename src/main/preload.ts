import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 统计数据
  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),
  getStatsByDate: (date: string) => ipcRenderer.invoke('get-stats-by-date', date),
  getWeekStats: () => ipcRenderer.invoke('get-week-stats'),
  getMonthStats: () => ipcRenderer.invoke('get-month-stats'),

  // 行为模式识别
  getPatternSummary: () => ipcRenderer.invoke('get-pattern-summary'),
  getPatternHistory: () => ipcRenderer.invoke('get-pattern-history'),
  detectSlackDuringWork: () => ipcRenderer.invoke('detect-slack-during-work'),
  analyzeGamingImpact: () => ipcRenderer.invoke('analyze-gaming-impact'),

  // 设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  // 悬浮窗控制
  toggleFloatingWindow: (show: boolean) => ipcRenderer.invoke('toggle-floating-window', show),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // 监听事件
  onKeystrokeUpdate: (callback: (data: {
    count: number
    hourlyDistribution: number[]
    categoryCount: {
      letter: number
      number: number
      function: number
      control: number
      symbol: number
      modifier: number
      other: number
    }
    topKeys: { name: string; count: number; category: string }[]
    comboCounts: Record<string, number>
    currentTitle: {
      id: string
      name: string
      description: string
      icon: string
      color: string
    } | null
  }) => void) => {
    ipcRenderer.on('keystroke-update', (_, data) => callback(data))
  },

  // 监听行为模式变化
  onPatternChanged: (callback: (data: {
    pattern: string
    stats: {
      pattern: string
      startTime: number
      endTime: number
      duration: number
      keyCount: number
      appName: string
    }
  }) => void) => {
    ipcRenderer.on('pattern-changed', (_, data) => callback(data))
  },

  // 监听窗口变化
  onWindowChange: (callback: (data: {
    appName: string
    bundleId?: string
    windowTitle: string
    timestamp: number
  }) => void) => {
    ipcRenderer.on('window-change', (_, data) => callback(data))
  },
})

