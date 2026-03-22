<template>
  <div class="title-display">
    <!-- 当前称号展示 -->
    <div v-if="currentTitle" class="mb-6">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-2">当前称号</div>
      <div
        class="flex items-center gap-3 p-4 rounded-xl"
        :style="{ backgroundColor: currentTitle.color + '20', border: `2px solid ${currentTitle.color}` }"
      >
        <span class="text-4xl">{{ currentTitle.icon }}</span>
        <div>
          <div
            class="text-xl font-bold"
            :style="{ color: currentTitle.color }"
          >
            {{ currentTitle.name }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ currentTitle.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- 未解锁称号提示 -->
    <div v-else class="mb-6 p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-center">
      <div class="text-3xl mb-2">🏆</div>
      <div class="text-gray-600 dark:text-gray-400">继续打字解锁称号！</div>
    </div>

    <!-- 已解锁称号列表 -->
    <div v-if="unlockedTitles.length > 0">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        已解锁称号 ({{ unlockedTitles.length }})
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="title in unlockedTitles"
          :key="title.id"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          :title="title.description"
        >
          <span>{{ title.icon }}</span>
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ title.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Title } from '../stores/stats'

interface Props {
  currentTitle: Title | null
  unlockedTitles: Title[]
}

defineProps<Props>()
</script>
