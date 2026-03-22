<template>
  <div class="combo-stats">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-gray-900 dark:text-white">组合键统计</h3>
      <button
        @click="showAll = !showAll"
        class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        {{ showAll ? '收起' : '查看全部' }}
      </button>
    </div>

    <!-- 常用组合键 -->
    <div class="grid grid-cols-4 gap-2 mb-4">
      <div
        v-for="combo in displayedCombos"
        :key="combo.key"
        class="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
      >
        <span class="text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">{{ combo.label }}</span>
        <span class="text-lg font-bold text-blue-600 dark:text-blue-400">{{ combo.count }}</span>
      </div>
    </div>

    <!-- 展开的全部组合键 -->
    <div v-if="showAll" class="grid grid-cols-4 gap-2">
      <div
        v-for="combo in allCombos"
        :key="combo.key"
        class="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
      >
        <span class="text-xs font-mono text-gray-600 dark:text-gray-400 mb-1">{{ combo.label }}</span>
        <span class="text-lg font-bold text-gray-500 dark:text-gray-400">{{ combo.count }}</span>
      </div>
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
