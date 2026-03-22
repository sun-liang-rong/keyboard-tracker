import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface Settings {
  autoStart: boolean
  showFloatingWindow: boolean
  dataRetentionDays: number
  theme: 'light' | 'dark'
}

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<Settings>({
    autoStart: false,
    showFloatingWindow: true,
    dataRetentionDays: 90,
    theme: 'dark',
  })

  // Actions
  async function loadSettings() {
    if (window.electronAPI) {
      const data = await window.electronAPI.getSettings()
      settings.value = { ...settings.value, ...data }
      // 应用主题
      applyTheme(settings.value.theme)
    }
  }

  async function saveSettings(newSettings: Settings) {
    // 转换为普通对象，避免 IPC 克隆错误
    const plainSettings = JSON.parse(JSON.stringify(newSettings))
    settings.value = plainSettings
    if (window.electronAPI) {
      await window.electronAPI.saveSettings(plainSettings)
    }
  }

  // 应用主题到 DOM
  function applyTheme(theme: 'light' | 'dark') {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  // 监听设置变化，自动应用主题
  watch(() => settings.value.theme, (theme) => {
    applyTheme(theme)
  })

  return {
    settings,
    loadSettings,
    saveSettings,
    applyTheme,
  }
})
