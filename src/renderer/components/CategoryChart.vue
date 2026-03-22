<template>
  <div class="category-chart">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <h3 class="text-base font-medium text-gray-900 dark:text-white">按键分类占比</h3>
      <div class="flex gap-2 mt-2 sm:mt-0">
        <button
          @click="chartType = 'bar'"
          :class="chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          柱状图
        </button>
        <button
          @click="chartType = 'pie'"
          :class="chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          饼图
        </button>
      </div>
    </div>

    <!-- 柱状图 -->
    <div v-if="chartType === 'bar'" class="space-y-3">
      <div
        v-for="item in categoryData"
        :key="item.name"
        class="flex items-center gap-3"
      >
        <div class="w-16 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{{ item.label }}</div>
        <div class="flex-1">
          <div class="h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{ width: item.percentage + '%', backgroundColor: item.color }"
            ></div>
          </div>
        </div>
        <div class="w-24 text-right text-sm">
          <span class="font-semibold text-gray-900 dark:text-white">{{ item.count.toLocaleString() }}</span>
          <span class="text-gray-500 dark:text-gray-400 text-xs ml-1">({{ item.percentage.toFixed(1) }}%)</span>
        </div>
      </div>
    </div>

    <!-- 饼图 -->
    <div v-else class="flex flex-col sm:flex-row items-center gap-6">
      <div class="relative w-40 h-40">
        <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
          <circle
            v-for="(slice, index) in pieSlices"
            :key="index"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            :stroke="slice.color"
            stroke-width="20"
            :stroke-dasharray="slice.dashArray"
            :stroke-dashoffset="slice.dashOffset"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="text-xs text-gray-500 dark:text-gray-400">总计</div>
            <div class="text-lg font-bold text-gray-900 dark:text-white">{{ totalCount.toLocaleString() }}</div>
          </div>
        </div>
      </div>
      <div class="flex-1 grid grid-cols-2 gap-2">
        <div
          v-for="item in categoryData"
          :key="item.name"
          class="flex items-center gap-2"
        >
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: item.color }"
          ></div>
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ item.label }}</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.percentage.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { KeyCategoryCount } from '../stores/stats'

interface Props {
  categoryCount: KeyCategoryCount
}

const props = defineProps<Props>()
const chartType = ref<'bar' | 'pie'>('bar')

const categoryConfig = {
  letter: { label: '字母键', color: '#3B82F6' },    // blue-500
  number: { label: '数字键', color: '#10B981' },    // emerald-500
  function: { label: '功能键', color: '#8B5CF6' },  // violet-500
  control: { label: '控制键', color: '#F59E0B' },   // amber-500
  symbol: { label: '符号键', color: '#EC4899' },    // pink-500
  modifier: { label: '修饰键', color: '#6B7280' },  // gray-500
  other: { label: '其他', color: '#9CA3AF' },       // gray-400
}

const categoryData = computed(() => {
  const total = Object.values(props.categoryCount).reduce((sum, count) => sum + count, 0)
  return Object.entries(props.categoryCount)
    .filter(([, count]) => count > 0) // 只显示有数据的分类
    .map(([name, count]) => {
      const config = categoryConfig[name as keyof typeof categoryConfig] || { label: name, color: '#9CA3AF' }
      return {
        name,
        label: config.label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: config.color,
      }
    })
    .sort((a, b) => b.count - a.count) // 按数量降序排列
})

const totalCount = computed(() => {
  return Object.values(props.categoryCount).reduce((sum, count) => sum + count, 0)
})

// 计算饼图的 slice 数据
const pieSlices = computed(() => {
  const total = totalCount.value
  if (total === 0) return []

  const radius = 40
  const circumference = 2 * Math.PI * radius
  let currentOffset = 0

  return categoryData.value.map((item) => {
    const percentage = item.count / total
    const dashArray = percentage * circumference
    const dashOffset = currentOffset
    currentOffset -= dashArray

    return {
      color: item.color,
      dashArray: `${dashArray} ${circumference}`,
      dashOffset: dashOffset,
    }
  })
})
</script>
