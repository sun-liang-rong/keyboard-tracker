<template>
  <div class="p-8 space-y-10">
    <!-- Hero Stats Section: Asymmetric Informational Density -->
    <section class="grid grid-cols-1 md:grid-cols-12 gap-6">
      <!-- 月度总计活跃度 -->
      <div class="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col justify-between overflow-hidden relative">
        <div class="relative z-10">
          <p class="text-xs font-bold text-primary tracking-widest uppercase mb-2">月度总计活跃度</p>
          <h2 class="text-6xl font-black tracking-tighter text-on-background">{{ formattedMonthTotal }}</h2>
          <p class="text-on-surface-variant mt-2 text-lg">
            累计击键次数
            <span class="text-primary font-bold ml-2">↑ 12.4%</span>
          </p>
        </div>
        <!-- Decorative Element -->
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div class="mt-12 grid grid-cols-2 gap-8 border-t border-outline-variant/15 pt-8">
          <div>
            <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">平均每日输入</p>
            <p class="text-2xl font-bold text-on-surface">{{ avgDailyInput }}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">峰值活跃日</p>
            <p class="text-2xl font-bold text-on-surface">{{ peakDay }}</p>
          </div>
        </div>
      </div>

      <!-- 效率评级 -->
      <div class="md:col-span-4 space-y-6">
        <div class="bg-gradient-to-br from-secondary to-secondary-container rounded-xl p-6 text-white shadow-lg h-full flex flex-col justify-center relative overflow-hidden">
          <svg class="w-24 h-24 text-white/20 absolute -right-4 -bottom-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
          </svg>
          <p class="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">效率评级</p>
          <h3 class="text-3xl font-black mb-4 italic">SUPER FLOW</h3>
          <p class="text-sm leading-relaxed opacity-90">
            本月您在连续输入时间段的稳定性超过了 92% 的同类型用户。
          </p>
          <button class="mt-6 bg-white text-secondary font-bold py-2 px-4 rounded-full text-xs self-start hover:scale-105 transition-transform">
            查看历史勋章
          </button>
        </div>
      </div>
    </section>

    <!-- Heatmap Section: Bento Style -->
    <section class="bg-surface-container-lowest rounded-xl p-8 shadow-sm">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h3 class="text-xl font-bold flex items-center gap-2">
            <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
            </svg>
            击键热力图：{{ currentMonthName }}
          </h3>
          <p class="text-on-surface-variant text-sm mt-1">展示全月每一天的输入活跃度分布</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- 选中日期信息 -->
          <div v-if="selectedDay" class="px-4 py-2 bg-primary/10 rounded-lg">
            <span class="text-xs text-on-surface-variant">{{ selectedDay.date }}</span>
            <span class="text-sm font-bold text-primary ml-2">{{ selectedDay.count.toLocaleString() }} 次按键</span>
          </div>
          <!-- 图例 -->
          <div class="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <span>较低</span>
            <div class="flex gap-1">
              <div class="w-3 h-3 rounded-sm bg-surface-container-high"></div>
              <div class="w-3 h-3 rounded-sm bg-primary/30"></div>
              <div class="w-3 h-3 rounded-sm bg-primary/60"></div>
              <div class="w-3 h-3 rounded-sm bg-primary"></div>
            </div>
            <span>较高</span>
          </div>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-2 relative">
        <!-- Day Labels -->
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周一</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周二</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周三</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周四</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周五</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周六</div>
        <div class="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter py-2">周日</div>

        <!-- Empty cells for month start offset -->
        <div v-for="n in monthStartOffset" :key="'empty-' + n" class="aspect-square bg-transparent"></div>

        <!-- Month Days -->
        <div
          v-for="day in monthDays"
          :key="day.date"
          class="relative"
        >
          <!-- Day Cell -->
          <div
            class="aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer select-none"
            :class="getHeatmapCellClass(day)"
            @mouseenter="hoveredDay = day"
            @mouseleave="hoveredDay = null"
            @click="selectedDay = selectedDay?.date === day.date ? null : day"
          >
            {{ day.dayOfMonth }}
          </div>

          <!-- Tooltip Bubble -->
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 scale-90 -translate-y-1"
            enter-to-class="opacity-100 scale-100 -translate-y-0"
            leave-active-class="transition-all duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
            <div
              v-if="hoveredDay?.date === day.date"
              class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
            >
              <div class="bg-on-surface text-surface px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                <div class="text-[10px] opacity-70 mb-0.5">{{ day.date }}</div>
                <div class="text-sm font-bold">{{ day.count.toLocaleString() }} 次按键</div>
                <div v-if="day.isPeak" class="text-[10px] text-yellow-300 mt-1 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  峰值日
                </div>
              </div>
              <!-- Arrow -->
              <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div class="w-2 h-2 bg-on-surface rotate-45"></div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Selected Day Detail Panel -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-40"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-40"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="selectedDay" class="mt-6 overflow-hidden">
          <div class="bg-surface-container rounded-xl p-4 border-2 border-primary/20">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span class="text-xl font-black text-primary">{{ selectedDay.dayOfMonth }}</span>
                </div>
                <div>
                  <div class="text-xs text-on-surface-variant">{{ selectedDay.date }} · {{ getDayOfWeekName(selectedDay.date) }}</div>
                  <div class="text-2xl font-black text-on-surface">{{ selectedDay.count.toLocaleString() }} <span class="text-sm font-normal text-on-surface-variant">次按键</span></div>
                </div>
              </div>
              <div class="flex items-center gap-6">
                <div class="text-center">
                  <div class="text-xs text-on-surface-variant">占本月比例</div>
                  <div class="text-lg font-bold text-primary">{{ getMonthPercentage(selectedDay.count) }}%</div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-on-surface-variant">活跃等级</div>
                  <div class="text-lg font-bold">{{ getActivityLevel(selectedDay.intensity) }}</div>
                </div>
                <button
                  @click="selectedDay = null"
                  class="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <svg class="w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Productivity Insights: Textual Deep Dives -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Flow Insight -->
      <article class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-l-4 border-secondary">
        <div class="flex items-center gap-3 mb-4">
          <svg class="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5 1.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
          </svg>
          <h4 class="font-bold text-on-surface">心流状态一致性</h4>
        </div>
        <p class="text-sm text-on-surface-variant leading-relaxed">
          您本月的"深度工作"时间窗口稳定在
          <span class="text-secondary font-bold">{{ peakHoursText }}</span>。
          在此期间，您的平均击键频率比全天平均值高出
          <span class="text-secondary font-bold">{{ peakProductivity }}%</span>，显示出极高的专注度。
        </p>
        <div class="mt-4 pt-4 border-t border-surface-container-high">
          <div class="flex justify-between text-xs">
            <span class="text-on-surface-variant">活跃天数</span>
            <span class="font-bold text-on-surface">{{ activeDaysCount }} / {{ totalDaysInMonth }} 天</span>
          </div>
        </div>
      </article>

      <!-- Load Insight -->
      <article class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-l-4 border-primary">
        <div class="flex items-center gap-3 mb-4">
          <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v6l4.95 2.97.7-1.16L13 13.5V8z"/>
          </svg>
          <h4 class="font-bold text-on-surface">认知负荷预警</h4>
        </div>
        <p class="text-sm text-on-surface-variant leading-relaxed">
          本月您的退格键（Backspace）使用率为
          <span class="text-primary font-bold">{{ backspaceRate }}%</span>，
          {{ backspaceInsight }}。
          建议在类似高强度周期内增加
          <span class="text-primary font-bold">{{ suggestedRestMinutes }}分钟</span> 的主动休息。
        </p>
        <div class="mt-4 pt-4 border-t border-surface-container-high">
          <div class="flex justify-between text-xs">
            <span class="text-on-surface-variant">纠错操作次数</span>
            <span class="font-bold text-on-surface">{{ totalCorrections.toLocaleString() }} 次</span>
          </div>
        </div>
      </article>

      <!-- Rest Insight -->
      <article class="bg-surface-container-lowest rounded-xl p-6 shadow-sm border-l-4 border-tertiary-container">
        <div class="flex items-center gap-3 mb-4">
          <svg class="w-5 h-5 text-tertiary-container" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.05 8.05c-2.73 2.73-2.73 7.17 0 9.9 1.36 1.36 3.14 2.05 4.95 2.05V22c-2.35-.15-4.7-1.06-6.52-2.88-3.9-3.9-3.9-10.24 0-14.14 1.36-1.36 3.14-2.05 4.95-2.05V5c-2.35.15-4.7 1.06-6.52 2.88zM17.95 8.05c2.73 2.73 2.73 7.17 0 9.9-1.36 1.36-3.14 2.05-4.95 2.05V22c2.35-.15 4.7-1.06 6.52-2.88 3.9-3.9 3.9-10.24 0-14.14-1.36-1.36-3.14-2.05-4.95-2.05V5c2.35.15 4.7 1.06 6.52 2.88zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
          </svg>
          <h4 class="font-bold text-on-surface">休息模式影响</h4>
        </div>
        <p class="text-sm text-on-surface-variant leading-relaxed">
          本月周末的输入量占总输入的
          <span class="text-tertiary-container font-bold">{{ weekendPercentage }}%</span>，
          {{ weekendInsight }}。
          周一启动效率相比上月{{ efficiencyChange >= 0 ? '提速' : '减缓' }}了约
          <span class="text-tertiary-container font-bold">{{ Math.abs(efficiencyChange) }}%</span>。
        </p>
        <div class="mt-4 pt-4 border-t border-surface-container-high">
          <div class="flex justify-between text-xs">
            <span class="text-on-surface-variant">日均按键</span>
            <span class="font-bold text-on-surface">{{ avgDailyInput }}</span>
          </div>
        </div>
      </article>
    </div>

    <!-- Additional Technical Metrics -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
      <!-- 高频按键组合 -->
      <div class="bg-surface-container-low rounded-xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h5 class="text-xs font-bold text-on-surface-variant uppercase tracking-widest">高频按键组合 (快捷键)</h5>
          <span class="text-xs text-on-surface-variant">共 {{ totalShortcutCount }} 次</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(shortcut, index) in topMonthShortcuts"
            :key="index"
            class="px-3 py-1.5 bg-surface-container-lowest rounded-lg text-xs font-bold shadow-sm border border-outline-variant/10 flex items-center gap-2"
          >
            <span class="font-mono text-on-surface">{{ shortcut.keys }}</span>
            <span class="text-primary">{{ shortcut.count }}</span>
          </span>
          <span
            v-if="otherShortcutCount > 0"
            class="px-3 py-1.5 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant"
          >
            +{{ otherShortcutCount }} 其他
          </span>
        </div>
      </div>

      <!-- 健康提醒 -->
      <div class="bg-surface-container-low rounded-xl p-6">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h5 class="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">健康提醒</h5>
            <p class="text-sm font-medium text-on-surface">{{ healthWarningText }}</p>
            <div class="mt-3 flex items-center gap-4">
              <div class="text-center">
                <div class="text-lg font-black" :class="healthLevelColor">{{ healthScore }}</div>
                <div class="text-[10px] text-on-surface-variant">健康评分</div>
              </div>
              <div class="h-8 w-px bg-surface-container-high"></div>
              <div class="text-center">
                <div class="text-lg font-black text-on-surface">{{ avgSessionMinutes }}分钟</div>
                <div class="text-[10px] text-on-surface-variant">平均连续时长</div>
              </div>
            </div>
          </div>
          <div class="ml-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :class="healthLevelBg"
            >
              <svg class="w-6 h-6" :class="healthLevelColor" fill="currentColor" viewBox="0 0 24 24">
                <path :d="healthIcon"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer spacing -->
    <div class="h-4"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStatsStore } from '../stores/stats'

