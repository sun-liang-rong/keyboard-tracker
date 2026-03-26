<template>
  <div class="category-chart">
    <!-- 标题和切换按钮 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="flex gap-2 items-center text-base font-bold text-on-surface">
        <span class="w-1 h-4 rounded-full bg-tertiary"></span>
        按键分类占比
      </h3>
      <div class="flex overflow-hidden rounded-md bg-surface-container">
        <button
          @click="chartType = 'bar'"
          :class="chartType === 'bar'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-transparent text-on-surface-variant hover:bg-surface-container-high'"
          class="px-2.5 py-1 text-xs font-semibold transition-all"
        >
          柱状图
        </button>
        <button
          @click="chartType = 'pie'"
          :class="chartType === 'pie'
            ? 'bg-primary text-white shadow-sm'
            : 'bg-transparent text-on-surface-variant hover:bg-surface-container-high'"
          class="px-2.5 py-1 text-xs font-semibold transition-all"
        >
          饼图
        </button>
      </div>
    </div>

    <!-- 柱状图视图 -->
    <div v-if="chartType === 'bar'" class="space-y-1.5">
      <div
        v-for="(item, index) in categoryData"
        :key="item.name"
        class="group flex items-center gap-2 px-1 py-1 -mx-1 rounded-md transition-colors hover:bg-surface-container"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <!-- 分类图标和名称 -->
        <div class="flex items-center gap-1.5 w-20 flex-shrink-0">
          <div
            class="flex items-center justify-center w-5 h-5 rounded text-white text-[10px] font-bold"
            :style="{ backgroundColor: item.color }"
          >
            {{ item.icon }}
          </div>
          <span class="text-xs font-medium text-on-surface-variant">{{ item.label }}</span>
        </div>

        <!-- 进度条 -->
        <div class="flex-1 relative">
          <div class="h-4 bg-surface-container-high rounded overflow-hidden">
            <div
              class="h-full rounded transition-all duration-700 ease-out relative overflow-hidden"
              :style="{ width: item.percentage + '%', backgroundColor: item.color }"
            >
              <!-- 光泽效果 -->
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>
          </div>
        </div>

        <!-- 数值 -->
        <div class="w-16 text-right flex-shrink-0 flex items-baseline justify-end gap-1">
          <span class="text-xs font-bold text-on-surface">{{ formatNumber(item.count) }}</span>
          <span class="text-[10px] text-on-surface-variant">{{ item.percentage.toFixed(0) }}%</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="categoryData.length === 0" class="py-6 text-center text-on-surface-variant">
        <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-xs">暂无数据</p>
      </div>
    </div>

    <!-- 饼图视图 (ECharts) -->
    <div v-else class="flex justify-center">
      <div ref="chartRef" class="w-52 h-52"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useSettingsStore } from '../stores/settings'
import type { KeyCategoryCount } from '../stores/stats'

interface Props {
  categoryCount: KeyCategoryCount
}

const props = defineProps<Props>()
const settingsStore = useSettingsStore()
const chartType = ref<'bar' | 'pie'>('bar')
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 分类配置：标签、颜色、图标
const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  letter: { label: '字母', color: '#2563eb', icon: 'A' },
  number: { label: '数字', color: '#7c3aed', icon: '1' },
  function: { label: '功能', color: '#db2777', icon: 'F' },
  control: { label: '控制', color: '#ea580c', icon: '⏎' },
  symbol: { label: '符号', color: '#0891b2', icon: '#' },
  modifier: { label: '修饰', color: '#65a30d', icon: '⌘' },
  other: { label: '其他', color: '#64748b', icon: '?' },
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toLocaleString()
}

// 处理后的分类数据
const categoryData = computed(() => {
  const total = Object.values(props.categoryCount).reduce((sum, count) => sum + count, 0)
  return Object.entries(props.categoryCount)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => {
      const config = categoryConfig[name] || { label: name, color: '#64748b', icon: '?' }
      return {
        name,
        label: config.label,
        icon: config.icon,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        color: config.color,
      }
    })
    .sort((a, b) => b.count - a.count)
})

// 总数
const totalCount = computed(() => {
  return Object.values(props.categoryCount).reduce((sum, count) => sum + count, 0)
})

// 初始化饼图
function initPieChart() {
  if (!chartRef.value) {
    console.warn('[CategoryChart] chartRef not ready')
    return
  }

  // 销毁旧实例
  if (chart) {
    chart.dispose()
    chart = null
  }

  chart = echarts.init(chartRef.value, settingsStore.settings.theme === 'dark' ? 'dark' : undefined)
  updatePieChart()

  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chart?.resize()
}

function updatePieChart() {
  if (!chart) return

  const isDark = settingsStore.settings.theme === 'dark'

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: isDark ? '#2d3133' : '#ffffff',
      borderColor: isDark ? '#434655' : '#e0e3e5',
      textStyle: {
        color: isDark ? '#f7f9fb' : '#191c1e',
        fontSize: 13,
      },
      formatter: (params: any) => {
        return `<div style="font-weight:600; margin-bottom:4px;">${params.name}</div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="color:${params.color}; font-weight:bold;">${params.value.toLocaleString()}</span>
                  <span style="color:${isDark ? '#737686' : '#5c5f6e'};">(${params.percent.toFixed(1)}%)</span>
                </div>`
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark ? '#1a1c1e' : '#ffffff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        data: categoryData.value.map(item => ({
          value: item.count,
          name: item.label,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
    // 中心文字
    graphic: totalCount.value > 0
      ? ([
          {
            type: 'text',
            left: 'center',
            top: '40%',
            style: {
              text: formatNumber(totalCount.value),
              textAlign: 'center',
              fill: isDark ? '#f7f9fb' : '#191c1e',
              fontSize: 20,
              fontWeight: 'bold' as const,
            },
          },
          {
            type: 'text',
            left: 'center',
            top: '54%',
            style: {
              text: '按键总数',
              textAlign: 'center',
              fill: isDark ? '#737686' : '#5c5f6e',
              fontSize: 11,
            },
          },
        ] as unknown as echarts.GraphicComponentOption[])
      : [],
  }

  chart.setOption(option, true)
}

// 监听数据变化
watch(() => props.categoryCount, () => {
  if (chartType.value === 'pie' && chart) {
    nextTick(() => {
      updatePieChart()
    })
  }
}, { deep: true })

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  if (chart) {
    updatePieChart()
  }
})

// 监听图表类型切换
watch(chartType, (newType) => {
  if (newType === 'pie') {
    nextTick(() => {
      // 确保 DOM 已渲染
      if (chartRef.value) {
        // 销毁旧实例，重新创建
        if (chart) {
          chart.dispose()
          chart = null
        }
        initPieChart()
      }
    })
  } else {
    // 切换到柱状图时销毁饼图实例
    if (chart) {
      chart.dispose()
      chart = null
    }
  }
})

onMounted(() => {
  // 默认柱状图，不需要初始化饼图
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.category-chart {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>