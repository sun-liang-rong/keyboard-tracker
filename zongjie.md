# KeyboardTracker 项目分析与代码Review

## 一、项目概述

**KeyboardTracker** 是一款跨平台桌面应用，用于记录和统计键盘使用情况，帮助用户量化工作专注度和效率。

---

## 二、技术栈总览

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | Electron | v29.4.6 | 跨平台桌面应用框架 |
| **前端框架** | Vue 3 | v3.4.21 | 组合式 API (Composition API) |
| **构建工具** | Vite | v5.2.6 | 快速开发服务器 + 构建工具 |
| **语言** | TypeScript | v5.4.3 | 类型安全 |
| **样式** | Tailwind CSS | v3.4.1 | 原子化 CSS |
| **状态管理** | Pinia | v2.1.7 | Vue 3 官方状态管理 |
| **路由** | Vue Router | v4.3.0 | SPA 路由 |
| **图表** | ECharts | v6.0.0 | 数据可视化 |
| **数据库** | lowdb | v7.0.1 | JSON 本地存储 |
| **键盘监听** | node-global-key-listener | v0.3.0 | Windows 全局键盘监听 |
| **打包** | electron-builder | v24.13.3 | 多平台打包 |

---

## 三、项目架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron 主进程                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   index.ts   │  │  tracker.ts  │  │    database.ts       │  │
│  │  窗口管理     │  │  键盘监听核心 │  │  数据持久化 (lowdb)   │  │
│  │  IPC通信     │  │  性能优化     │  │  日期索引            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                           ↑↓ IPC                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    preload.ts                             │   │
│  │            contextBridge 暴露安全API                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      渲染进程 (Vue 3)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   App.vue    │  │   stores/    │  │    components/       │  │
│  │   根组件      │  │  stats.ts    │  │  ECharts 图表组件    │  │
│  │   主题管理    │  │  settings.ts │  │  StatCard 等UI组件   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    views/                                 │   │
│  │         Dashboard.vue (主界面)   Settings.vue (设置)      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 四、核心数据流

```
用户按键
    ↓
┌───────────────────────────────────────┐
│  Windows: node-global-key-listener    │
│  macOS: 原生二进制 (keytracker-mac)    │
└───────────────────────────────────────┘
    ↓ KEYDOWN 事件
┌───────────────────────────────────────┐
│  tracker.ts                           │
│  - 节流控制 (100ms)                    │
│  - 按键分类 (letter/number/...)       │
│  - 组合键检测                          │
│  - 称号计算                            │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│  内存状态 (todayCount, hourlyCounts)  │
└───────────────────────────────────────┘
    ↓ 异步保存 (每50次按键 或 30秒)
┌───────────────────────────────────────┐
│  database.ts → lowdb (JSON文件)       │
│  位置: userData/keyboard-tracker-db.json │
└───────────────────────────────────────┘
    ↓ IPC: keystroke-update
┌───────────────────────────────────────┐
│  Vue 渲染进程 (Pinia Store)           │
│  - 实时更新 UI                         │
│  - ECharts 图表渲染                    │
└───────────────────────────────────────┘
```

---

## 五、代码Review

### ✅ 优点

#### 1. **架构设计清晰**
- 主进程/渲染进程职责分明
- IPC 通信规范，使用 `contextBridge` 保证安全
- 状态管理使用 Pinia，符合 Vue 3 最佳实践

#### 2. **性能优化到位**
```typescript
// tracker.ts - 节流控制配置
const PERF_CONFIG = {
  KEY_THROTTLE_MS: 100,        // 按键节流
  UI_UPDATE_INTERVAL: 200,     // UI更新节流
  SAVE_MIN_INTERVAL: 30000,    // 数据保存节流
  MEMORY_LIMIT_MB: 50,         // 内存限制
}
```
- 100ms 节流避免高频事件风暴
- 内存监控与自动清理
- 批量写入减少 I/O

#### 3. **跨平台兼容性好**
- Windows 使用 `node-global-key-listener`
- macOS 使用原生二进制
- 图标、路径、权限处理都有平台判断

#### 4. **数据完整性保障**
```typescript
// 锁屏/休眠时自动保存
powerMonitor.on('suspend', () => {
  flushData()
})
// 退出前保存
app.on('before-quit', () => {
  flushData()
})
```

#### 5. **TypeScript 类型完善**
- 定义了完整的接口 (`DailyStat`, `ComboCounts`, `Title` 等)
- 类型复用性好

---

### ⚠️ 问题与改进建议

#### 1. **类型定义重复** (中等)
**位置**: `src/main/database.ts` 和 `src/renderer/stores/stats.ts`

两个文件定义了相同的类型：
- `KeyCategoryCount`
- `TopKeyItem`
- `ComboCounts`

**建议**: 提取到共享类型文件 `src/shared/types.ts`，避免维护不一致。

---

#### 2. **`getLocalDateString()` 函数重复定义** (中等)
**位置**: 
- `src/main/index.ts:88-94`
- `src/main/tracker.ts:370-376`
- `src/renderer/stores/stats.ts:116-122`
- `src/renderer/views/Dashboard.vue:239-245`

**建议**: 提取到工具模块 `src/shared/utils.ts`。

---

#### 3. **内存状态与数据库同步复杂** (高)
**问题**: `tracker.ts` 中有多处数据同步逻辑：
- `initTodayCount()` - 初始化
- `saveKeystrokeData()` - 保存
- `flushData()` - 强制保存
- `checkAndHandleDateChange()` - 跨天处理

这些函数有部分重叠逻辑，增加了维护难度。

