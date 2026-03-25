<template>
  <!-- 固定视口高度，禁止全局滚动 -->
  <div class="h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
    <!-- 标题栏 - 支持拖拽 -->
    <header class="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4" style="-webkit-app-region: drag">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        ⚙️ 设置
      </h1>
      <button
        @click="$router.push('/')"
        style="-webkit-app-region: no-drag"
        class="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        返回
      </button>
    </header>

    <!-- 可滚动内容区域 -->
    <main class="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
      <!-- 设置项容器 -->
      <div class="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <!-- 开机自启 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white text-sm sm:text-base">开机自启</h3>
          <p class="text-xs sm:text-sm text-gray-500">系统启动时自动运行 KeyboardTracker</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            v-model="settings.autoStart"
            class="sr-only peer"
          />
          <div class="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- 悬浮窗 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white text-sm sm:text-base">显示悬浮窗</h3>
          <p class="text-xs sm:text-sm text-gray-500">在桌面角落显示实时按键计数</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            v-model="settings.showFloatingWindow"
            class="sr-only peer"
          />
          <div class="w-10 sm:w-11 h-5 sm:h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- 数据保留 -->
      <div class="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 class="font-medium text-gray-900 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">数据保留期限</h3>
        <p class="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">自动清理超过该期限的历史数据</p>
        <select
          v-model="settings.dataRetentionDays"
          class="w-full p-2 text-sm sm:text-base border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option :value="30">30天</option>
          <option :value="90">90天</option>
          <option :value="180">180天</option>
          <option :value="365">1年</option>
        </select>
      </div>

      <!-- 主题 -->
      <div class="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">主题</h3>
        <div class="flex gap-3 sm:gap-4">
          <button
            @click="setTheme('light')"
            :class="{ 'ring-2 ring-blue-500': settings.theme === 'light' }"
            class="flex-1 p-3 sm:p-4 text-sm sm:text-base border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ☀️ 浅色
          </button>
          <button
            @click="setTheme('dark')"
            :class="{ 'ring-2 ring-blue-500': settings.theme === 'dark' }"
            class="flex-1 p-3 sm:p-4 text-sm sm:text-base border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            🌙 深色
          </button>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-end pt-2">
        <button
          @click="saveSettings"
          class="px-5 sm:px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
        >
          保存设置
        </button>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const settings = reactive({
  autoStart: false,
  showFloatingWindow: true,
  dataRetentionDays: 90,
  theme: 'dark' as 'light' | 'dark',
})

function setTheme(theme: 'light' | 'dark') {
  settings.theme = theme
  // 实时应用到 store，触发主题切换
  settingsStore.settings.theme = theme
  settingsStore.applyTheme(theme)
}

async function saveSettings() {
  await settingsStore.saveSettings(settings)
  // 同步悬浮窗显示状态
  if (window.electronAPI) {
    await window.electronAPI.toggleFloatingWindow(settings.showFloatingWindow)
  }
  alert('设置已保存')
}

onMounted(async () => {
  await settingsStore.loadSettings()
  Object.assign(settings, settingsStore.settings)
})
</script>
