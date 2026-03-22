# KeyboardTracker

<p align="center">
  <img src="./public/logo.png" width="120" height="120" alt="KeyboardTracker Logo">
</p>

<p align="center">
  <strong>键盘活跃度统计工具</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#截图预览">截图预览</a> •
  <a href="#文档">文档</a> •
  <a href="#下载">下载</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-29+-47848F?logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3+-4FC08D?logo=vue.js&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3+-06B6D4?logo=tailwind-css&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue" alt="Platform">
</p>

---

## 📖 简介

KeyboardTracker 是一款跨平台的键盘活跃度统计工具，帮助程序员、打工人、学生等长时间使用电脑的人群量化工作专注度和效率。

通过记录键盘使用情况，统计每日/每周/每月敲击次数和时间段分布，用数据可视化展示你的工作节奏。

## ✨ 功能特性

### 📊 数据统计
- **实时计数** - 精确记录每次键盘敲击
- **小时分布** - 24小时柱状图展示活跃时段
- **分类统计** - 字母/数字/功能/控制/符号/修饰键分类
- **高频按键** - TOP20 按键使用排行
- **组合键检测** - COPY/PASTE/UNDO/SAVE 等常用组合键统计
- **称号系统** - 游戏化称号，解锁「复制粘贴大师」「最速打字王」等

### 📈 可视化图表
- **时段分布图** - 24小时柱状图，支持切换日期查看历史
- **周趋势图** - 近7天按键趋势折线图
- **月热力图** - GitHub 风格贡献图，显示整月活跃情况
- **分类统计图** - 按键类型饼图/柱状图展示

### 🎯 智能特性
- **悬浮窗** - 可拖拽、可隐藏的实时计数器
- **深色/浅色主题** - 自动适配系统主题
- **锁屏检测** - 自动暂停/恢复采集，避免误判
- **性能优化** - CPU占用≤1%，内存占用≤50MB
- **数据持久化** - 本地数据库存储，支持90天历史查询

### ⚡ 性能保障
- **节流控制** - 100ms节流，保证系统流畅
- **内存管理** - 自动清理，限制内存使用
- **实时保存** - 数据即时持久化，防止丢失

## 🛠 技术栈

| 层级 | 技术 |
|-----|------|
| **框架** | [Electron](https://www.electronjs.org/) v29+ |
| **前端** | [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **样式** | [Tailwind CSS](https://tailwindcss.com/) |
| **状态管理** | [Pinia](https://pinia.vuejs.org/) |
| **图表** | [ECharts](https://echarts.apache.org/) |
| **数据库** | [lowdb](https://github.com/typicode/lowdb) (JSON) |
| **构建** | [electron-builder](https://www.electron.build/) |

## 🚀 快速开始

### 环境要求

- **Node.js**: v18+ (推荐 v20 LTS)
- **npm**: v9+
- **macOS**: macOS 12+ (需要辅助功能权限)
- **Windows**: Windows 10/11

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/keyboard-tracker.git
cd keyboard-tracker

# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev
```

### 构建生产版本

```bash
# 构建生产版本
npm run build

# 打包 Windows 安装包
npm run build:win

# 打包 macOS 安装包
npm run build:mac
```

## 📸 截图预览

<p align="center">
  <img src="./screenshots/dashboard.png" width="800" alt="Dashboard">
</p>

<p align="center">
  <em>主界面仪表盘 - 今日概览、时段分布、本周趋势</em>
</p>

<p align="center">
  <img src="./screenshots/heatmap.png" width="800" alt="Heatmap">
</p>

<p align="center">
  <em>月热力图 - GitHub 风格的贡献图</em>
</p>

<p align="center">
  <img src="./screenshots/floating.png" width="200" alt="Floating Window">
</p>

<p align="center">
  <em>悬浮窗 - 实时显示今日按键数</em>
</p>

## 📚 文档

- **[需求文档](./xuqiu.md)** - 产品需求、功能清单、开发计划
- **[开发文档](./DEVELOPMENT.md)** - 技术规范、API接口、代码规范

## ⬇️ 下载

### 最新版本

| 平台 | 下载 | 说明 |
|-----|------|------|
| **macOS** | [下载 DMG](https://github.com/your-username/keyboard-tracker/releases) | Intel & Apple Silicon |
| **Windows** | [下载 EXE](https://github.com/your-username/keyboard-tracker/releases) | 64-bit |

### 安装说明

**macOS:**
1. 下载 `.dmg` 文件
2. 打开 DMG，将应用拖到 Applications 文件夹
3. 首次运行需要在「系统设置 > 隐私与安全性 > 辅助功能」中授权

**Windows:**
1. 下载 `.exe` 安装包
2. 运行安装程序
3. 按提示完成安装

## 🏗️ 项目结构

```
keyboard-tracker/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 主入口
│   │   ├── tracker.ts     # 键盘监听核心
│   │   └── database.ts    # 数据库操作
│   ├── renderer/          # Vue 3 前端
│   │   ├── components/    # 公共组件
│   │   ├── views/         # 页面组件
│   │   └── stores/        # Pinia 状态管理
│   └── bin/               # Native 二进制文件
├── native/                # Native 工具源码
├── public/                # 静态资源
└── package.json
```

## 🔒 隐私与安全

- ✅ **本地存储** - 所有数据仅存储在用户本地，不上传云端
- ✅ **隐私保护** - 只记录按键次数和类型，绝不记录具体按键内容
- ✅ **权限最小化** - 仅申请键盘监听必要权限
- ✅ **数据清理** - 支持自动清理过期数据（默认保留90天）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.2.0 (2026-03-22)

**新增功能:**
- 🏆 称号系统 - 解锁「复制粘贴大师」「最速打字王」等称号
- 📊 组合键统计 - 统计 COPY/PASTE/UNDO 等常用组合键
- 🎨 按键分类统计 - 字母/数字/功能/控制/符号/修饰键分类
- 🔢 高频按键 TOP20 - 实时按键使用排行
- ⚡ 性能优化 - 100ms节流控制，CPU占用≤1%
- 🔒 锁屏检测 - 自动暂停/恢复采集

**修复:**
- 修复组合键数据持久化问题
- 修复跨天时数据保存问题

### v1.1.0 (2026-03-20)

- 📅 日期切换 - 支持查看任意历史日期数据
- 🌙 深色主题 - 支持浅色/深色模式切换
- 📈 数据图表 - 时段分布、周趋势、月热力图

### v1.0.0 (2026-03-15)

- 🎉 初始版本发布
- ⌨️ 键盘监听与计数
- 💾 数据持久化存储
- 📊 基础统计展示

## 📄 许可证

[MIT](./LICENSE) © 2026 KeyboardTracker Contributors

---

<p align="center">
  Made with ❤️ by KeyboardTracker Team
</p>
