<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-2xl">{{ icon }}</span>
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ title }}</h3>
    </div>
    <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  icon: string
}

defineProps<Props>()
</script>