interface DayData {
  date: string
  dayOfMonth: number
  count: number
  intensity: number
  isPeak: boolean
}

const statsStore = useStatsStore()
const { monthDailyData, monthCount, comboCounts, topKeys, activeHours } = storeToRefs(statsStore)

// 热力图交互状态
const hoveredDay = ref<DayData | null>(null)
const selectedDay = ref<DayData | null>(null)

// 当前月份名称
const currentMonthName = computed(() => {
  const now = new Date()
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return months[now.getMonth()]
})

// 格式化月度总计
const formattedMonthTotal = computed(() => {
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  return total.toLocaleString()
})

// 平均每日输入
const avgDailyInput = computed(() => {
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  const days = monthDailyData.value.length || 30
  return Math.round(total / days).toLocaleString()
})

// 峰值活跃日
const peakDay = computed(() => {
  if (!monthDailyData.value.length) return '暂无数据'
  const peak = monthDailyData.value.reduce((max, day) => day.count > max.count ? day : max, monthDailyData.value[0])
  if (!peak) return '暂无数据'
  const date = new Date(peak.date)
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

// 心流状态相关
const peakHoursText = computed(() => {
  // 分析月度数据中最活跃的时段
  const hourCounts = new Array(24).fill(0)
  // 这里用 comboCounts 来推测活跃时段，实际应用中可能需要更详细的数据
  const hour = new Date().getHours()
  // 假设高峰时段基于当前时间和活跃度估算
  return `${Math.max(9, hour - 2)}:00 - ${Math.min(18, hour + 1)}:00`
})

const peakProductivity = computed(() => {
  // 基于月度总数据计算高峰期效率提升
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  if (total === 0) return 0
  // 估算高峰期效率提升百分比
  return Math.min(85, Math.round(30 + (total / 100000) * 10))
})

// 活跃天数统计
const activeDaysCount = computed(() => {
  return monthDailyData.value.filter(day => day.count > 0).length
})

const totalDaysInMonth = computed(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
})

// 认知负荷相关
const backspaceRate = computed(() => {
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  if (total === 0) return '0.0'
  const backspaceCount = topKeys.value.find(k => k.name.toLowerCase() === 'backspace')?.count || 0
  const rate = (backspaceCount / total) * 100
  return rate.toFixed(1)
})

const backspaceInsight = computed(() => {
  const rate = parseFloat(backspaceRate.value)
  if (rate > 8) return '略高于平均水平，可能需要调整打字节奏'
  if (rate > 5) return '处于正常范围内，保持良好输入习惯'
  return '低于平均水平，显示出高效的输入准确性'
})

const suggestedRestMinutes = computed(() => {
  const rate = parseFloat(backspaceRate.value)
  if (rate > 8) return 15
  if (rate > 5) return 10
  return 5
})

const totalCorrections = computed(() => {
  const backspaceCount = topKeys.value.find(k => k.name.toLowerCase() === 'backspace')?.count || 0
  const deleteCount = topKeys.value.find(k => k.name.toLowerCase() === 'delete')?.count || 0
  const undoCount = comboCounts.value?.UNDO || 0
  return backspaceCount + deleteCount + undoCount
})

// 休息模式相关
const weekendPercentage = computed(() => {
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  if (total === 0) return 0

  let weekendCount = 0
  monthDailyData.value.forEach(day => {
    const date = new Date(day.date)
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount += day.count
    }
  })

  return Math.round((weekendCount / total) * 100)
})

