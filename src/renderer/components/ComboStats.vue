<template>
  <div class="combo-stats">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-on-surface flex items-center gap-2">
        <span class="w-1 h-5 bg-primary-container rounded-full"></span>
        组合键统计
      </h3>
      <button
        @click="showAll = !showAll"
        class="text-sm text-primary hover:text-primary-container transition-colors font-medium"
      >
        {{ showAll ? '收起' : '查看全部' }}
      </button>
    </div>

    <!-- 常用组合键 -->
    <div class="grid grid-cols-4 gap-2 mb-4">
      <div
        v-for="combo in displayedCombos"
        :key="combo.key"
        class="flex flex-col items-center p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
      >
        <span class="text-xs font-mono text-on-surface-variant mb-1">{{ combo.label }}</span>
        <span class="text-lg font-bold text-primary">{{ combo.count }}</span>
      </div>
    </div>

    <!-- 展开的全部组合键 -->
    <div v-if="showAll && allCombos.length > 0" class="grid grid-cols-4 gap-2">
      <div
        v-for="combo in allCombos"
        :key="combo.key"
        class="flex flex-col items-center p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
      >
        <span class="text-xs font-mono text-on-surface/70 mb-1">{{ combo.label }}</span>
        <span class="text-lg font-bold text-on-surface/70">{{ combo.count }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="displayedCombos.every(c => c.count === 0) && allCombos.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
      <svg class="w-10 h-10 text-on-surface-variant mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <p class="text-xs text-on-surface-variant">暂无组合键数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComboCounts } from '../stores/stats'

interface Props {
  comboCounts: ComboCounts
}

const props = defineProps<Props>()
const showAll = ref(false)

const priorityCombos = [
  { key: 'COPY', label: 'Ctrl+C' },
  { key: 'PASTE', label: 'Ctrl+V' },
  { key: 'UNDO', label: 'Ctrl+Z' },
  { key: 'SAVE', label: 'Ctrl+S' },
]

const displayedCombos = computed(() => {
  return priorityCombos.map(combo => ({
    ...combo,
    count: props.comboCounts[combo.key as keyof ComboCounts] || 0
  })).sort((a, b) => b.count - a.count)
})

const allCombos = computed(() => {
  const comboLabels: Record<string, string> = {
    CUT: 'Ctrl+X',
    SELECT_ALL: 'Ctrl+A',
    REDO: 'Ctrl+Shift+Z',
    FIND: 'Ctrl+F',
    PRINT: 'Ctrl+P',
    NEW: 'Ctrl+N',
    OPEN: 'Ctrl+O',
    CLOSE_TAB: 'Ctrl+W',
    NEW_TAB: 'Ctrl+T',
    REOPEN_TAB: 'Ctrl+Shift+T',
    NEXT_TAB: 'Ctrl+Tab',
    PREV_TAB: 'Ctrl+Shift+Tab',
    SWITCH_APP: 'Alt+Tab',
    CLOSE_WINDOW: 'Alt+F4',
    SHOW_DESKTOP: 'Win+D',
    OPEN_EXPLORER: 'Win+E',
    RUN_DIALOG: 'Win+R',
    LOCK_SCREEN: 'Win+L',
    TASK_VIEW: 'Win+Tab',
    SNIPPING_TOOL: 'Win+Shift+S',
    NEW_FOLDER: 'Ctrl+Shift+N',
    TASK_MANAGER: 'Ctrl+Shift+Esc',
  }

  return Object.entries(comboLabels)
    .filter(([key]) => !priorityCombos.some(p => p.key === key))
    .map(([key, label]) => ({
      key,
      label,
      count: props.comboCounts[key as keyof ComboCounts] || 0
    }))
    .filter(combo => combo.count > 0)
    .sort((a, b) => b.count - a.count)
})
</script>
