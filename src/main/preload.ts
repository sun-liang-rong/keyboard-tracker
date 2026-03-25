import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,

  // 统计数据
  getTodayStats: () => ipcRenderer.invoke('get-today-stats'),
  getStatsByDate: (date: string) => ipcRenderer.invoke('get-stats-by-date', date),
  getWeekStats: () => ipcRenderer.invoke('get-week-stats'),
  getMonthStats: () => ipcRenderer.invoke('get-month-stats'),

  // 设置
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  // 悬浮窗控制
  toggleFloatingWindow: (show: boolean) => ipcRenderer.invoke('toggle-floating-window', show),
  setFloatingIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-floating-ignore-mouse', ignore),

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
})

