<template>
  <header class="flex justify-between items-center px-6 w-full h-14 sticky top-0 z-50 bg-surface" style="-webkit-app-region: drag">
    <div class="flex items-center gap-4" style="-webkit-app-region: no-drag">
      <slot name="left">
        <span class="font-body font-semibold tracking-tight text-on-surface-variant text-sm">{{ currentDate }}</span>
      </slot>
    </div>
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      <slot name="right">
        <button class="w-10 h-8 flex items-center justify-center hover:bg-surface-container-high transition-colors active:opacity-70 text-on-surface-variant" @click="minimizeWindow">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
          </svg>
        </button>
        <button class="w-10 h-8 flex items-center justify-center hover:bg-surface-container-high transition-colors active:opacity-70 text-on-surface-variant" @click="toggleMaximize">
          <!-- 最大化图标：空心方框 -->
          <svg v-if="!isMaximized" class="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1.75" y="1.75" width="10.5" height="10.5" rx="1"/>
          </svg>
          <!-- 还原图标：两个重叠方框 -->
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1.75" y="4.25" width="8" height="8" rx="1"/>
            <path d="M4.25 4.25V2.75a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H9.75"/>
          </svg>
        </button>
        <button class="w-10 h-8 flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors active:opacity-70 text-on-surface-variant" @click="closeWindow">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </slot>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const currentDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[now.getDay()]
  return `${year}年${month}月${day}日 ${weekday}`
})

const isMaximized = ref(false)

function minimizeWindow() {
  try {
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow()
    }
  } catch (error) {
    console.error('[Renderer] Error calling minimizeWindow:', error)
  }
}

function closeWindow() {
  try {
    if (window.electronAPI) {
      window.electronAPI.closeWindow()
    }
  } catch (error) {
    console.error('[Renderer] Error calling closeWindow:', error)
  }
}

async function toggleMaximize() {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.toggleMaximize()
      isMaximized.value = result
    }
  } catch (error) {
    console.error('[Renderer] Error toggling maximize:', error)
  }
}

onMounted(async () => {
  // 初始化最大化状态
  if (window.electronAPI) {
    isMaximized.value = await window.electronAPI.isMaximized()
  }
})
</script>
