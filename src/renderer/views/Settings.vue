<template>
  <div class="p-6">
    <!-- 标题栏 -->
    <header class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        ⚙️ 设置
      </h1>
      <button
        @click="$router.push('/')"
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        返回
      </button>
    </header>

    <!-- 设置项 -->
    <div class="max-w-2xl space-y-6">
      <!-- 开机自启 -->
      <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">开机自启</h3>
          <p class="text-sm text-gray-500">系统启动时自动运行 KeyboardTracker</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="settings.autoStart"
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- 悬浮窗 -->
      <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">显示悬浮窗</h3>
          <p class="text-sm text-gray-500">在桌面角落显示实时按键计数</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            v-model="settings.showFloatingWindow"
            class="sr-only peer"
          />
          <div class="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <!-- 数据保留 -->
      <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2">数据保留期限</h3>
        <p class="text-sm text-gray-500 mb-4">自动清理超过该期限的历史数据</p>
        <select
          v-model="settings.dataRetentionDays"
          class="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option :value="30">30天</option>
          <option :value="90">90天</option>
          <option :value="180">180天</option>
          <option :value="365">1年</option>
        </select>
      </div>

      <!-- 主题 -->
      <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2">主题</h3>
        <div class="flex gap-4">
          <button
            @click="setTheme('light')"
            :class="{ 'ring-2 ring-blue-500': settings.theme === 'light' }"
            class="flex-1 p-4 border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ☀️ 浅色
          </button>
          <button
            @click="setTheme('dark')"
            :class="{ 'ring-2 ring-blue-500': settings.theme === 'dark' }"
            class="flex-1 p-4 border border-gray-300 rounded-lg dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            🌙 深色
          </button>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div class="flex justify-end">
        <button
          @click="saveSettings"
          class="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          保存设置
        </button>
      </div>
    </div>
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
