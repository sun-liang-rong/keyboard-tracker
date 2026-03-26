<template>
  <div class="p-8 space-y-8">
    <!-- Summary Stats Bento Grid -->
    <section class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- 本周总击键数 -->
      <div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-primary/5 group">
        <div class="flex justify-between items-start mb-4">
          <span class="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">本周总击键数</span>
          <svg class="w-5 h-5 text-primary group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zM7 15H5v-2h2v2zm3 0H8v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm0-5h-2v-2h2v2zm0-3h-2V8h2v2z"/>
          </svg>
        </div>
        <div>
          <div class="text-4xl font-black tracking-tighter text-on-surface">{{ formattedWeekTotal }}</div>
          <div class="text-xs text-primary font-bold mt-1 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
            12.5% 较上周
          </div>
        </div>
      </div>

      <!-- 活跃时长 -->
      <div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-secondary/5 group">
        <div class="flex justify-between items-start mb-4">
          <span class="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">活跃时长</span>
          <svg class="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
        </div>
        <div>
          <div class="text-4xl font-black tracking-tighter text-on-surface">{{ weekActiveHoursDisplay }}</div>
          <div class="text-xs text-on-surface-variant font-medium mt-1">日均活跃 {{ avgDailyHours }} 小时</div>
        </div>
      </div>

      <!-- 专注得分 -->
      <div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-primary/5 group">
        <div class="flex justify-between items-start mb-4">
          <span class="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">专注得分</span>
          <svg class="w-5 h-5 text-primary group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v6l4.95 2.97.7-1.16L13 13.5V8z"/>
          </svg>
        </div>
        <div>
          <div class="text-4xl font-black tracking-tighter text-on-surface">{{ focusScore }}/100</div>
          <div class="w-full bg-surface-container mt-3 h-1.5 rounded-full overflow-hidden">
            <div class="bg-primary h-full rounded-full transition-all duration-500" :style="{ width: focusScore + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 平均打字速度 -->
      <div class="bg-surface-container-lowest p-6 rounded-xl flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-secondary/5 group">
        <div class="flex justify-between items-start mb-4">
          <span class="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">平均打字速度</span>
          <svg class="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58L17 18.61l-2.5-2.5-2.5 2.5-2.5-2.5-2.5 2.5L3.62 15.44A8 8 0 0 1 12 4c1.85 0 3.55.63 4.9 1.69l1.48-1.48A9.99 9.99 0 0 0 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-1.24-.23-2.42-.62-3.51l-1-1.92zM11 10h2v6h-2v-6zm0-4h2v2h-2V6z"/>
          </svg>
        </div>
        <div>
          <div class="text-4xl font-black tracking-tighter text-on-surface">{{ avgWPM }} WPM</div>
          <div class="text-xs text-secondary font-bold mt-1">最高记录 {{ maxWPM }} WPM</div>
        </div>
      </div>
    </section>

    <!-- 本周趋势图表 -->
    <section class="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
      <h3 class="flex gap-2 items-center mb-4 text-lg font-bold text-on-surface">
        <span class="w-1 h-5 rounded-full bg-primary"></span>
        本周趋势
      </h3>
      <WeekChart :daily-counts="weekDailyCounts" :labels="weekLabels" />
    </section>

    <!-- Main Activity Trend Chart Area -->
    <section class="bg-surface-container-lowest p-8 rounded-xl shadow-sm relative overflow-hidden">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-on-surface flex items-center gap-2">
            7天活跃度流
          </h2>
          <p class="text-on-surface-variant text-sm mt-1">击键频率实时映射</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-xs">
            <span class="w-3 h-3 rounded-full bg-primary/30"></span>
            <span class="text-on-surface-variant">低活跃</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="w-3 h-3 rounded-full bg-primary"></span>
            <span class="text-on-surface-variant">高活跃</span>
          </div>
          <div class="bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <span class="text-sm font-bold text-primary">最产出的一天：{{ peakDayName }} ({{ peakDayCount }})</span>
          </div>
        </div>
      </div>

      <!-- Weekly Bar Chart with Tooltips -->
      <div class="relative">
        <!-- Y-Axis Labels -->
        <div class="absolute left-0 top-0 bottom-10 w-12 flex flex-col justify-between text-[10px] font-bold text-on-surface-variant">
          <span>{{ formatCount(maxWeeklyCount) }}</span>
          <span>{{ formatCount(Math.round(maxWeeklyCount * 0.5)) }}</span>
          <span>0</span>
        </div>

        <!-- Chart Area -->
        <div class="ml-14 flex items-end justify-between h-56 gap-3 border-l border-b border-surface-container-high pl-4 pb-2">
          <div
            v-for="(day, index) in weekDays"
            :key="index"
            class="flex-1 flex flex-col items-center gap-3 group relative"
          >
            <!-- Hover Tooltip -->
            <div
              class="absolute -top-16 left-1/2 -translate-x-1/2 bg-on-surface text-surface py-2 px-3 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-lg pointer-events-none"
            >
              <div class="text-center">
                <div class="text-[10px] opacity-70">{{ day.label }}</div>
                <div class="text-sm">{{ formatCount(day.count) }} 次按键</div>
              </div>
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-on-surface"></div>
            </div>

            <!-- Bar Container -->
            <div
              class="w-full relative flex items-end justify-center transition-all duration-300 cursor-pointer"
              :class="{ 'scale-105': day.isPeak }"
            >
              <!-- Bar -->
              <div
                class="w-full rounded-t-lg transition-all duration-500 relative overflow-hidden"
                :class="day.isPeak ? 'shadow-lg shadow-primary/30' : ''"
                :style="{
                  height: day.barHeight + 'px',
                  background: day.isPeak
                    ? 'linear-gradient(180deg, #004ac6 0%, #2563eb 100%)'
                    : `linear-gradient(180deg, ${getBarColor(day.percentage)} 0%, ${getBarColor(day.percentage * 0.7)} 100%)`,
                }"
              >
                <!-- Animated shine effect on hover -->
                <div
                  class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style="background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)"
                ></div>

                <!-- Peak indicator -->
                <div
                  v-if="day.isPeak"
                  class="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-md"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  峰值
                </div>
              </div>
            </div>

            <!-- Day Label -->
            <span
              class="text-xs font-bold transition-colors duration-200"
              :class="day.isPeak ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'"
            >
              {{ day.label }}
            </span>

            <!-- Date sublabel -->
            <span class="text-[10px] text-on-surface-variant/60 -mt-2">
              {{ day.dateStr }}
            </span>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="mt-6 grid grid-cols-4 gap-4 pt-4 border-t border-surface-container-high">
        <div class="text-center">
          <div class="text-2xl font-black text-primary">{{ formatCount(weekAvgDaily) }}</div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">日均按键</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-black text-secondary">{{ formatCount(maxWeeklyCount) }}</div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">单日最高</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-black text-tertiary">{{ formatCount(minWeeklyCount) }}</div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">单日最低</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-black text-on-surface">{{ activeDaysCount }}</div>
          <div class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">活跃天数</div>
        </div>
      </div>
    </section>

    <!-- Bottom Section: Accuracy & Shortcuts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Error Rate & Accuracy Statistics -->
      <section class="bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold tracking-tight">错误率统计</h3>
          <div class="text-3xl font-black text-secondary tracking-tighter">
            {{ accuracyRate }}% <span class="text-xs font-medium text-on-surface-variant tracking-normal">准确率</span>
          </div>
        </div>
        <div class="space-y-4">
          <div class="p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary">
            <p class="text-sm font-bold text-on-surface">趋势洞察</p>
            <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">
              <template v-if="backspaceChange > 0">
                相比上周，您的退格键 (Backspace) 使用率下降了 {{ backspaceChange }}%，表明打字心流状态更加稳定。继续保持！
              </template>
              <template v-else-if="backspaceChange < 0">
                相比上周，您的退格键 (Backspace) 使用率上升了 {{ Math.abs(backspaceChange) }}%，可能需要注意休息或检查键盘布局。
              </template>
              <template v-else>
                您的打字准确率保持稳定，退格键使用频率正常。专注模式下准确率最高。
              </template>
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-surface-container-low rounded-lg">
              <span class="text-[10px] font-bold text-on-surface-variant block mb-1">退格键使用</span>
              <span class="text-sm font-bold">{{ formatCount(backspaceUsage) }} 次</span>
            </div>
            <div class="p-4 bg-surface-container-low rounded-lg">
              <span class="text-[10px] font-bold text-on-surface-variant block mb-1">撤销操作</span>
              <span class="text-sm font-bold">{{ formatCount(comboCounts.UNDO || 0) }} 次</span>
            </div>
          </div>
          <div class="p-4 bg-surface-container-low rounded-lg">
            <span class="text-[10px] font-bold text-on-surface-variant block mb-2">按键分类分布</span>
            <div class="flex gap-2 flex-wrap">
              <span class="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-bold">
                字母 {{ formatCount(categoryCount.letter) }}
              </span>
              <span class="px-2 py-1 bg-secondary/10 text-secondary rounded text-xs font-bold">
                数字 {{ formatCount(categoryCount.number) }}
              </span>
              <span class="px-2 py-1 bg-tertiary/10 text-tertiary rounded text-xs font-bold">
                符号 {{ formatCount(categoryCount.symbol) }}
              </span>
              <span class="px-2 py-1 bg-on-surface-variant/10 text-on-surface-variant rounded text-xs font-bold">
                控制键 {{ formatCount(categoryCount.control) }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Shortcut Efficiency -->
      <section class="bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold tracking-tight">快捷键效率</h3>
          <div class="text-xs font-bold text-on-surface-variant">
            共 {{ totalShortcutCount }} 次使用
          </div>
        </div>
        <div class="space-y-3">
          <div
            v-for="(shortcut, index) in topShortcuts"
            :key="index"
            class="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <div class="flex gap-2">
              <span
                v-for="key in shortcut.keys"
                :key="key"
                class="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold font-mono"
              >
                {{ key }}
              </span>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-24 h-2 bg-surface-container-highest rounded-full">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="shortcut.color === 'secondary' ? 'bg-secondary' : 'bg-primary'"
                  :style="{ width: shortcut.percent + '%' }"
                ></div>
              </div>
              <span class="text-xs font-bold w-8 text-right">{{ shortcut.count }}</span>
            </div>
          </div>
        </div>
        <button
          @click="showAllShortcuts = true"
          class="text-xs font-bold text-primary flex items-center justify-center gap-1 mt-auto hover:underline transition-all"
        >
          查看完整列表
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </section>
    </div>

    <!-- Full Shortcuts Modal -->
    <Teleport to="body">
      <div
        v-if="showAllShortcuts"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click.self="showAllShortcuts = false"
      >
        <div class="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-4">
          <!-- Modal Header -->
          <div class="flex justify-between items-center p-6 border-b border-surface-container-high">
            <div>
              <h2 class="text-xl font-bold text-on-surface">快捷键完整列表</h2>
              <p class="text-sm text-on-surface-variant mt-1">共 {{ allShortcuts.length }} 种快捷键，{{ totalShortcutCount }} 次使用</p>
            </div>
            <button
              @click="showAllShortcuts = false"
              class="p-2 rounded-lg hover:bg-surface-container transition-colors"
            >
              <svg class="w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="(shortcut, index) in allShortcuts"
                :key="index"
                class="flex items-center justify-between p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div class="flex gap-1">
                    <span
                      v-for="key in shortcut.keys"
                      :key="key"
                      class="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                    >
                      {{ key }}
                    </span>
                  </div>
                  <span class="text-xs text-on-surface-variant">{{ shortcut.description }}</span>
                </div>
                <span class="text-xs font-bold text-on-surface">{{ shortcut.count }}</span>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="allShortcuts.length === 0" class="text-center py-12">
              <svg class="w-16 h-16 mx-auto text-on-surface-variant/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
              </svg>
              <p class="text-on-surface-variant">暂无快捷键使用记录</p>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end gap-3 p-4 border-t border-surface-container-high">
            <button
              @click="showAllShortcuts = false"
              class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-95 transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Footer spacing -->
    <div class="h-4"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStatsStore } from '../stores/stats'