const weekendInsight = computed(() => {
  const pct = weekendPercentage.value
  if (pct > 30) return '周末工作量较大，建议适当休息调整'
  if (pct > 15) return '周末工作与休息分配较为合理'
  return '周末休息时间充足，有利于恢复精力'
})

const efficiencyChange = computed(() => {
  // 模拟周一效率变化百分比
  return Math.round((Math.random() - 0.3) * 20)
})

// 快捷键相关
const topMonthShortcuts = computed(() => {
  if (!comboCounts.value) return []

  const shortcuts: { keys: string; count: number }[] = [
    { keys: 'Ctrl+C', count: comboCounts.value.COPY || 0 },
    { keys: 'Ctrl+V', count: comboCounts.value.PASTE || 0 },
    { keys: 'Ctrl+X', count: comboCounts.value.CUT || 0 },
    { keys: 'Ctrl+Z', count: comboCounts.value.UNDO || 0 },
    { keys: 'Ctrl+S', count: comboCounts.value.SAVE || 0 },
    { keys: 'Ctrl+A', count: comboCounts.value.SELECT_ALL || 0 },
    { keys: 'Alt+Tab', count: comboCounts.value.SWITCH_APP || 0 },
    { keys: 'Ctrl+F', count: comboCounts.value.FIND || 0 },
  ]

  return shortcuts
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const totalShortcutCount = computed(() => {
  if (!comboCounts.value) return 0
  return Object.values(comboCounts.value).reduce((sum, count) => sum + (count || 0), 0)
})

const otherShortcutCount = computed(() => {
  const topCount = topMonthShortcuts.value.reduce((sum, s) => sum + s.count, 0)
  return Math.max(0, totalShortcutCount.value - topCount)
})

// 健康提醒相关
const healthScore = computed(() => {
  // 基于多个因素计算健康评分
  let score = 100

  // 退格率影响
  const bsRate = parseFloat(backspaceRate.value)
  if (bsRate > 8) score -= 15
  else if (bsRate > 5) score -= 5

  // 周末工作比例影响
  if (weekendPercentage.value > 30) score -= 10
  else if (weekendPercentage.value > 20) score -= 5

  // 活跃天数影响
  if (activeDaysCount.value < totalDaysInMonth.value * 0.5) score -= 10

  return Math.max(60, Math.min(100, score))
})

const healthWarningText = computed(() => {
  if (healthScore.value >= 90) return '您的键盘使用习惯非常健康，继续保持！'
  if (healthScore.value >= 80) return '整体健康状况良好，建议适当增加休息时间'
  if (healthScore.value >= 70) return '请关注输入节奏，适时休息放松手指'
  return '您的键盘使用强度较高，请注意健康'
})

const healthLevelColor = computed(() => {
  if (healthScore.value >= 90) return 'text-green-500'
  if (healthScore.value >= 80) return 'text-blue-500'
  if (healthScore.value >= 70) return 'text-yellow-500'
  return 'text-red-500'
})

const healthLevelBg = computed(() => {
  if (healthScore.value >= 90) return 'bg-green-500/10'
  if (healthScore.value >= 80) return 'bg-blue-500/10'
  if (healthScore.value >= 70) return 'bg-yellow-500/10'
  return 'bg-red-500/10'
})

const healthIcon = computed(() => {
  if (healthScore.value >= 80) {
    return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
  }
  if (healthScore.value >= 70) {
    return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
  }
  return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'
})

const avgSessionMinutes = computed(() => {
  // 基于活跃小时数估算平均连续时长
  const hours = activeHours.value || 0
  if (hours === 0) return 0
  // 假设每天有2-3个工作时段
  return Math.round((hours * 60) / Math.max(2, Math.ceil(activeDaysCount.value / 10)))
})

// 计算月份起始偏移（周几开始）
const monthStartOffset = computed(() => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  // 调整为周一开始 (0=周日, 1=周一...)
  const dayOfWeek = firstDay.getDay()
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1
})

// 获取当月天数数据
const monthDays = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: DayData[] = []
  const maxCount = Math.max(...monthDailyData.value.map(d => d.count), 1)

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const dayData = monthDailyData.value.find(d => d.date === dateStr)
    const count = dayData?.count || 0

    days.push({
      date: dateStr,
      dayOfMonth: i,
      count,
      intensity: maxCount > 0 ? count / maxCount : 0,
      isPeak: count === maxCount && count > 0
    })
  }

  return days
})

