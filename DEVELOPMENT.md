# KeyboardTracker 开发文档

## 文档信息

| 属性 | 内容 |
|-----|------|
| **项目名称** | KeyboardTracker（键盘活跃度统计工具）|
| **版本** | v1.2 |
| **文档类型** | 开发文档（Development Guide）|
| **适用对象** | 开发者、维护人员 |
| **最后更新** | 2026-03-22 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [开发环境](#3-开发环境)
4. [项目结构](#4-项目结构)
5. [数据模型](#5-数据模型)
6. [API接口](#6-api接口)
7. [开发规范](#7-开发规范)
8. [测试策略](#8-测试策略)
9. [部署发布](#9-部署发布)
10. [故障排查](#10-故障排查)

---

## 1. 项目概述

### 1.1 产品定位

记录用户键盘使用情况，统计每日/每周/每月敲击次数和时间段分布，用数据量化专注度和工作效率。

### 1.2 核心功能

- **实时键盘监听**：后台静默监听全局键盘事件
- **数据统计分析**：日/周/月维度统计分析
- **可视化展示**：图表展示使用趋势和分布
- **性能优化**：低CPU占用（≤1%）、低内存占用（≤50MB）

### 1.3 技术栈

| 层级 | 技术方案 | 版本要求 |
|-----|---------|---------|
| **框架** | Electron | v29+ |
| **前端** | Vue 3 + Vite + TypeScript | Vue 3.3+, Vite 5+ |
| **样式** | Tailwind CSS | v3.4+ |
| **状态管理** | Pinia | v2.1+ |
| **图表** | ECharts | v5.4+ |
| **数据库** | lowdb | v7.0+ |
| **构建** | electron-builder | v24+ |

---

## 2. 技术架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      KeyboardTracker                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │   Main Process   │  │  Renderer Process │                    │
│  │   (Node.js)      │  │   (Vue 3 + Vite)  │                    │
│  │                  │  │                   │                    │
│  │  ┌────────────┐  │  │  ┌────────────┐   │                    │
│  │  │ Keyboard   │  │  │  │   Dashboard │   │                    │
│  │  │ Tracker    │──┼──┼──┤   Component  │   │                    │
│  │  │ (Native)   │  │  │  └────────────┘   │                    │
│  │  └────────────┘  │  │                   │                    │
│  │         │        │  │  ┌────────────┐   │                    │
│  │  ┌────────────┐  │  │  │   Settings │   │                    │
│  │  │  Database  │  │  │  │   Component  │   │                    │
│  │  │  (lowdb)   │──┼──┼──┤              │   │                    │
│  │  └────────────┘  │  │  └────────────┘   │                    │
│  │         │        │  │                   │                    │
│  │  ┌────────────┐  │  │  ┌────────────┐   │                    │
│  │  │   Tray     │  │  │  │  Floating  │   │                    │
│  │  │   Icon     │  │  │  │   Window   │   │                    │
│  │  └────────────┘  │  │  └────────────┘   │                    │
│  └──────────────────┘  └──────────────────┘                    │
│           │                      │                              │
│           └──────────┬───────────┘                              │
│                      │                                           │
│              ┌───────┴───────┐                                  │
│              │  IPC Channel  │                                  │
│              └───────────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
键盘事件 → Native Binary → Main Process → Database → IPC → Renderer
                ↑                              ↓
                └────────── 更新触发 ──────────┘
```

---

## 3. 开发环境

### 3.1 系统要求

- **macOS**: macOS 12+ (Monterey)
- **Windows**: Windows 10/11
- **Node.js**: v18+ (推荐 v20 LTS)
- **npm**: v9+

### 3.2 初始化项目

```bash
# 克隆项目
git clone <repository-url>
cd KeyboardTracker

# 安装依赖
npm install

# 复制 native 二进制文件
npm run setup:native

# 启动开发环境
npm run dev
```

### 3.3 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 构建并打包
npm run build:win    # Windows
npm run build:mac    # macOS

# 代码检查
npm run lint

# TypeScript 检查
npm run type-check
```

### 3.4 Native 二进制文件

#### macOS

```bash
cd native/macos
clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac
cp keytracker-mac ../../src/bin/
```

#### Windows

使用 AutoHotkey 编译器 (Ahk2Exe)：
```bash
Ahk2Exe.exe /in keytracker.ahk /out keytracker-win.exe
cp keytracker-win.exe ../../src/bin/
```

---

## 4. 项目结构

### 4.1 目录规范

```
KeyboardTracker/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts            # 主入口，窗口管理
│   │   ├── preload.ts          # 预加载脚本，IPC 桥接
│   │   ├── tracker.ts          # 键盘监听核心逻辑
│   │   └── database.ts         # 数据库操作
│   │
│   ├── renderer/               # Vue 3 前端
│   │   ├── main.ts             # 渲染进程入口
│   │   ├── App.vue             # 根组件
│   │   ├── style.css           # 全局样式
│   │   │
│   │   ├── components/         # 公共组件
│   │   │   ├── StatCard.vue
│   │   │   ├── HourlyChart.vue
│   │   │   ├── WeekChart.vue
│   │   │   ├── HeatmapChart.vue
│   │   │   ├── CategoryChart.vue
│   │   │   ├── TopKeysChart.vue
│   │   │   ├── ComboStats.vue
│   │   │   └── TitleDisplay.vue
│   │   │
│   │   ├── views/              # 页面组件
│   │   │   ├── Dashboard.vue
│   │   │   └── Settings.vue
│   │   │
│   │   ├── stores/             # Pinia 状态管理
│   │   │   ├── stats.ts
│   │   │   └── settings.ts
│   │   │
│   │   ├── router/             # Vue Router
│   │   │   └── index.ts
│   │   │
│   │   └── types/              # TypeScript 类型
│   │       └── electron.d.ts
│   │
│   ├── bin/                    # Native 二进制文件
│   │   ├── keytracker-mac      # macOS 可执行文件
│   │   └── keytracker-win.exe  # Windows 可执行文件
│   │
│   └── main/floating-window.html  # 悬浮窗页面
│
├── native/                     # Native 工具源码
│   ├── macos/
│   │   └── keylogger.mm
│   └── windows/
│       └── keytracker.ahk
│
├── public/                     # 静态资源
│   └── logo.png
│
├── electron-builder.json       # 打包配置
├── vite.config.ts             # Vite 配置
├── tailwind.config.js         # Tailwind 配置
└── tsconfig.json              # TypeScript 配置
```

---

## 5. 数据模型

### 5.1 数据库 Schema

存储路径：`~/Library/Application Support/keyboard-tracker/keyboard-tracker-db.json` (macOS)

```typescript
// DatabaseSchema
interface DatabaseSchema {
  keystrokes: KeystrokeData[]
  dailyStats: DailyStat[]
  settings: AppSettings
}
```

### 5.2 完整类型定义

```typescript
// ============================================
// 基础数据类型
// ============================================

/** 按键分类统计 */
interface KeyCategoryCount {
  letter: number      // 字母键 A-Z
  number: number      // 数字键 0-9
  function: number    // 功能键 F1-F12
  control: number     // 控制键 (Enter, Space, Tab等)
  symbol: number      // 符号键
  modifier: number    // 修饰键 (Shift, Ctrl, Alt, Cmd)
  other: number       // 其他按键
}

/** TOP Key 项目 */
interface TopKeyItem {
  name: string        // 按键名称，如 "a", "Enter", "F1"
  count: number
  category: string    // 所属分类
}

/** 组合键统计 */
interface ComboCounts {
  COPY: number
  PASTE: number
  CUT: number
  SELECT_ALL: number
  UNDO: number
  REDO: number
  SAVE: number
  FIND: number
  PRINT: number
  NEW: number
  OPEN: number
  CLOSE_TAB: number
  NEW_TAB: number
  REOPEN_TAB: number
  NEXT_TAB: number
  PREV_TAB: number
  QUIT_APP: number
  HIDE_APP: number
  MINIMIZE: number
  SPOTLIGHT: number
  TASK_MANAGER: number
  SWITCH_APP: number
  CLOSE_WINDOW: number
  SHOW_DESKTOP: number
  OPEN_EXPLORER: number
  RUN_DIALOG: number
  LOCK_SCREEN: number
  TASK_VIEW: number
  SNIPPING_TOOL: number
  NEW_FOLDER: number
  OTHER: number
}

/** 称号 */
interface Title {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

/** 称号（含解锁条件） */
interface TitleWithCondition extends Title {
  condition: () => boolean  // 解锁条件函数
}

// ============================================
// 统计数据类型
// ============================================

/** 实时按键数据（单条记录） */
interface KeystrokeData {
  id: number
  timestamp: number
  count: number
  hour: number
  date: string
}

/** 每日统计 */
interface DailyStat {
  date: string                    // 日期 YYYY-MM-DD
  totalCount: number              // 总按键数
  hourlyDistribution: number[]    // 24小时分布
  activeHours: number             // 活跃小时数
  focusSessions: number           // 专注时段数
  categoryCount: KeyCategoryCount // 按键分类统计
  topKeys: TopKeyItem[]           // 高频按键 TOP 20
  comboCounts: ComboCounts        // 组合键统计
}

/** 周统计数据（计算得出） */
interface WeekStat {
  totalCount: number
  dailyCounts: number[]
  labels: string[]
}

/** 月统计数据（计算得出） */
interface MonthStat {
  totalCount: number
  dailyData: DayData[]
  daysInMonth: number
}

/** 单日数据（用于热力图） */
interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekNumber: number
}

// ============================================
// 设置类型
// ============================================

/** 应用设置 */
interface AppSettings {
  autoStart: boolean              // 开机自启
  showFloatingWindow: boolean     // 显示悬浮窗
  dataRetentionDays: number       // 数据保留天数
  theme: 'light' | 'dark'         // 主题
}

// ============================================
// IPC 数据类型
// ============================================

/** 今日统计数据（IPC 返回） */
interface TodayStat {
  totalCount: number
  activeHours: number
  focusSessions: number
  hourlyDistribution: number[]
  categoryCount: KeyCategoryCount
  topKeys: TopKeyItem[]
  comboCounts: ComboCounts
  currentTitle: Title | null
  unlockedTitles: Title[]
}

/** 性能统计 */
interface PerformanceStats {
  memoryMB: number
  cpuPercent: number
  isPaused: boolean
  pendingEvents: number
  lastSaveTime: number
}
```

### 5.3 数据默认值

```typescript
// 默认分类统计
const DEFAULT_CATEGORY_COUNT: KeyCategoryCount = {
  letter: 0, number: 0, function: 0,
  control: 0, symbol: 0, modifier: 0, other: 0
}

// 默认组合键统计
const DEFAULT_COMBO_COUNTS: ComboCounts = {
  COPY: 0, PASTE: 0, CUT: 0, SELECT_ALL: 0, UNDO: 0, REDO: 0,
  SAVE: 0, FIND: 0, PRINT: 0, NEW: 0, OPEN: 0, CLOSE_TAB: 0,
  NEW_TAB: 0, REOPEN_TAB: 0, NEXT_TAB: 0, PREV_TAB: 0,
  QUIT_APP: 0, HIDE_APP: 0, MINIMIZE: 0, SPOTLIGHT: 0,
  TASK_MANAGER: 0, SWITCH_APP: 0, CLOSE_WINDOW: 0,
  SHOW_DESKTOP: 0, OPEN_EXPLORER: 0, RUN_DIALOG: 0,
  LOCK_SCREEN: 0, TASK_VIEW: 0, SNIPPING_TOOL: 0,
  NEW_FOLDER: 0, OTHER: 0
}

// 默认设置
const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  showFloatingWindow: true,
  dataRetentionDays: 90,
  theme: 'dark'
}
```

---

## 6. API接口

### 6.1 IPC 通信规范

#### Main → Renderer（事件推送）

| 通道名 | 数据类型 | 说明 |
|-------|---------|------|
| `keystroke-update` | `KeystrokeUpdateData` | 按键更新事件 |
| `update-count` | `number` | 悬浮窗计数更新 |

```typescript
interface KeystrokeUpdateData {
  count: number
  hourlyDistribution: number[]
  categoryCount: KeyCategoryCount
  topKeys: TopKeyItem[]
  comboCounts: ComboCounts
  currentTitle: Title | null
}
```

#### Renderer → Main（API调用）

| 通道名 | 请求参数 | 返回类型 | 说明 |
|-------|---------|---------|------|
| `get-today-stats` | - | `TodayStat` | 获取今日统计 |
| `get-stats-by-date` | `date: string` | `TodayStat` | 获取指定日期统计 |
| `get-week-stats` | - | `WeekStat` | 获取本周统计 |
| `get-month-stats` | - | `MonthStat` | 获取本月统计 |
| `get-settings` | - | `AppSettings` | 获取设置 |
| `save-settings` | `AppSettings` | `boolean` | 保存设置 |
| `minimize-window` | - | - | 最小化窗口 |
| `close-window` | - | - | 关闭窗口 |
| `toggle-floating-window` | `show: boolean` | `boolean` | 切换悬浮窗 |

### 6.2 数据库操作 API

```typescript
// database.ts

/** 初始化数据库 */
async function initDatabase(): Promise<Low<DatabaseSchema>>

/** 获取数据库实例 */
function getDatabase(): Low<DatabaseSchema>

/** 保存数据到文件 */
async function saveData(): Promise<void>

/** 根据日期查找统计 */
function findDailyStatByDate(date: string): DailyStat | undefined

/** 添加或更新统计数据 */
function upsertDailyStat(stat: DailyStat): void

/** 创建默认分类统计 */
function createDefaultCategoryCount(): KeyCategoryCount

/** 创建默认组合键统计 */
function createDefaultComboCounts(): ComboCounts

/** 创建默认每日统计 */
function createDefaultDailyStat(date: string): DailyStat
```

### 6.3 Tracker 核心 API

```typescript
// tracker.ts

/** 启动键盘监听 */
function startKeyboardTracker(mainWindow: BrowserWindow): void

/** 初始化今日计数（从数据库加载） */
async function initTodayCount(): Promise<void>

/** 获取今日按键数 */
function getTodayCount(): number

/** 获取小时分布 */
function getHourlyDistribution(): number[]

/** 获取分类统计 */
function getCategoryCounts(): KeyCategoryCount

/** 获取 TOP N 按键 */
function getTodayTopKeys(n: number): TopKeyItem[]

/** 获取组合键统计 */
function getComboCounts(): ComboCounts

/** 获取当前称号 */
function getCurrentTitle(): Title | null

/** 获取已解锁称号列表 */
function getUnlockedTitlesList(): Title[]

/** 强制保存数据（退出前调用） */
async function flushData(): Promise<void>

/** 设置悬浮窗更新回调 */
function setFloatingWindowUpdater(updater: (count: number) => void): void

/** 初始化系统状态监听 */
function initSystemStateMonitoring(): void

/** 获取性能统计 */
function getPerformanceStats(): PerformanceStats
```

---

## 7. 开发规范

### 7.1 代码风格

- **缩进**: 2 个空格
- **引号**: 单引号
- **分号**: 必需
- **行尾**: LF (Unix风格)

```typescript
// ✅ 正确
const count: number = 0;
const user = {
  name: 'John',
  age: 30
};

// ❌ 错误
const count = 0
const user = {
  "name": "John",
  "age": 30
}
```

### 7.2 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 变量/函数 | camelCase | `getTodayCount`, `todayCount` |
| 类/接口 | PascalCase | `DailyStat`, `KeyCategoryCount` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS` |
| 文件名 | kebab-case | `database.ts`, `category-chart.vue` |
| Vue组件 | PascalCase | `CategoryChart.vue` |

### 7.3 注释规范

```typescript
/**
 * 获取今日按键数
 * @returns 今日按键总数
 */
export function getTodayCount(): number {
  return todayCount;
}

/**
 * 处理按键事件
 * @param category - 按键分类
 * @param keyName - 按键名称
 */
function processKeyEvent(category: string, keyName: string): void {
  // 实现逻辑
}
```

### 7.4 错误处理规范

```typescript
// 必须捕获并记录错误
async function saveData(): Promise<void> {
  try {
    await db.write();
  } catch (error) {
    console.error('[Database] Failed to save data:', error);
    // 可选：通知用户
  }
}

// IPC 处理必须 try-catch
ipcMain.handle('get-today-stats', async () => {
  try {
    // 获取数据
  } catch (error) {
    console.error('[Main] Failed to get today stats:', error);
    return { /* 默认数据 */ };
  }
});
```

### 7.5 日志规范

```typescript
// 使用统一的日志前缀
console.log('[Main] Message');           // 主进程
console.log('[Renderer] Message');       // 渲染进程
console.log('[Tracker] Message');        // 键盘监听
console.log('[Database] Message');       // 数据库操作

// 错误日志
console.error('[Main] Error description:', error);

// 调试日志（开发时可用）
console.debug('[Debug] Variable:', value);
```

---

## 8. 测试策略

### 8.1 单元测试

```typescript
// __tests__/database.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultComboCounts, createDefaultCategoryCount } from '../src/main/database';

describe('Database Utils', () => {
  it('should create default combo counts', () => {
    const counts = createDefaultComboCounts();
    expect(counts.COPY).toBe(0);
    expect(counts.PASTE).toBe(0);
  });

  it('should create default category count', () => {
    const counts = createDefaultCategoryCount();
    expect(counts.letter).toBe(0);
    expect(counts.number).toBe(0);
  });
});
```

### 8.2 集成测试

```typescript
// __tests__/tracker.integration.test.ts
import { describe, it, expect } from 'vitest';
import { initTodayCount, getTodayCount } from '../src/main/tracker';

describe('Tracker Integration', () => {
  it('should initialize today count from database', async () => {
    await initTodayCount();
    const count = getTodayCount();
    expect(typeof count).toBe('number');
  });
});
```

### 8.3 E2E 测试

使用 Playwright 进行端到端测试：

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard displays today count', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('.today-count')).toBeVisible();
  const count = await page.locator('.today-count').textContent();
  expect(parseInt(count)).toBeGreaterThanOrEqual(0);
});
```

---

## 9. 部署发布

### 9.1 版本号规范

遵循语义化版本（Semantic Versioning）：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能添加
- **PATCH**: 向下兼容的问题修复

### 9.2 打包配置

```json
// electron-builder.json
{
  "appId": "com.keyboardtracker.app",
  "productName": "KeyboardTracker",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "src/bin/**/*"
  ],
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "category": "public.app-category.productivity"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  }
}
```

### 9.3 发布流程

```bash
# 1. 更新版本号
npm version patch  # 或 minor / major

# 2. 构建生产版本
npm run build

# 3. 打包
npm run build:mac
npm run build:win

# 4. 签名（需要证书）
# macOS: codesign
# Windows: signtool

# 5. 上传到发布服务器
```

---

## 10. 故障排查

### 10.1 常见问题

#### Q: 键盘监听不工作

**检查项：**
1. 检查辅助功能权限（macOS）
2. 检查 native 二进制文件是否存在
3. 查看控制台错误日志
4. 确认进程是否正常运行

#### Q: 数据不保存

**检查项：**
1. 检查数据库目录权限
2. 查看 `saveData()` 是否被调用
3. 检查磁盘空间

#### Q: 悬浮窗不显示

**检查项：**
1. 检查设置中是否开启
2. 查看悬浮窗是否被其他窗口遮挡
3. 检查坐标位置是否超出屏幕

### 10.2 调试模式

```bash
# 启动开发模式（含调试工具）
npm run dev

# 查看详细日志
DEBUG=* npm run dev

# 主进程调试
electron --inspect-brk .
```

### 10.3 性能监控

```typescript
// 检查内存使用
const usage = process.memoryUsage();
console.log(`Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
console.log(`RSS: ${Math.round(usage.rss / 1024 / 1024)}MB`);
```

---

## 附录

### A. 参考文档

- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/guide/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [lowdb 文档](https://github.com/typicode/lowdb)

### B. 相关资源

- 图标：[Heroicons](https://heroicons.com/)
- 颜色：[Tailwind Colors](https://tailwindcss.com/docs/customizing-colors)
- 图表：[ECharts 示例](https://echarts.apache.org/examples/)

---

**文档维护**: 每次功能迭代后更新此文档
**反馈渠道**: 提交 Issue 到项目仓库