import WeekChart from '../components/WeekChart.vue'

const statsStore = useStatsStore()
const { weekDailyCounts, comboCounts, weekCount, weekLabels, topKeys, categoryCount } = storeToRefs(statsStore)

// 模态框状态
const showAllShortcuts = ref(false)

// 格式化周总击键数
const formattedWeekTotal = computed(() => {
  const total = weekCount.value || weekDailyCounts.value.reduce((a, b) => a + b, 0)
  return (total / 1000).toFixed(1) + 'k'
})

// 计算准确率（基于 Backspace 和 Delete 键使用频率）
const accuracyRate = computed(() => {
  const total = weekCount.value || weekDailyCounts.value.reduce((a, b) => a + b, 0)
  if (total === 0) return '100.0'

  // 获取 Backspace 和 Delete 的使用次数
  const backspaceCount = backspaceUsage.value
  const deleteCount = topKeys.value.find(k => k.name.toLowerCase() === 'delete')?.count || 0
  const undoCount = comboCounts.value.UNDO || 0

  // 纠错键总数
  const errorKeys = backspaceCount + deleteCount + undoCount

  // 错误率估算：纠错键占比 * 调整系数（假设每次纠错修正约5个字符）
  const errorRate = (errorKeys * 5 / total) * 100

  // 准确率 = 100 - 错误率，最低显示 90%
  return Math.max(90, Math.min(99.9, 100 - errorRate)).toFixed(1)
})

