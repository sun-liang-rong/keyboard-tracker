<template>
  <div class="flex overflow-hidden w-full h-screen bg-background text-on-background">
    <!-- 左侧导航栏 -->
    <SideNavBar />

    <!-- 主内容区域 -->
    <main class="flex overflow-hidden relative flex-col flex-1">
      <!-- 顶部栏 -->
      <TopAppBar />

      <!-- 可滚动内容区 - 显示子路由内容 -->
      <div class="overflow-y-auto flex-1 scrollbar-hide">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import SideNavBar from '../components/SideNavBar.vue'
import TopAppBar from '../components/TopAppBar.vue'
</script>
