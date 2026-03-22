<template>
  <div
    class="pattern-indicator rounded-lg p-4 shadow-sm transition-all duration-300"
    :class="patternClass"
  >
    <div class="flex items-center gap-4">
      <div class="pattern-icon text-4xl">{{ patternIcon }}</div>
      <div class="flex-1">
        <div class="pattern-label text-sm font-medium opacity-80">{{ patternLabel }}</div>
        <div class="pattern-duration text-lg font-bold">{{ formatDuration(duration) }}</div>
      </div>
      <div class="pattern-app text-xs opacity-60 text-right truncate max-w-[150px]">
        {{ currentApp }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 行为模式类型
enum BehaviorPattern {
  WORK = 'work',
  SLACK = 'slack',
  GAMING = 'gaming',
  IDLE = 'idle'
}

interface Props {
  pattern: BehaviorPattern | string
  duration: number // 持续时间（毫秒）
  currentApp?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentApp: ''
})

// 模式样式配置
const patternConfig = {
  [BehaviorPattern.WORK]: {
    icon: '🟢',
    label: '工作模式',
    class: 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
  },
  [BehaviorPattern.SLACK]: {
    icon: '🟡',
    label: '摸鱼模式',
    class: 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
  },
  [BehaviorPattern.GAMING]: {
    icon: '🔴',
    label: '游戏模式',
    class: 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
  },
  [BehaviorPattern.IDLE]: {
    icon: '⚪',
    label: '空闲模式',
    class: 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
  }
}

const patternIcon = computed(() => {
  return patternConfig[props.pattern as BehaviorPattern]?.icon || '❓'
})

const patternLabel = computed(() => {
  return patternConfig[props.pattern as BehaviorPattern]?.label || '未知模式'
})

const patternClass = computed(() => {
  return patternConfig[props.pattern as BehaviorPattern]?.class || patternConfig[BehaviorPattern.IDLE].class
})

// 格式化持续时间
function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.floor(ms / 1000)}秒`
  } else if (ms < 3600000) {
    return `${Math.floor(ms / 60000)}分钟`
  } else {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`
  }
}
</script>