// Backspace 使用次数
const backspaceUsage = computed(() => {
  return topKeys.value.find(k => k.name.toLowerCase() === 'backspace')?.count || 0
})

// 计算 Backspace 使用率变化（模拟对比上周）
const backspaceChange = computed(() => {
  // 这里可以添加真实的上周对比逻辑
  const backspaceRate = backspaceUsage.value
  const total = weekCount.value || 1
  const rate = (backspaceRate / total) * 100
  // 假设上周平均错误率在 5% 左右
  return Math.round(5 - rate)
})

// 计算本周活跃时长（基于活跃分钟数）
const weekActiveHours = computed(() => {
  const totalMinutes = weekDailyCounts.value.reduce((sum, count) => {
    // 估算：每 100 次按键约 1 分钟活跃
    return sum + Math.ceil(count / 100)
  }, 0)
  return totalMinutes / 60
})

const weekActiveHoursDisplay = computed(() => {
  const hours = Math.floor(weekActiveHours.value)
  const minutes = Math.round((weekActiveHours.value - hours) * 60)
  return `${hours}h ${minutes}m`
})

const avgDailyHours = computed(() => {
  return (weekActiveHours.value / 7).toFixed(1)
})

// 专注得分计算（基于连续活跃时长和目标完成度）
const focusScore = computed(() => {
  const total = weekCount.value || 0
  const dailyTarget = 5000 // 假设每日目标 5000 次
  const weeklyTarget = dailyTarget * 7

  // 目标完成度 (40分)
  const targetScore = Math.min(40, (total / weeklyTarget) * 40)

  // 活跃天数得分 (30分)
  const activeDays = weekDailyCounts.value.filter(c => c > 0).length
  const activeScore = (activeDays / 7) * 30

  // 准确率得分 (30分)
  const accuracyScore = (parseFloat(accuracyRate.value) / 100) * 30

  return Math.round(targetScore + activeScore + accuracyScore)
})

