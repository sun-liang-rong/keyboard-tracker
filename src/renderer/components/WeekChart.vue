<template>
  <div ref="chartRef" class="w-full h-64"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{
  dailyCounts: number[]
  labels: string[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const settingsStore = useSettingsStore()

function initChart() {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value, settingsStore.settings.theme === 'dark' ? 'dark' : undefined)
  updateChart()

  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chart?.resize()
}

function updateChart() {
  if (!chart) return

  const isDark = settingsStore.settings.theme === 'dark'
  const data = props.dailyCounts.length === 7 ? props.dailyCounts : new Array(7).fill(0)
  const labels = props.labels.length === 7 ? props.labels : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const label = params[0].name
        const value = params[0].value
        return `${label}<br/>按键次数: ${value.toLocaleString()}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: {
        lineStyle: { color: isDark ? '#6b7280' : '#9ca3af' },
      },
      axisLabel: {
        color: isDark ? '#d1d5db' : '#4b5563',
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: isDark ? '#d1d5db' : '#4b5563',
      },
    },
    series: [
      {
        name: '按键次数',
        type: 'line',
        data: data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#8b5cf6' },
          ]),
        },
        itemStyle: {
          color: '#3b82f6',
          borderWidth: 2,
          borderColor: isDark ? '#1f2937' : '#ffffff',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
          ]),
        },
      },
    ],
  }

  chart.setOption(option)
}

// 监听数据变化
watch(() => props.dailyCounts, updateChart, { deep: true })
watch(() => props.labels, updateChart)

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  // 只更新图表主题配置，不销毁重建
  if (chart) {
    updateChart()
  }
})

onMounted(initChart)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>
