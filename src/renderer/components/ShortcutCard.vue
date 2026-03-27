<template>
  <div class="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 hover:bg-surface-container transition-colors">
    <div class="flex gap-1">
      <span
        v-for="(key, index) in shortcutKeys"
        :key="index"
        class="bg-surface-container-lowest px-2 py-1 rounded shadow-sm text-xs font-bold text-on-surface border border-surface-container-high"
      >
        {{ key }}
      </span>
    </div>
    <div class="flex items-baseline justify-between mt-2">
      <span class="text-2xl font-black text-on-surface">{{ formattedCount }}</span>
      <span class="text-xs font-medium text-on-surface/70">次使用</span>
    </div>
    <!-- 进度条 -->
    <div class="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mt-1">
      <div
        class="h-full bg-tertiary transition-all duration-500 rounded-full"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  shortcut: string
  count: number
  percent: number
}

const props = defineProps<Props>()

const shortcutKeys = computed(() => props.shortcut.split('+'))

const formattedCount = computed(() => {
  return props.count.toLocaleString()
})
</script>