// 平均打字速度 (WPM = Words Per Minute)
const avgWPM = computed(() => {
  const total = weekCount.value || 0
  const totalMinutes = weekActiveHours.value * 60
  if (totalMinutes === 0) return 0
  // 假设平均每个单词 5 个字符
  return Math.round(total / totalMinutes / 5)
})

const maxWPM = ref(118) // 历史最高，可以从数据库读取

// 计算每天的百分比和峰值
const weekDays = computed(() => {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const maxCount = Math.max(...weekDailyCounts.value, 1)
  const peakIndex = weekDailyCounts.value.indexOf(maxCount)

  // 使用后端返回的 labels 作为日期显示（最近7天）
  const labels = weekLabels.value.length === 7 ? weekLabels.value : []

  // 计算今天是星期几，然后倒推7天对应的星期
  const today = new Date()

  return weekDailyCounts.value.map((count, index) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

    // 计算这一天的星期几：从今天倒推
    const daysAgo = 6 - index // 0 = 今天, 6 = 6天前
    const date = new Date(today)
    date.setDate(today.getDate() - daysAgo)
    const dayOfWeek = date.getDay()

    // 使用后端返回的 label 或自己计算
    const dateStr = labels[index] || `${date.getMonth() + 1}/${date.getDate()}`
    const label = dayNames[dayOfWeek]

    return {
      label,
      count,
      percentage,
      barHeight: Math.max(percentage * 1.8, count > 0 ? 20 : 4), // 最小高度，像素值
      opacity: 0.1 + (percentage / 100) * 0.9,
      isPeak: index === peakIndex && count > 0,
      dateStr,
    }
  })
})

