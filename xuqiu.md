# 项目需求文档 — 键盘活跃度统计工具

## 1. 项目概述

| 项目属性 | 内容 |
|---------|------|
| **项目名称** | KeyboardTracker（键盘活跃度统计工具）|
| **项目类型** | 桌面端应用程序 |
| **支持平台** | Windows / macOS |
| **目标用户** | 程序员、打工人、学生等长时间使用电脑的人群 |
| **产品定位** | 记录用户键盘使用情况，统计每日/每周/每月敲击次数和时间段分布，用数据量化专注度和工作效率 |

## 2. 核心功能需求

### 2.1 键盘监听模块 ✅ 已实现
- **全局键盘监听**：在后台静默监听所有键盘输入事件 ✅
- **数据统计**：实时记录每次按键事件，累加统计 ✅
- **隐私保护**：仅记录按键次数，不记录具体按键内容 ✅
- **开机自启**：支持设置开机自动启动（可选）🔄 待实现

### 2.2 数据统计模块 ✅ 已实现

#### 日统计 ✅
- 当日总敲击次数 ✅
- 每小时敲击分布（柱状图展示）✅
- 活跃时间段识别（连续高频率敲击）✅
- 专注时长计算（单次持续输入 >30分钟）✅
- **支持日期切换查看历史数据** ✅ 新增

#### 周统计 ✅
- 本周总敲击次数 ✅
- 每日敲击趋势（折线图展示）✅
- 工作日 vs 周末对比 🔄 待实现
- 周平均每日敲击数 ✅

#### 月统计 ✅
- 本月总敲击次数 ✅
- 每日敲击热力图（类似 GitHub contributions）✅
- 月度排行榜（敲击最多的日期）🔄 待实现
- 月度趋势分析 🔄 待实现

### 2.3 可视化展示 ✅ 已实现
- **实时悬浮窗**：桌面角落显示今日敲击数（可拖拽、可隐藏）✅
  - 位置：屏幕右上角（可拖拽）✅
  - 透明度：默认80%，鼠标悬停100% ✅
  - 交互：点击打开主界面，右键菜单 ✅
- **主界面仪表盘**：
  - 今日数据概览 ✅
  - 时段分布图表（支持切换日期查看历史）✅
  - 本周趋势图 ✅
  - 本月热力图 ✅
  - 固定顶部导航栏 ✅ 新增

### 2.4 设置功能 ✅ 部分实现
- 开机自启开关 🔄 待实现
- 悬浮窗显示/隐藏 ✅
- 数据保留期限（默认保存90天）✅
- 快捷键设置 🔄 待实现
- 主题切换（浅色/深色）✅

## 3. 技术架构

### 3.1 技术选型

| 层级 | 技术方案 |
|-----|---------|
| **框架** | Electron（跨平台桌面应用）|
| **前端** | Vue 3 + Vite + TypeScript + Tailwind CSS |
| **数据存储** | lowdb（本地轻量级 JSON 数据库）|
| **图表库** | ECharts |
| **打包** | electron-builder |

### 3.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    KeyboardTracker                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Renderer    │  │   Renderer   │  │   Renderer   │       │
│  │   (Vue 3)    │  │    (Vue 3)   │  │    (Vue 3)   │       │
│  │ 主界面/统计页 │  │   悬浮窗     │  │   设置页     │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌────────────────────────┴────────────────────────┐       │
│  │              IPC (进程间通信)                     │       │
│  └────────────────────────┬────────────────────────┘       │
│                           │                                 │
│  ┌────────────────────────┴────────────────────────┐       │
│  │                  Main Process                    │       │
│  │  ┌──────────────┐  ┌──────────────────────┐    │       │
│  │  │ 键盘监听服务  │  │      数据服务层       │    │       │
│  │  │ Windows │ AutoHotkey 
macOS Quartz / CGEvent│  │  │  lowdb 数据库   │  │    │       │
│  │  └──────────────┘  │  └────────────────┘  │    │       │
│  │                    └──────────────────────┘    │       │
│  └────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## 4. 数据模型

### 4.1 lowdb 数据存储结构

使用 lowdb 作为本地 JSON 数据库，数据存储在用户目录下的 `keyboard-tracker-db.json` 文件中。

#### 数据库 Schema

```json
{
  "keystrokes": [
    {
      "id": 1,
      "timestamp": 1710931200000,
      "count": 50,
      "hour": 14,
      "date": "2026-03-20"
    }
  ],
  "dailyStats": [
    {
      "date": "2026-03-20",
      "totalCount": 12500,
      "hourlyDistribution": [0, 0, 0, 0, 0, 0, 120, 450, 800, 1200, 1500, 1300, 1100, 1400, 1600, 1200, 900, 600, 400, 200, 100, 50, 30, 10],
      "activeHours": 8,
      "focusSessions": 3
    }
  ],
  "settings": {
    "autoStart": false,
    "showFloatingWindow": true,
    "dataRetentionDays": 90,
    "theme": "dark"
  }
}
```

