<template>
  <!-- 页面内容 -->
  <div class="relative p-6 space-y-6">
    <!-- Headline Section -->
    <div class="flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold tracking-tight text-on-surface">
          今日概览
        </h2>
        <p class="mt-1 text-on-surface-variant">
          数据最后更新于 {{ lastUpdateTime }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all bg-surface-container-high text-on-primary-fixed-variant hover:brightness-95"
        >
          导出报告
        </button>
        <button
          class="px-4 py-2 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          分享今日成就
        </button>
      </div>
    </div>

    <!-- Core Metrics Bento Grid -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        title="总按键数"
        :value="formattedTodayCount"
        :change="'+12%'"
        icon="keyboard"
        color="primary"
      />
      <StatCard
        title="活跃时长"
        :value="activeHoursDisplay"
        icon="schedule"
        color="secondary"
      />
      <StatCard
        title="专注时段"
        :value="focusSessions + '次'"
        icon="bolt"
        color="tertiary"
      />
      <StatCard
        title="今日排名"
        :value="'第5名'"
        icon="military_tech"
        color="primary-container"
      />
    </div>

    <!-- Main Visualization Section -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- 24H Activity Chart -->
      <div
        class="p-6 rounded-xl shadow-sm lg:col-span-2 bg-surface-container-lowest"
      >
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3
              class="flex gap-2 items-center text-lg font-bold text-on-surface"
            >
              <span class="w-1 h-5 rounded-full bg-primary"></span>
              24小时活跃分布
            </h3>
            <p class="text-sm text-on-surface-variant">
              反映全天输入强度变化规律
            </p>
          </div>
          <div class="flex gap-4 text-[10px] font-bold">
            <div class="flex gap-1.5 items-center">
              <span class="w-2.5 h-2.5 rounded-full bg-primary/20"></span>
              <span class="text-on-surface/70">常规</span>
            </div>
            <div class="flex gap-1.5 items-center">
              <span class="w-2.5 h-2.5 rounded-full bg-primary"></span>
              <span class="text-on-surface/70">高峰</span>
            </div>
          </div>
        </div>
        <!-- Hourly Chart -->
        <div class="h-64">
          <HourlyChart :hourly-data="hourlyDistribution" />
        </div>
      </div>

      <!-- Top Keys -->
      <div
        class="flex flex-col p-6 rounded-xl shadow-sm bg-surface-container-lowest"
      >
        <div class="mb-4">
          <h3 class="flex gap-2 items-center text-lg font-bold text-on-surface">
            <span class="w-1 h-5 rounded-full bg-secondary"></span>
            高频按键 TOP 8
          </h3>
        </div>
        <TopKeysChart :top-keys="topKeys.slice(0, 8)" compact />
      </div>
    </div>

    <!-- Shortcuts & Insights -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Shortcut Stats -->
      <div
        class="overflow-hidden relative p-6 rounded-xl shadow-sm bg-surface-container-lowest"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="flex gap-2 items-center text-lg font-bold text-on-surface">
            <span class="w-1 h-5 rounded-full bg-tertiary"></span>
            常用快捷键统计
          </h3>
          <span
            class="text-xs font-medium cursor-pointer text-on-surface-variant/70 hover:text-primary"
            >查看全部历史</span
          >
        </div>
        
        <!-- 有数据时显示快捷键卡片 -->
        <div v-if="hasComboData" class="grid grid-cols-2 gap-4">
          <ShortcutCard
            shortcut="Ctrl+C"
            :count="comboCounts?.COPY || 0"
            :percent="getComboPercent(comboCounts?.COPY || 0)"
          />
          <ShortcutCard
            shortcut="Ctrl+V"
            :count="comboCounts?.PASTE || 0"
            :percent="getComboPercent(comboCounts?.PASTE || 0)"
          />
          <ShortcutCard
            shortcut="Alt+Tab"
            :count="comboCounts?.SWITCH_APP || 0"
            :percent="getComboPercent(comboCounts?.SWITCH_APP || 0)"
          />
          <ShortcutCard
            shortcut="Win+D"
            :count="comboCounts?.SHOW_DESKTOP || 0"
            :percent="getComboPercent(comboCounts?.SHOW_DESKTOP || 0)"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="flex flex-col items-center justify-center py-10 text-center">
          <svg class="w-12 h-12 text-on-surface-variant mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p class="text-sm font-medium text-on-surface-variant">暂无快捷键记录</p>
          <p class="text-xs text-on-surface-variant/60 mt-1">使用 Ctrl+C/V 等快捷键后会显示</p>
        </div>
      </div>

      <!-- Insights Card -->
      <div
        class="overflow-hidden relative p-6 text-white bg-gradient-to-br rounded-xl shadow-xl from-primary to-primary-container shadow-primary/20"
      >
        <!-- 标题行 -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold">深度洞察</h3>
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <span class="text-xs font-bold">{{ efficiencyScore }}分</span>
          </div>
        </div>

        <!-- 主要洞察文本 -->
        <p class="text-sm leading-relaxed text-white/80 mb-4">
          相比昨日，你的输入效率
          <span v-if="compareYesterday >= 0" class="font-bold text-white">提升了{{ compareYesterday }}%</span>
          <span v-else class="font-bold text-white">下降了{{ Math.abs(compareYesterday) }}%</span>
          。在 {{ peakHoursText }} 期间最为活跃。
        </p>

        <!-- 数据网格 -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="p-3 rounded-lg bg-white/10">
            <div class="text-xs text-white/60 mb-1">平均速度</div>
            <div class="text-lg font-bold">{{ avgKeysPerMinute }}</div>
            <div class="text-xs text-white/60">次/分钟</div>
          </div>
          <div class="p-3 rounded-lg bg-white/10">
            <div class="text-xs text-white/60 mb-1">最长连续</div>
            <div class="text-lg font-bold">{{ longestStreak.hours }}h</div>
            <div class="text-xs text-white/60">{{ longestStreak.startHour }}:00 起</div>
          </div>
          <div class="p-3 rounded-lg bg-white/10">
            <div class="text-xs text-white/60 mb-1">最高频键</div>
            <div class="text-lg font-bold">{{ topKey?.name || '-' }}</div>
            <div class="text-xs text-white/60">{{ topKey?.count?.toLocaleString() || 0 }}次</div>
          </div>
        </div>

        <!-- 本周对比 -->
        <div class="flex gap-4 items-center p-3 rounded-lg bg-white/10 mb-4">
          <div class="flex-1">
            <div class="text-xs text-white/60 mb-1">本周累计</div>
            <div class="text-xl font-bold">{{ weekTotalCount.toLocaleString() }}</div>
          </div>
          <div class="w-px h-8 bg-white/20"></div>
          <div class="flex-1">
            <div class="text-xs text-white/60 mb-1">日均</div>
            <div class="text-xl font-bold">{{ weekAvgCount.toLocaleString() }}</div>
          </div>
          <div class="w-px h-8 bg-white/20"></div>
          <div class="flex-1">
            <div class="text-xs text-white/60 mb-1">专注时段</div>
            <div class="text-xl font-bold">{{ focusSessions }}次</div>
          </div>
        </div>

        <!-- 目标进度 -->
        <div>
          <div class="flex justify-between text-xs font-semibold mb-1.5">
            <span>今日目标 ({{ dailyGoal.toLocaleString() }} 次)</span>
            <span>{{ goalProgress }}%</span>
          </div>
          <div class="overflow-hidden h-2.5 rounded-full bg-white/20">
            <div
              class="h-full bg-white rounded-full transition-all duration-500"
              :style="{ width: goalProgress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Decorative background element -->
        <div
          class="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-3xl bg-white/10"
        ></div>
      </div>
    </div>

    <!-- Category & Combo Section -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="p-6 rounded-xl shadow-sm bg-surface-container-lowest">
        <CategoryChart :category-count="categoryCount" />
      </div>
      <div class="p-6 rounded-xl shadow-sm bg-surface-container-lowest">
        <ComboStats :combo-counts="comboCounts" />
      </div>
    </div>

    <!-- Footer spacing -->
    <div class="h-4"></div>
  </div>

  <!-- Floating Tooltip -->
  <div
    class="flex fixed bottom-6 left-1/2 z-50 gap-2 items-center px-4 py-2 text-xs font-bold rounded-full shadow-2xl opacity-90 backdrop-blur-md -translate-x-1/2 pointer-events-none bg-on-surface text-surface"
  >
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
      />
    </svg>
    KeyboardTracker 正在实时监控中
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useStatsStore } from "../stores/stats";
import StatCard from "../components/StatCard.vue";
import HourlyChart from "../components/HourlyChart.vue";
import CategoryChart from "../components/CategoryChart.vue";
import TopKeysChart from "../components/TopKeysChart.vue";
import ComboStats from "../components/ComboStats.vue";
import ShortcutCard from "../components/ShortcutCard.vue";