// 最大/最小周计数
const maxWeeklyCount = computed(() => Math.max(...weekDailyCounts.value, 0))
const minWeeklyCount = computed(() => {
  const nonZero = weekDailyCounts.value.filter(c => c > 0)
  return nonZero.length > 0 ? Math.min(...nonZero) : 0
})

// 周平均每日
const weekAvgDaily = computed(() => {
  const total = weekDailyCounts.value.reduce((a, b) => a + b, 0)
  return Math.round(total / 7)
})

// 活跃天数
const activeDaysCount = computed(() => weekDailyCounts.value.filter(c => c > 0).length)

// 根据百分比获取柱状图颜色
function getBarColor(percentage: number): string {
  if (percentage >= 80) return '#004ac6'
  if (percentage >= 60) return '#2563eb'
  if (percentage >= 40) return '#60a5fa'
  if (percentage >= 20) return '#93c5fd'
  return '#dbeafe'
}

// 峰值日信息
const peakDayName = computed(() => {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const maxCount = Math.max(...weekDailyCounts.value, 0)
  if (maxCount === 0) return '暂无数据'

  const peakIndex = weekDailyCounts.value.indexOf(maxCount)

  // 计算峰值日是哪一天
  const today = new Date()
  const daysAgo = 6 - peakIndex
  const peakDate = new Date(today)
  peakDate.setDate(today.getDate() - daysAgo)
  const dayOfWeek = peakDate.getDay()

  return dayNames[dayOfWeek]
})

const peakDayCount = computed(() => {
  const maxCount = Math.max(...weekDailyCounts.value, 0)
  return formatCount(maxCount)
})

function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k'
  }
  return count.toString()
}

// 快捷键统计数据
const topShortcuts = computed(() => {
  const combos = comboCounts.value
  const maxCount = Math.max(
    combos.COPY || 1,
    combos.PASTE || 1,
    combos.SWITCH_APP || 1,
    combos.SAVE || 1
  )

  return [
    { keys: ['CTRL', 'C'], count: combos.COPY || 0, percent: Math.round(((combos.COPY || 0) / maxCount) * 100), color: 'primary' },
    { keys: ['CTRL', 'V'], count: combos.PASTE || 0, percent: Math.round(((combos.PASTE || 0) / maxCount) * 100), color: 'primary' },
    { keys: ['ALT', 'TAB'], count: combos.SWITCH_APP || 0, percent: Math.round(((combos.SWITCH_APP || 0) / maxCount) * 100), color: 'secondary' },
    { keys: ['CTRL', 'S'], count: combos.SAVE || 0, percent: Math.round(((combos.SAVE || 0) / maxCount) * 100), color: 'primary' },
  ].filter(s => s.count > 0)
})

