<template>
  <div class="top-keys-chart">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-gray-900 dark:text-white">
        高频按键 TOP{{ displayCount }}
      </h3>
      <div class="flex gap-1">
        <button
          v-for="n in [10, 20]"
          :key="n"
          @click="displayCount = n"
          :class="displayCount === n ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          class="px-2 py-1 rounded text-xs font-medium transition-colors"
        >
          TOP{{ n }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="(key, index) in displayedKeys"
        :key="key.name"
        class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <!-- 排名 -->
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          :class="getRankClass(index)"
        >
          {{ index + 1 }}
        </div>

        <!-- 按键名称 -->
        <div class="w-16 flex-shrink-0">
          <span
            class="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-mono font-medium"
            :class="getKeyClass(key.category)"
          >
            {{ formatKeyName(key.name) }}
          </span>
        </div>

        <!-- 分类标签 -->
        <div class="w-16 flex-shrink-0">
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="getCategoryBadgeClass(key.category)"
          >
            {{ getCategoryLabel(key.category) }}
          </span>
        </div>

        <!-- 进度条 -->
        <div class="flex-1">
          <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="getBarClass(key.category)"
              :style="{ width: getPercentage(key.count) + '%' }"
            ></div>
          </div>
        </div>

        <!-- 次数 -->
        <div class="w-16 text-right">
          <span class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ key.count.toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空数据提示 -->
    <div v-if="displayedKeys.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
      暂无按键数据
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TopKeyItem } from '../stores/stats'

interface Props {
  topKeys: TopKeyItem[]
}

const props = defineProps<Props>()
const displayCount = ref(10)

const displayedKeys = computed(() => {
  return props.topKeys.slice(0, displayCount.value)
})

const maxCount = computed(() => {
  if (props.topKeys.length === 0) return 1
  return props.topKeys[0].count
})

function getPercentage(count: number): number {
  if (maxCount.value === 0) return 0
  return (count / maxCount.value) * 100
}

function getRankClass(index: number): string {
  if (index === 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (index === 1) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  if (index === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
}

function formatKeyName(name: string): string {
  // 处理特殊按键名称
  const specialNames: Record<string, string> = {
    'Space': '␣',
    'Enter': '↵',
    'Tab': '⇥',
    'Backspace': '⌫',
    'Delete': '⌦',
    'Escape': 'Esc',
    'Up': '↑',
    'Down': '↓',
    'Left': '←',
    'Right': '→',
    'Home': '⇱',
    'End': '⇲',
    'PageUp': '⇞',
    'PageDown': '⇟',
    'Insert': 'Ins',
  }
  return specialNames[name] || name.toUpperCase()
}

function getKeyClass(category: string): string {
  const classes: Record<string, string> = {
    letter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    number: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    function: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    control: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    symbol: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    modifier: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return classes[category] || classes.other
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    letter: '字母',
    number: '数字',
    function: '功能',
    control: '控制',
    symbol: '符号',
    modifier: '修饰',
    other: '其他',
  }
  return labels[category] || category
}

function getCategoryBadgeClass(category: string): string {
  const classes: Record<string, string> = {
    letter: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    number: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    function: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
    control: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    symbol: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
    modifier: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    other: 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500',
  }
  return classes[category] || classes.other
}

function getBarClass(category: string): string {
  const classes: Record<string, string> = {
    letter: 'bg-blue-500',
    number: 'bg-emerald-500',
    function: 'bg-violet-500',
    control: 'bg-amber-500',
    symbol: 'bg-pink-500',
    modifier: 'bg-gray-500',
    other: 'bg-gray-400',
  }
  return classes[category] || classes.other
}
</script>
