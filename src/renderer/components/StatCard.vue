<template>
  <div
    class="bg-surface-container-lowest p-5 rounded-xl shadow-sm group hover:shadow-md transition-all duration-200 flex flex-col justify-between h-28 border-l-4 cursor-pointer"
    :class="borderColorClass"
  >
    <div class="flex justify-between items-start">
      <span class="text-xs font-bold text-on-surface-variant tracking-wider uppercase">{{ title }}</span>
      <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="iconBgClass">
        <svg
          v-if="icon === 'keyboard'"
          class="w-5 h-5"
          :class="iconColorClass"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zM7 15H5v-2h2v2zm3 0H8v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm0-5h-2v-2h2v2zm0-3h-2V8h2v2z"/>
        </svg>
        <svg
          v-else-if="icon === 'schedule'"
          class="w-5 h-5"
          :class="iconColorClass"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
        </svg>
        <svg
          v-else-if="icon === 'bolt'"
          class="w-5 h-5"
          :class="iconColorClass"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
        </svg>
        <svg
          v-else-if="icon === 'military_tech'"
          class="w-5 h-5"
          :class="iconColorClass"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L2 7v2h20V7L12 2zm0 2.5L18.5 7h-13L12 4.5zM4 11v7h16v-7H4zm4 6H6v-5h2v5zm4 0h-2v-5h2v5zm4 0h-2v-5h2v5z"/>
          <path d="M12 6l-2.5 5h5z" fill="currentColor"/>
        </svg>
        <span v-else class="text-xl">{{ icon }}</span>
      </div>
    </div>
    <div class="flex items-baseline gap-2">
      <div class="text-2xl font-black text-on-surface tracking-tighter">{{ value }}</div>
      <span v-if="change" class="text-xs font-medium text-primary">{{ change }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: string | number
  icon: string
  color?: 'primary' | 'secondary' | 'tertiary' | 'primary-container'
  change?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  change: ''
})

const borderColorClass = computed(() => {
  const map: Record<string, string> = {
    'primary': 'border-primary',
    'secondary': 'border-secondary',
    'tertiary': 'border-tertiary',
    'primary-container': 'border-primary-container'
  }
  return map[props.color] || 'border-primary'
})

const iconBgClass = computed(() => {
  const map: Record<string, string> = {
    'primary': 'bg-primary/10',
    'secondary': 'bg-secondary/10',
    'tertiary': 'bg-tertiary/10',
    'primary-container': 'bg-primary-container/10'
  }
  return map[props.color] || 'bg-primary/10'
})

const iconColorClass = computed(() => {
  const map: Record<string, string> = {
    'primary': 'text-primary',
    'secondary': 'text-secondary',
    'tertiary': 'text-tertiary',
    'primary-container': 'text-primary-container'
  }
  return map[props.color] || 'text-primary'
})
</script>