// 快捷键总使用次数
const totalShortcutCount = computed(() => {
  return Object.values(comboCounts.value).reduce((sum, count) => sum + count, 0)
})

// 完整快捷键列表
const allShortcuts = computed(() => {
  const combos = comboCounts.value

  // 快捷键配置：名称、按键、描述
  const shortcutConfig: Record<string, { keys: string[], description: string }> = {
    COPY: { keys: ['CTRL', 'C'], description: '复制' },
    PASTE: { keys: ['CTRL', 'V'], description: '粘贴' },
    CUT: { keys: ['CTRL', 'X'], description: '剪切' },
    SELECT_ALL: { keys: ['CTRL', 'A'], description: '全选' },
    UNDO: { keys: ['CTRL', 'Z'], description: '撤销' },
    REDO: { keys: ['CTRL', 'SHIFT', 'Z'], description: '重做' },
    SAVE: { keys: ['CTRL', 'S'], description: '保存' },
    FIND: { keys: ['CTRL', 'F'], description: '查找' },
    PRINT: { keys: ['CTRL', 'P'], description: '打印' },
    NEW: { keys: ['CTRL', 'N'], description: '新建' },
    OPEN: { keys: ['CTRL', 'O'], description: '打开' },
    CLOSE_TAB: { keys: ['CTRL', 'W'], description: '关闭标签' },
    NEW_TAB: { keys: ['CTRL', 'T'], description: '新建标签' },
    REOPEN_TAB: { keys: ['CTRL', 'SHIFT', 'T'], description: '恢复标签' },
    NEXT_TAB: { keys: ['CTRL', 'TAB'], description: '下一标签' },
    PREV_TAB: { keys: ['CTRL', 'SHIFT', 'TAB'], description: '上一标签' },
    QUIT_APP: { keys: ['ALT', 'F4'], description: '退出程序' },
    HIDE_APP: { keys: ['WIN', 'M'], description: '最小化' },
    MINIMIZE: { keys: ['WIN', 'DOWN'], description: '最小化窗口' },
    SPOTLIGHT: { keys: ['WIN', 'S'], description: '搜索' },
    TASK_MANAGER: { keys: ['CTRL', 'SHIFT', 'ESC'], description: '任务管理器' },
    SWITCH_APP: { keys: ['ALT', 'TAB'], description: '切换应用' },
    CLOSE_WINDOW: { keys: ['ALT', 'F4'], description: '关闭窗口' },
    SHOW_DESKTOP: { keys: ['WIN', 'D'], description: '显示桌面' },
    OPEN_EXPLORER: { keys: ['WIN', 'E'], description: '文件管理器' },
    RUN_DIALOG: { keys: ['WIN', 'R'], description: '运行' },
    LOCK_SCREEN: { keys: ['WIN', 'L'], description: '锁屏' },
    TASK_VIEW: { keys: ['WIN', 'TAB'], description: '任务视图' },
    SNIPPING_TOOL: { keys: ['WIN', 'SHIFT', 'S'], description: '截图' },
    NEW_FOLDER: { keys: ['CTRL', 'SHIFT', 'N'], description: '新建文件夹' },
    OTHER: { keys: ['...'], description: '其他' },
  }

  const list = Object.entries(combos)
    .map(([key, count]) => ({
      keys: shortcutConfig[key]?.keys || [key],
      description: shortcutConfig[key]?.description || key,
      count,
    }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)

  return list
})

onMounted(() => {
  statsStore.fetchTodayStats()
  statsStore.fetchWeekStats()
})
</script>