### 4.2 TypeScript 类型定义

```typescript
// 实时数据
interface KeystrokeData {
  timestamp: number;
  count: number;
  date: string;
  hour: number;
}

// 日统计
interface DailyStat {
  date: string;
  totalCount: number;
  hourlyDistribution: number[]; // 24小时分布
  activeTimeRanges: TimeRange[];
}

// 周统计
interface WeeklyStat {
  weekStart: string;
  weekEnd: string;
  totalCount: number;
  dailyCounts: number[]; // 7天数据
  averagePerDay: number;
}
```

## 5. UI 设计

### 5.1 主界面布局

```
┌────────────────────────────────────────────────────────────┐
│  KeyboardTracker                    [设置] [最小化] [关闭]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📊 今日概览                                          │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │ 12,345  │ │  8小时   │ │  3次     │ │  第5名   │ │  │
│  │  │ 总按键   │ │ 活跃时长 │ │ 专注时段 │ │ 今日排名 │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📈 本周趋势                                          │  │
│  │                                                      │  │
│  │         ╱╲                                           │  │
│  │        ╱  ╲    ╱╲        折线图                      │  │
│  │    ╱╲ ╱    ╲  ╱  ╲                                   │  │
│  │   ╱  ╳      ╲╱    ╲╱                                 │  │
│  │  ╱  ╱ ╲                                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔥 本月热力图                                        │  │
│  │                                                      │  │
│  │   日 一 二 三 四 五 六                               │  │
│  │   □ □ □ □ □ □ □                                     │  │
│  │   □ □ ■ ■ ■ □ □   □=低活跃 ■=中活跃 ■=高活跃          │  │
│  │   ■ ■ ■ ■ ■ ■ □                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 悬浮窗设计

```
┌────────────────┐
│ ⌨️ 今日: 12,345 │
└────────────────┘
```

- 位置：屏幕右上角（可拖拽）
- 透明度：默认80%，鼠标悬停100%
- 交互：点击打开主界面，右键菜单

## 6. 开发计划

### Phase 1：基础框架（Week 1）
- [ ] Electron + Vite 项目搭建
- [ ] Vue 3 + TypeScript 配置
- [ ] Tailwind CSS 集成
- [ ] lowdb 数据库初始化
- [ ] 基础窗口管理

### Phase 2：核心功能（Week 2-3）✅ 已完成
- [x] 键盘监听模块 - 使用原生 CLI 工具方案（macOS: CGEvent, Windows: AutoHotkey）
- [x] 数据统计逻辑 - 日/周/月统计数据计算
- [x] 数据持久化 - lowdb JSON 数据库存储
- [x] 基础UI界面 - Dashboard 主界面

### Phase 3：可视化（Week 4）✅ 已完成
- [x] 日统计图表 - 24小时时段分布柱状图，支持日期切换查看历史
- [x] 周趋势图 - 近7天按键趋势折线图
- [x] 月热力图 - GitHub 风格贡献热力图
- [x] 实时数据更新 - 按键时实时刷新图表

### Phase 4：优化完善（Week 5）✅ 已完成
- [x] 设置功能 - 主题切换（浅色/深色模式）
- [x] 数据保留 - 本地数据库存储，支持历史查询
- [x] 性能优化 - 每10次按键保存一次，减少 I/O

### Phase 5：打包发布（Week 6）🔄 待完成
- [ ] Windows 安装包
- [ ] macOS 安装包
- [ ] 测试验证
- [ ] 文档完善

## 7. 技术难点与解决方案

### 7.1 键盘监听方案（工程化推荐）

放弃 iohook（依赖复杂、跨平台兼容性差），采用**平台原生 CLI 工具**方案：

| 平台 | 方案 | 实现方式 |
|-----|------|---------|
| **macOS** | Quartz / CGEvent | 编写 C++ 命令行工具，Node.js 通过 child_process 调用 |
| **Windows** | AutoHotkey | AHK 脚本编译为 exe，Node.js 通过 child_process 调用 |

#### macOS 实现（Quartz + CGEvent）

**技术栈**: Objective-C++ / C++ → 编译为 CLI 工具

```cpp
// keylogger.mm
#include <CoreGraphics/CoreGraphics.h>
#include <iostream>

CGEventRef callback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    if (type == kCGEventKeyDown) {
        std::cout << "KEYDOWN" << std::endl;
    }
    return event;
}

