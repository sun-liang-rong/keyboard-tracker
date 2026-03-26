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
      backgroundColor: isDark ? '#2d3133' : '#ffffff',
      borderColor: isDark ? '#434655' : '#e0e3e5',
      textStyle: {
        color: isDark ? '#f7f9fb' : '#191c1e',
        fontSize: 12,
      },
      formatter: (params: any) => {
        const label = params[0].name
        const value = params[0].value
        return `<div style="font-weight:600">${label}</div>
                <div style="color:#004ac6;font-weight:bold">${value.toLocaleString()} 按键</div>`
      },
    },
    grid: {
      left: '2%',
      right: '3%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: {
        lineStyle: { color: isDark ? '#434655' : '#e0e3e5' },
      },
      axisLabel: {
        color: isDark ? '#737686' : '#737686',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: isDark ? '#434655' : '#e0e3e5',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: isDark ? '#737686' : '#737686',
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
            { offset: 0, color: '#004ac6' },
            { offset: 1, color: '#6b38d4' },
          ]),
        },
        itemStyle: {
          color: '#004ac6',
          borderWidth: 2,
          borderColor: isDark ? '#2d3133' : '#ffffff',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 74, 198, 0.3)' },
            { offset: 1, color: 'rgba(0, 74, 198, 0.05)' },
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