const statsStore = useStatsStore();
const {
  todayCount,
  activeMinutes,
  peakHour,
  activeHours,
  focusSessions,
  formattedTodayCount,
  categoryCount,
  topKeys,
  comboCounts,
  weekDailyCounts,
  hourlyDistribution,
} = storeToRefs(statsStore);

// 检查是否有快捷键数据
const hasComboData = computed(() => {
  if (!comboCounts.value) return false
  return Object.values(comboCounts.value).some(count => count > 0)
})

const lastUpdateTime = ref("--:--:--");
let timeInterval: ReturnType<typeof setInterval> | null = null;

// 每日目标（可配置）
const dailyGoal = 10000;

// 活跃时长显示（与 WeekTrend 一致：基于按键次数估算，每100次=1分钟）
const activeHoursDisplay = computed(() => {
  // 估算逻辑：每 100 次按键约 1 分钟活跃
  const estimatedMinutes = Math.ceil((todayCount.value || 0) / 100)
  const hours = estimatedMinutes / 60
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return `${wholeHours}h ${minutes}m`
})

// 计算快捷键最大值用于百分比
const maxComboCount = computed(() => {
  if (!comboCounts.value) return 1
  const counts = [
    comboCounts.value.COPY || 0,
    comboCounts.value.PASTE || 0,
    comboCounts.value.SWITCH_APP || 0,
    comboCounts.value.SHOW_DESKTOP || 0,
  ]
  return Math.max(...counts, 1)
});

