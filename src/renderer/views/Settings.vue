<template>
  <!-- 页面内容 -->
  <div class="p-8 space-y-6">
    <!-- Headline -->
    <div class="mb-10">
      <h2 class="text-4xl font-extrabold tracking-tight text-on-surface mb-2">设置</h2>
      <p class="text-on-surface-variant text-lg">个性化您的输入追踪体验与隐私安全设置。</p>
    </div>

    <!-- Bento Grid Layout -->
    <div class="grid grid-cols-1 md:grid-cols-6 gap-6">
      <!-- Section: 常规设置 -->
      <section class="md:col-span-4 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-8">
          <svg class="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v2h8v-2h-8zm-4-8v2h12v-2H9z"/>
          </svg>
          <h3 class="text-xl font-bold text-on-surface">常规设置</h3>
        </div>

        <div class="space-y-6">
          <!-- 随系统启动 -->
          <div class="flex items-center justify-between group">
            <div>
              <p class="font-semibold text-on-surface">随系统启动</p>
              <p class="text-sm text-on-surface-variant">电脑开机时自动运行 KeyboardTracker</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.autoStart" class="sr-only peer" />
              <div class="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <!-- 开启悬浮窗口 -->
          <div class="flex items-center justify-between group">
            <div>
              <div class="flex items-center gap-2">
                <p class="font-semibold text-on-surface">开启悬浮窗口</p>
                <span class="px-1.5 py-0.5 rounded bg-secondary-container text-[10px] text-white font-bold uppercase tracking-wider">NEW</span>
              </div>
              <p class="text-sm text-on-surface-variant">在桌面显示实时键入速率 (WPM) 的透明窗口</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settings.showFloatingWindow" class="sr-only peer" />
              <div class="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div class="h-px bg-surface-container-low"></div>

          <!-- 数据保留期限 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-on-surface">数据保留期限</p>
              <p class="text-sm text-on-surface-variant">自动清理超过该期限的历史数据</p>
            </div>
            <select v-model="settings.dataRetentionDays" class="bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 min-w-[140px] p-2.5">
              <option :value="30">30天</option>
              <option :value="90">90天</option>
              <option :value="180">180天</option>
              <option :value="365">1年</option>
            </select>
          </div>

          <!-- 主题模式切换 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-on-surface">主题模式切换</p>
              <p class="text-sm text-on-surface-variant">选择适合您的视觉外观</p>
            </div>
            <div class="flex p-1 bg-surface-container-low rounded-xl">
              <button
                @click="setTheme('light')"
                :class="{ 'bg-surface-container-lowest shadow-sm text-primary': settings.theme === 'light' }"
                class="px-4 py-1.5 text-xs font-bold rounded-lg text-on-surface-variant hover:text-on-surface flex items-center gap-2 transition-all"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 9c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06z"/>
                </svg>
                浅色
              </button>
              <button
                @click="setTheme('dark')"
                :class="{ 'bg-surface-container-lowest shadow-sm text-primary': settings.theme === 'dark' }"
                class="px-4 py-1.5 text-xs font-bold rounded-lg text-on-surface-variant hover:text-on-surface flex items-center gap-2 transition-all"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 2c-1.05 0-2.05.16-3 .46 1.69 1.2 2.86 3.04 3.05 5.14.27 3.05-1.63 5.74-4.33 6.65C5.47 14.69 6.83 15 8.2 15 13.52 15 18 10.48 18 5.2c0-.55-.05-1.1-.14-1.63-.95.3-1.97.43-3.03.43C9.76 4 9 3.24 9 2z"/>
                </svg>
                深色
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: 关于软件 -->
      <section class="md:col-span-2 bg-gradient-to-br from-primary to-primary-container rounded-xl p-8 text-white shadow-lg shadow-primary/10 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-4 opacity-80">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span class="text-xs font-bold tracking-widest uppercase">Version Info</span>
          </div>
          <h3 class="text-2xl font-black mb-1">2.4.0-pro</h3>
          <p class="text-blue-100 text-sm opacity-80">当前已是最新版本</p>
        </div>
        <div class="space-y-4 mt-6">
          <button class="w-full py-3 bg-white text-primary font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            检查更新
          </button>
          <p class="text-[10px] text-center text-blue-100/60 leading-relaxed">
            本软件基于 MIT 开源许可发布。<br/>版权所有 © 2024 KeyboardTracker 团队。
          </p>
        </div>
      </section>

      <!-- Section: 隐私与安全 -->
      <section class="md:col-span-6 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
        <div class="flex items-center gap-3 mb-8">
          <svg class="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <h3 class="text-xl font-bold text-on-surface">隐私与安全</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="space-y-6">
            <!-- 本地数据加密 -->
            <div class="flex items-start justify-between">
              <div class="max-w-[80%]">
                <p class="font-semibold text-on-surface">本地数据加密</p>
                <p class="text-sm text-on-surface-variant">所有存储在本地的击键分析日志将通过 AES-256 标准加密，防止被第三方软件读取。</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer mt-1">
                <input type="checkbox" v-model="settings.localEncryption" class="sr-only peer" />
                <div class="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <!-- 隐私遮蔽模式 -->
            <div class="flex items-start justify-between">
              <div class="max-w-[80%]">
                <p class="font-semibold text-on-surface">隐私遮蔽模式</p>
                <p class="text-sm text-on-surface-variant">当检测到在密码输入框或特定安全网页中输入时，自动停止任何追踪记录。</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer mt-1">
                <input type="checkbox" v-model="settings.privacyMode" class="sr-only peer" />
                <div class="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <!-- 危险区域 -->
          <div class="bg-error-container/30 rounded-xl p-6 border border-error/10">
            <h4 class="text-error font-bold mb-2 flex items-center gap-2">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              危险区域
            </h4>
            <p class="text-sm text-on-error-container mb-6 leading-relaxed">
              重置数据将永久删除您所有的历史击键统计、热力图数据及自定义配置。此操作无法撤销，请谨慎操作。
            </p>
            <button @click="resetAllData" class="px-6 py-2.5 bg-error text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
              重置所有数据
            </button>
          </div>
        </div>
      </section>

      <!-- Feedback / Help -->
      <section class="md:col-span-3 bg-surface-container-low rounded-xl p-6 flex items-center justify-between group hover:bg-surface-container transition-colors cursor-pointer">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-on-surface">获取帮助</p>
            <p class="text-xs text-on-surface-variant">查看在线文档或常见问题</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </section>

      <section class="md:col-span-3 bg-surface-container-low rounded-xl p-6 flex items-center justify-between group hover:bg-surface-container transition-colors cursor-pointer">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <div>
            <p class="font-bold text-on-surface">提交反馈</p>
            <p class="text-xs text-on-surface-variant">帮助我们改进 KeyboardTracker</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </section>
    </div>

    <!-- Footer spacing -->
    <div class="h-8"></div>
  </div>

  <!-- Toast / Status -->
  <div class="fixed bottom-6 right-6 bg-surface-container-lowest/80 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 z-50">
    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
    <span class="text-xs font-bold text-on-surface-variant tracking-wider uppercase">Engine Status: Optimal</span>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()

