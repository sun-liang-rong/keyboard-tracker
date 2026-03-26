<template>
  <aside class="h-screen w-64 flex flex-col py-6 px-4 gap-8 bg-surface-container-low shadow-none shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-3 px-2">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-on-primary shadow-lg">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zM7 15H5v-2h2v2zm3 0H8v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm3 0h-2v-2h2v2zm0-5h-2v-2h2v2zm0-3h-2V8h2v2z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-black text-primary leading-none">KeyboardTracker</h1>
        <p class="text-[10px] font-medium tracking-widest text-on-surface-variant uppercase mt-1 opacity-70">数据分析专家</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col gap-1 font-body text-sm font-medium tracking-wide">
      <NavItem
        v-for="item in navItems"
        :key="item.path"
        :icon="item.icon"
        :label="item.label"
        :active="isActive(item.path)"
        @click="navigate(item.path)"
      />
    </nav>

    <!-- User Profile -->
    <div class="mt-auto p-4 bg-surface-container rounded-xl flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-surface-dim overflow-hidden flex items-center justify-center">
        <svg class="w-5 h-5 text-on-surface-variant" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
      <div class="flex-1 overflow-hidden">
        <p class="text-xs font-bold truncate text-on-surface">分析员 01</p>
        <p class="text-[10px] text-on-surface-variant">专业版已激活</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import NavItem from './NavItem.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  {
    path: '/',
    label: '今日概览',
    icon: 'today'
  },
  {
    path: '/trends',
    label: '周趋势',
    icon: 'trending'
  },
  {
    path: '/monthly',
    label: '月度报告',
    icon: 'assessment'
  },
  {
    path: '/settings',
    label: '设置',
    icon: 'settings'
  }
]

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}
</script>