// 计算快捷键百分比
function getComboPercent(count: number): number {
  return Math.round((count / maxComboCount.value) * 100)
}

// 昨日按键数
const yesterdayCount = computed(() => {
  if (!weekDailyCounts.value || weekDailyCounts.value.length < 7) return 0
  return weekDailyCounts.value[6] || 0 // 倒数第二个是昨天
});

// 相比昨日变化百分比
const compareYesterday = computed(() => {
  if (yesterdayCount.value === 0) return 0
  const diff = todayCount.value - yesterdayCount.value
  return Math.round((diff / yesterdayCount.value) * 100)
});

// 峰值时段文本
const peakHoursText = computed(() => {
  const hour = peakHour.value
  if (hour === undefined || hour === null) return '暂无数据'
  return `${hour}:00 - ${hour + 1}:00`
});

// 目标完成度
const goalProgress = computed(() => {
  const progress = (todayCount.value / dailyGoal) * 100
  return Math.min(Math.round(progress), 100)
});

// 平均每分钟按键数（使用估算逻辑：每100次=1分钟活跃，所以恒定为100）
const avgKeysPerMinute = computed(() => {
  if (todayCount.value === 0) return 0
  // 基于估算逻辑：每100次按键=1分钟活跃
  // 平均速度 = todayCount / (todayCount / 100) = 100
  return Math.round(todayCount.value / (todayCount.value / 100))
});

// 本周平均每日按键数
const weekAvgCount = computed(() => {
  if (!weekDailyCounts.value || weekDailyCounts.value.length === 0) return 0
  const validDays = weekDailyCounts.value.filter(c => c > 0)
  if (validDays.length === 0) return 0
  return Math.round(validDays.reduce((a, b) => a + b, 0) / validDays.length)
});

// 本周总按键数
const weekTotalCount = computed(() => {
  if (!weekDailyCounts.value) return 0
  return weekDailyCounts.value.reduce((a, b) => a + b, 0)
});

// 最高频按键
const topKey = computed(() => {
  if (!topKeys.value || topKeys.value.length === 0) return null
  return topKeys.value[0]
});

// 效率评分 (0-100)
const efficiencyScore = computed(() => {
  let score = 0
  // 目标完成度贡献 40 分
  score += Math.min(goalProgress.value * 0.4, 40)
  // 活跃时长贡献 30 分 (假设 8 小时为满分)
  const hoursScore = Math.min((activeHours.value / 8) * 30, 30)
  score += hoursScore
  // 专注时段贡献 30 分 (假设 5 个时段为满分)
  const focusScore = Math.min((focusSessions.value / 5) * 30, 30)
  score += focusScore
  return Math.round(score)
});

// 连续最长活跃时段
const longestStreak = computed(() => {
  if (!hourlyDistribution.value) return { hours: 0, startHour: 0 }
  let maxStreak = 0
  let currentStreak = 0
  let streakStart = 0
  let maxStart = 0

  hourlyDistribution.value.forEach((count, index) => {
    if (count > 0) {
      if (currentStreak === 0) {
        streakStart = index
      }
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        maxStart = streakStart
      }
    } else {
      currentStreak = 0
    }
  })

  return { hours: maxStreak, startHour: maxStart }
});

// 更新最后更新时间
function updateLastUpdateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  lastUpdateTime.value = `${hours}:${minutes}:${seconds}`;
}

onMounted(() => {
  statsStore.fetchTodayStats();
  statsStore.fetchWeekStats();
  statsStore.fetchMonthStats();
  statsStore.startListening();
  updateLastUpdateTime();

  // 每秒更新时间
  timeInterval = setInterval(updateLastUpdateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
});
</script>
