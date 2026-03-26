<template>
  <div ref="chartRef" class="w-full h-full"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{
  hourlyData: number[]
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const settingsStore = useSettingsStore()

// 计算最大值用于颜色映射
const maxValue = computed(() => {
  const data = props.hourlyData.length === 24 ? props.hourlyData : new Array(24).fill(0)
  return Math.max(...data, 1)
})

// 计算图表数据，确保响应式
const chartData = computed(() => {
  return props.hourlyData.length === 24 ? [...props.hourlyData] : new Array(24).fill(0)
})

function getBarColor(value: number) {
  const ratio = value / maxValue.value
  if (ratio > 0.8) return '#004ac6' // primary
  if (ratio > 0.6) return '#2563eb' // primary-container
  if (ratio > 0.4) return '#60a5fa'
  if (ratio > 0.2) return '#93c5fd'
  return '#dbeafe'
}

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
  const data = chartData.value

  // X轴标签：24个元素，每4小时显示一次标签
  const xAxisLabels = []
  for (let i = 0; i < 24; i++) {
    if (i % 4 === 0) {
      xAxisLabels.push(`${i.toString().padStart(2, '0')}:00`)
    } else {
      xAxisLabels.push('')
    }
  }

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
        const hour = params[0].dataIndex
        const value = params[0].value
        return `<div style="font-weight:600">${hour}:00 - ${hour}:59</div>
                <div style="color:#004ac6;font-weight:bold">${value.toLocaleString()} 按键</div>`
      },
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '8%',
      top: '5%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: xAxisLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#737686' : '#737686',
        fontSize: 10,
        fontWeight: 'bold',
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      show: false,
    },
    series: [
      {
        name: '按键次数',
        type: 'bar',
        data: data,
        barWidth: '60%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          color: (params: any) => {
            const value = params.value as number
            return getBarColor(value)
          },
        },
        emphasis: {
          itemStyle: {
            color: '#004ac6',
          },
        },
      },
    ],
  }

  chart.setOption(option)
}

// 监听数据变化，使用 computed 确保检测到变化
watch(chartData, async () => {
  await nextTick()
  updateChart()
}, { deep: true })

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