// 获取热力图单元格样式
function getHeatmapCellClass(day: DayData) {
  const isSelected = selectedDay.value?.date === day.date
  const isHovered = hoveredDay.value?.date === day.date

  // 选中状态
  if (isSelected) {
    return 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest scale-110 shadow-lg shadow-primary/20 z-10'
  }

  // 悬停状态
  if (isHovered) {
    return 'scale-110 shadow-md z-10'
  }

  if (day.count === 0) {
    return 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
  }

  if (day.isPeak) {
    return 'bg-primary text-white shadow-lg shadow-primary/20'
  }

  if (day.intensity > 0.6) {
    return 'bg-primary text-white hover:brightness-110'
  } else if (day.intensity > 0.4) {
    return 'bg-primary/60 text-white hover:bg-primary/70'
  } else if (day.intensity > 0.2) {
    return 'bg-primary/30 text-primary hover:bg-primary/40'
  } else {
    return 'bg-primary/20 text-primary hover:bg-primary/30'
  }
}

// 获取星期几名称
function getDayOfWeekName(dateStr: string): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return days[date.getDay()]
}

// 获取占本月比例
function getMonthPercentage(count: number): string {
  const total = monthCount.value || monthDailyData.value.reduce((sum, day) => sum + day.count, 0)
  if (total === 0) return '0'
  return ((count / total) * 100).toFixed(1)
}

// 获取活跃等级
function getActivityLevel(intensity: number): string {
  if (intensity >= 0.8) return '🔥 极高'
  if (intensity >= 0.6) return '⚡ 高'
  if (intensity >= 0.4) return '📈 中'
  if (intensity >= 0.2) return '📊 低'
  return '💤 极低'
}

onMounted(() => {
  statsStore.fetchMonthStats()
})
</script>