int main() {
    CGEventMask mask = CGEventMaskBit(kCGEventKeyDown);
    CFMachPortRef tap = CGEventTapCreate(
        kCGSessionEventTap, kCGHeadInsertEventTap, 0, mask, callback, nullptr
    );
    // ... 事件循环
}
```

**编译命令**:
```bash
clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac
```

**Node.js 调用**:
```typescript
import { spawn } from 'child_process';

const tracker = spawn('./bin/keytracker-mac');
tracker.stdout.on('data', (data) => {
  if (data.toString().trim() === 'KEYDOWN') {
    // 累加按键计数
    recordKeystroke();
  }
});
```

#### Windows 实现（AutoHotkey）

**技术栈**: AHK 脚本 → 编译为 exe

```autohotkey
; keytracker.ahk
#NoTrayIcon
#Persistent

~*LButton::SendCount()
~*RButton::SendCount()
~*MButton::SendCount()
~*WheelUp::SendCount()
~*WheelDown::SendCount()
~*XButton1::SendCount()
~*XButton2::SendCount()

; 键盘热键
~*a::SendCount()
~*b::SendCount()
; ... 所有按键

SendCount() {
    FileAppend, KEYDOWN`n, *, UTF-8
}
```

**编译**: 使用 AutoHotkey 编译器 (Ahk2Exe) 生成 `keytracker-win.exe`

**Node.js 调用**:
```typescript
import { spawn } from 'child_process';
import path from 'path';

const isWin = process.platform === 'win32';
const binName = isWin ? 'keytracker-win.exe' : 'keytracker-mac';
const tracker = spawn(path.join(__dirname, 'bin', binName));

tracker.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim() === 'KEYDOWN') {
      recordKeystroke();
    }
  });
});
```

### 7.2 方案优势

| 对比项 | iohook | 原生 CLI 方案 |
|-------|--------|--------------|
| 依赖管理 | 复杂（原生模块编译）| 无依赖，预编译二进制 |
| 跨平台 | 需单独配置 | 各平台独立实现，逻辑统一 |
| 权限申请 | 运行时动态申请 | 安装时一次性授权 |
| 性能 | 中等 | 高（原生代码）|
| 维护成本 | 高（Electron 版本绑定）| 低（独立工具）|
| 打包体积 | 较大（含 node_modules）| 小（仅二进制）|

### 7.3 项目结构

```
KeyboardTracker/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts
│   │   └── tracker.ts     # 键盘监听管理
│   ├── renderer/          # Vue 3 前端
│   └── bin/               # 预编译的二进制工具
│       ├── keytracker-mac  (macOS 可执行文件)
│       └── keytracker-win.exe  (Windows 可执行文件)
├── native/                # 原生工具源码
│   ├── macos/
│   │   └── keylogger.mm
│   └── windows/
│       └── keytracker.ahk
└── package.json
```

### 7.4 其他技术难点

| 难点 | 解决方案 |
|-----|---------|
| 跨平台兼容性 | Electron 封装，平台差异代码分离处理 |
| 数据读写性能 | lowdb 使用 lodash 链式操作，大数据量时定期归档 |
| 后台运行保活 | 注册系统服务 / Tray 托盘保持运行 |
| 安装包权限 | 安装时申请辅助功能/管理员权限（避免运行时弹窗）|

## 8. 隐私与安全

- **本地存储**：所有数据仅存储在用户本地，不上传云端
- **内容保护**：只记录按键次数，绝不记录具体按键内容
- **数据清理**：支持自动清理过期数据（可配置保留天数）
- **权限最小化**：仅申请键盘监听必要权限

## 9. 未来扩展

- [ ] 多设备数据同步
- [ ] 数据导出（CSV/JSON）
- [ ] 目标设定与提醒
- [ ] 与其他效率工具集成
- [ ] 快捷键统计（Command/Ctrl 使用频率）

---

## 已实现功能汇总

### ✅ 核心功能
1. **键盘监听** - 使用原生二进制工具监听全局键盘事件
2. **数据存储** - lowdb JSON 数据库存储，支持历史数据查询
3. **实时统计** - 按键次数实时更新到界面

### ✅ 可视化图表
1. **时段分布图** - 24小时柱状图，支持切换日期查看任意一天
2. **周统计图** - 近7天趋势折线图
3. **月热力图** - GitHub 风格贡献图，显示整月活跃情况

### ✅ UI 特性
1. **固定导航栏** - 玻璃拟态效果，始终可见
2. **主题切换** - 支持浅色/深色模式
3. **响应式布局** - 适配不同屏幕尺寸

### 🔄 待实现功能
1. 悬浮窗显示
2. 开机自启
3. 快捷键设置
4. 数据导出
5. 安装包打包

---

**文档版本**: v1.1
**创建时间**: 2026-03-20
**最后更新**: 2026-03-20