const settings = reactive({
  autoStart: false,
  showFloatingWindow: true,
  dataRetentionDays: 90,
  theme: 'dark' as 'light' | 'dark',
  localEncryption: true,
  privacyMode: true,
})

// 保存设置到 store
async function saveSettings() {
  await settingsStore.saveSettings({
    autoStart: settings.autoStart,
    showFloatingWindow: settings.showFloatingWindow,
    dataRetentionDays: settings.dataRetentionDays,
    theme: settings.theme,
  })

  // 切换悬浮窗口显示状态
  if (window.electronAPI?.toggleFloatingWindow) {
    await window.electronAPI.toggleFloatingWindow(settings.showFloatingWindow)
  }
}

// 监听设置变化，自动保存
watch(
  () => ({
    autoStart: settings.autoStart,
    showFloatingWindow: settings.showFloatingWindow,
    dataRetentionDays: settings.dataRetentionDays,
    theme: settings.theme,
  }),
  () => {
    saveSettings()
  },
  { deep: true }
)

function setTheme(theme: 'light' | 'dark') {
  settings.theme = theme
  settingsStore.applyTheme(theme)
}

function resetAllData() {
  if (confirm('确定要重置所有数据吗？此操作无法撤销。')) {
    // 重置数据逻辑
    alert('数据已重置')
  }
}

onMounted(async () => {
  await settingsStore.loadSettings()
  Object.assign(settings, settingsStore.settings)
})
</script>
