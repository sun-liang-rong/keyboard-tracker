<template>
  <div ref="chartRef" class="w-full h-64"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{
  hourlyData: number[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const settingsStore = useSettingsStore()

// 生成小时标签 (00:00 - 23:00)
const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`)

function initChart() {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value, settingsStore.settings.theme === 'dark' ? 'dark' : undefined)
  updateChart()

  // 监听主题变化
  window.addEventListener('resize', handleResize)
}

function handleResize() {
  chart?.resize()
}

function updateChart() {
  if (!chart) return

  const isDark = settingsStore.settings.theme === 'dark'
  const data = props.hourlyData.length === 24 ? props.hourlyData : new Array(24).fill(0)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const hour = params[0].dataIndex
        const value = params[0].value
        return `${hour}:00 - ${hour}:59<br/>按键次数: ${value}`
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: {
        lineStyle: { color: isDark ? '#6b7280' : '#9ca3af' },
      },
      axisLabel: {
        color: isDark ? '#d1d5db' : '#4b5563',
        interval: 2,
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
        type: 'bar',
        data: data,
        barWidth: '70%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#60a5fa' },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2563eb' },
              { offset: 1, color: '#3b82f6' },
            ]),
          },
        },
      },
    ],
  }

  chart.setOption(option)
}

// 监听数据变化
watch(() => props.hourlyData, updateChart, { deep: true })

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
