<template>
  <div class="top-keys-chart">
    <!-- 非紧凑模式显示标题和切换按钮 -->
    <div v-if="!compact" class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-on-surface">
        高频按键 TOP{{ displayCount }}
      </h3>
      <div class="flex gap-1">
        <button
          v-for="n in [10, 20]"
          :key="n"
          @click="displayCount = n"
          :class="displayCount === n ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'"
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
        >
          TOP{{ n }}
        </button>
      </div>
    </div>

    <div class="space-y-2" :class="compact ? 'space-y-1' : 'space-y-2'">
      <div
        v-for="(key, index) in displayedKeys"
        :key="key.name"
        class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors"
        :class="compact ? 'py-1.5' : 'p-2'"
      >
        <div class="flex items-center gap-3">
          <!-- 排名 -->
          <span
            v-if="compact"
            class="w-6 h-6 flex items-center justify-center bg-secondary/10 text-secondary text-[10px] font-black rounded"
          >
            {{ String(index + 1).padStart(2, '0') }}
          </span>
          <div
            v-else
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="getRankClass(index)"
          >
            {{ index + 1 }}
          </div>

          <!-- 按键名称 -->
          <span class="font-bold text-on-surface text-sm">{{ formatKeyNameCompact(key.name) }}</span>
        </div>

        <!-- 次数 -->
        <span class="text-xs font-medium text-on-surface/70 bg-surface-container-high px-2 py-0.5 rounded-full">
          {{ key.count.toLocaleString() }}
        </span>
      </div>
    </div>

    <!-- 空数据提示 -->
    <div v-if="displayedKeys.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
      <svg class="w-12 h-12 text-on-surface-variant mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm font-medium text-on-surface-variant">暂无按键记录</p>
      <p class="text-xs text-on-surface-variant/60 mt-1">开始按键后会显示统计数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TopKeyItem } from '../stores/stats'

interface Props {
  topKeys: TopKeyItem[]
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
})

const displayCount = ref(10)

const displayedKeys = computed(() => {
  const count = props.compact ? 8 : displayCount.value
  return props.topKeys.slice(0, count)
})

function getRankClass(index: number): string {
  if (index === 0) return 'bg-tertiary-fixed text-tertiary'
  if (index === 1) return 'bg-surface-container-high text-on-surface-variant'
  if (index === 2) return 'bg-secondary-fixed text-secondary'
  return 'bg-surface-container text-on-surface-variant'
}

function formatKeyNameCompact(name: string): string {
  // 处理特殊按键名称
  const specialNames: Record<string, string> = {
    'Space': 'Space',
    'Enter': 'Enter',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PgUp',
    'PageDown': 'PgDn',
    'Insert': 'Ins',
    'Shift': 'Shift',
    'Control': 'Ctrl',
    'Alt': 'Alt',
    'Meta': 'Win',
    'CapsLock': 'Caps',
  }
  return specialNames[name] || name
}
</script>