**建议**: 
- 引入一个 `DataManager` 类统一管理内存状态与数据库同步
- 使用单一数据源原则

---

#### 4. **错误处理可以增强** (中等)
**位置**: `src/renderer/stores/stats.ts`

```typescript
// 当前代码
} catch (error) {
  console.error('[Renderer] Failed to fetch today stats:', error)
}
```

**建议**: 
- 添加用户友好的错误提示
- 考虑重试机制
- 使用 Sentry 等工具收集错误日志

---

#### 5. **硬编码的称号数据** (低)
**位置**: `src/main/tracker.ts:114-294`

称号定义硬编码在代码中，约 180 行。

**建议**: 
- 可以考虑移到配置文件或数据库
- 支持用户自定义称号

---

#### 6. **缺少单元测试** (高)
项目没有测试文件。

**建议**:
- 添加 Jest/Vitest 配置
- 为核心逻辑添加单元测试：
  - 按键分类逻辑
  - 组合键检测
  - 日期处理
  - 数据库操作

---

#### 7. **日志过多** (低)
**位置**: 整个 `tracker.ts`

```typescript
console.log('[Tracker] Key pressed:', keyName, 'vKey:', keyCode, 'Raw:', e.rawKey?._nameRaw)
```

每个按键都打印日志，在高频使用时会影响性能。

**建议**:
- 使用日志级别控制
- 生产环境禁用调试日志

---

#### 8. **悬浮窗安全性** (中等)
**位置**: `src/main/index.ts:569-580`

```typescript
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
}
```

悬浮窗禁用了上下文隔离，存在安全风险。

**建议**: 改用 preload + contextBridge 模式，保持与主窗口一致的安全策略。

---

#### 9. **潜在的时区问题** (低)
虽然使用了 `getLocalDateString()` 避免了 UTC 问题，但在 `formatLocalDate()` 和其他日期操作中应保持一致。

---

#### 10. **IPC Handler 重复注册风险** (低)
**位置**: `src/main/index.ts:109-117`

```typescript
ipcMain.removeHandler('get-today-stats')
// ... 然后重新注册
```

这是好的做法，但应该确保在热重载时不会重复创建窗口/托盘等资源。

---

## 六、项目亮点

1. **🎮 游戏化设计** - 称号系统增加趣味性
2. **📊 丰富的数据可视化** - ECharts 图表、热力图
3. **⚡ 性能优先** - 节流、内存管理、锁屏检测
4. **🔒 隐私保护** - 本地存储，不记录按键内容
5. **🎨 良好的 UI/UX** - 深色主题、悬浮窗、响应式设计

---

## 七、总结评分

| 维度 | 评分 | 说明 |
|------|------|------|
| **架构设计** | ⭐⭐⭐⭐ | 清晰的分层，良好的关注点分离 |
| **代码质量** | ⭐⭐⭐⭐ | TypeScript 类型完善，但有重复代码 |
| **性能优化** | ⭐⭐⭐⭐⭐ | 节流、内存管理、批量保存都做得很好 |
| **跨平台兼容** | ⭐⭐⭐⭐ | 支持两大平台，处理了差异 |
| **可维护性** | ⭐⭐⭐ | 缺少测试，部分逻辑可抽取 |
| **安全性** | ⭐⭐⭐ | 悬浮窗安全可改进 |
| **用户体验** | ⭐⭐⭐⭐⭐ | 主题切换、悬浮窗、图表丰富 |

**总体评价**: 这是一个完成度较高的 Electron 应用，架构合理，性能优化到位。主要改进方向是：**添加测试**、**消除重复代码**、**加强错误处理**。

---

## 八、文件结构

```
keyboard-tracker/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts            # 主入口，窗口管理，IPC
│   │   ├── preload.ts          # IPC 桥接，安全 API 暴露
│   │   ├── database.ts         # lowdb 数据库操作
│   │   ├── tracker.ts          # 键盘监听核心逻辑
│   │   └── floating-window.html # 悬浮窗 HTML
│   ├── renderer/               # Vue 3 前端
│   │   ├── main.ts             # 渲染进程入口
│   │   ├── App.vue             # 根组件
│   │   ├── router/index.ts     # Vue Router
│   │   ├── stores/             # Pinia 状态管理
│   │   │   ├── stats.ts        # 统计数据状态
│   │   │   └── settings.ts     # 设置状态
│   │   ├── views/              # 页面组件
│   │   │   ├── Dashboard.vue   # 主界面
│   │   │   └── Settings.vue    # 设置页
│   │   ├── components/         # 可复用组件
│   │   │   ├── StatCard.vue    # 统计卡片
│   │   │   ├── HourlyChart.vue # 时段分布图
│   │   │   ├── WeekChart.vue   # 周趋势图
│   │   │   ├── HeatmapChart.vue# 月热力图
│   │   │   ├── CategoryChart.vue # 分类统计图
│   │   │   ├── TopKeysChart.vue # 高频按键排行
│   │   │   ├── ComboStats.vue  # 组合键统计
│   │   │   └── TitleDisplay.vue # 称号展示
│   │   └── types/electron.d.ts # TypeScript 类型声明
│   └── bin/                    # Native 二进制文件
│       ├── keytracker-mac      # macOS 键盘监听器
│       └── keytracker-win.exe  # Windows 键盘监听器
├── native/                     # Native 工具源码
│   ├── macos/keylogger.mm      # macOS Quartz 实现
│   └── windows/keytracker.ahk  # Windows AutoHotkey
├── public/                     # 静态资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

*生成时间: 2026-03-25*