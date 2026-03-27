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
