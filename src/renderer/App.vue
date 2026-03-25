<template>
  <!-- 固定视口，禁止全局滚动 -->
  <div class="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()

// 应用主题到 html 元素
function applyTheme(theme: 'light' | 'dark') {
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
  console.log('[Theme] Applied:', theme, 'html.classList:', html.classList.toString())
}

// 监听设置变化
watch(() => settingsStore.settings.theme, (theme) => {
  if (theme) {
    applyTheme(theme)
  }
}, { immediate: true })

// 初始化时加载并应用主题
onMounted(async () => {
  await settingsStore.loadSettings()
  if (settingsStore.settings.theme) {
    applyTheme(settingsStore.settings.theme)
  }
})
</script>
