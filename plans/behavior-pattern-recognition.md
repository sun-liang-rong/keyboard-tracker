# 智能行为模式识别功能实施计划

## 功能概述

通过分析用户的键盘输入模式和活跃窗口，智能识别用户当前的行为状态（工作/摸鱼/游戏/空闲），并生成行为分析报告。

---

## 1. 需求分析

### 1.1 四种行为模式

| 模式类型 | 判定规则 | 输出内容 |
|---------|---------|---------|
| **工作模式** | 1. Ctrl/Cmd/Shift 等快捷键占比≥30%<br>2. 活跃窗口为 IDE/Office/Figma/设计工具等工作类软件 | 当日工作模式总时长、占比，工作时段的专注度波动 |
| **摸鱼/聊天模式** | 1. 字母键/Enter/Backspace 占比≥80%，快捷键占比<10%<br>2. 活跃窗口为微信/QQ/浏览器娱乐页/短视频软件 | 当日摸鱼时长、工作时段内的摸鱼占比，异常提醒（如工作时间摸鱼超过2小时） |
| **游戏模式** | 1. 方向键/WASD/空格占比≥60%<br>2. 活跃窗口为游戏进程/全屏状态 | 当日游戏时长，游戏后的工作效率变化分析 |
| **空闲模式** | 5分钟以上无任何键盘/鼠标操作 | 当日总空闲时长，用于区分休息和摸鱼 |

### 1.2 数据展示需求

- **实时状态指示** - 当前行为模式标签显示
- **时段分析** - 一天中各时段的行为模式分布
- **统计报告** - 日/周/月维度的行为模式占比
- **异常提醒** - 工作时间摸鱼过长提醒
- **效率分析** - 游戏后对工作效率的影响分析

---

## 2. 技术架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    行为模式识别系统                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │   Native Layer   │      │  Pattern Engine  │            │
│  │                  │      │                  │            │
│  │  ┌────────────┐  │      │  ┌────────────┐  │            │
│  │  │ 键盘监听   │──┼──────┼──┤ 模式识别   │  │            │
│  │  └────────────┘  │      │  │  算法      │  │            │
│  │         │        │      │  └─────┬──────┘  │            │
│  │  ┌────────────┐  │      │        │         │            │
│  │  │ 窗口监听   │──┼──────┼────────┘         │            │
│  │  │ (新)      │  │      │                  │            │
│  │  └────────────┘  │      └────────┬─────────┘            │
│  └──────────────────┘               │                       │
│                                     │                       │
│  ┌──────────────────┐      ┌────────┴─────────┐            │
│  │   Database       │      │   UI Layer       │            │
│  │                  │      │                  │            │
│  │  behaviorStats   │◄─────┤  模式分布图      │            │
│  │  patternHistory  │      │  实时状态指示    │            │
│  └──────────────────┘      │  异常提醒弹窗    │            │
│                            └──────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
键盘事件 ──► 模式识别算法 ──► 行为模式状态 ──► 存储 ──► UI展示
                ▲
窗口信息 ────────┘
```

---

## 3. 实施阶段

### Phase 1: Native 层改造 (Week 1)

#### 3.1.1 macOS 窗口监听实现

**文件**: `native/macos/window_observer.mm`

```cpp
// 监听活跃窗口变化
// 使用 NSWorkspace 的 NSWorkspaceDidActivateApplicationNotification

@interface WindowObserver : NSObject
- (void)startObserving;
- (NSString *)getActiveWindowInfo; // 返回 {"appName": "", "windowTitle": ""}
@end
```

**输出格式**:
```
WINDOW:{"appName":"VS Code","windowTitle":"tracker.ts - key"}
```

#### 3.1.2 Windows 窗口监听实现

**文件**: `native/windows/window_tracker.ahk`

```autohotkey
; 使用 WinGetTitle 和 WinGetClass 获取窗口信息
SetTimer, CheckActiveWindow, 1000

CheckActiveWindow:
    WinGetTitle, title, A
    WinGetClass, class, A
    FileAppend, WINDOW:%title%|%class%`n, *, UTF-8
return
```

#### 3.1.3 扩展键盘输出格式

修改现有键盘监听，输出更详细的按键信息：

```
KEYDOWN:category:keyName:timestamp
```

例如:
```
KEYDOWN:letter:a:1711234567890
KEYDOWN:modifier:Control:1711234567895
```

### Phase 2: 核心引擎开发 (Week 1-2)

#### 3.2.1 数据模型扩展

**文件**: `src/main/database.ts`

```typescript
// 行为模式类型
enum BehaviorPattern {
  WORK = 'work',
  SLACK = 'slack',
  GAMING = 'gaming',
  IDLE = 'idle'
}

// 模式统计
interface PatternStats {
  pattern: BehaviorPattern
  startTime: number
  endTime: number
  duration: number
  keyCount: number
  appName: string
}

// 扩展 DailyStat
interface DailyStat {
  // ... 原有字段
  patterns: PatternStats[]           // 行为模式记录
  patternSummary: PatternSummary     // 模式汇总
}

// 模式汇总
interface PatternSummary {
  work: { duration: number; percentage: number }
  slack: { duration: number; percentage: number }
  gaming: { duration: number; percentage: number }
  idle: { duration: number; percentage: number }
}
```

#### 3.2.2 模式识别引擎

**文件**: `src/main/pattern-engine.ts`

```typescript
export class PatternEngine {
  // 滑动窗口大小（5分钟）
  private readonly WINDOW_SIZE = 5 * 60 * 1000

  // 模式判定阈值
  private readonly THRESHOLDS = {
    WORK: { shortcutRatio: 0.3 },
    SLACK: { letterRatio: 0.8, shortcutRatio: 0.1 },
    GAMING: { gamingKeyRatio: 0.6 },
    IDLE: { idleTime: 5 * 60 * 1000 }
  }

  // 工作类应用清单
  private readonly WORK_APPS = [
    'Code', 'Visual Studio Code', 'IntelliJ',
    'Xcode', 'Terminal', 'iTerm',
    'Microsoft Word', 'Excel', 'PowerPoint',
    'Figma', 'Sketch', 'Photoshop'
  ]

  // 摸鱼类应用清单
  private readonly SLACK_APPS = [
    'WeChat', 'QQ', 'Telegram',
    'Chrome', 'Safari', 'Edge'
  ]

  // 游戏类进程名关键词
  private readonly GAMING_APPS = [
    'game', 'steam', 'battle.net'
  ]

  /**
   * 分析当前行为模式
   */
  analyzePattern(windowInfo: WindowInfo, keyStats: KeyStats): BehaviorPattern

  /**
   * 更新滑动窗口数据
   */
  updateSlidingWindow(timestamp: number, keyType: string): void

  /**
   * 获取当前模式统计
   */
  getCurrentStats(): PatternStats
}
```

#### 3.2.3 模式识别算法

```typescript
function detectPattern(windowInfo: WindowInfo, stats: KeyStats): BehaviorPattern {
  // 1. 优先判断空闲模式
  if (stats.lastKeyTime < Date.now() - 5 * 60 * 1000) {
    return BehaviorPattern.IDLE
  }

  // 2. 根据窗口判断
  const appCategory = categorizeApp(windowInfo.appName)

  if (appCategory === 'game') {
    // 检查 WASD/方向键占比
    if (stats.gamingKeyRatio >= 0.6) {
      return BehaviorPattern.GAMING
    }
  }

  if (appCategory === 'work') {
    // 检查快捷键占比
    if (stats.shortcutRatio >= 0.3) {
      return BehaviorPattern.WORK
    }
  }

  if (appCategory === 'chat' || appCategory === 'browser') {
    // 检查字母键占比
    if (stats.letterRatio >= 0.8 && stats.shortcutRatio < 0.1) {
      return BehaviorPattern.SLACK
    }
  }

  // 3. 纯按键模式判断
  if (stats.gamingKeyRatio >= 0.6) {
    return BehaviorPattern.GAMING
  }

  if (stats.shortcutRatio >= 0.3) {
    return BehaviorPattern.WORK
  }

  if (stats.letterRatio >= 0.8) {
    return BehaviorPattern.SLACK
  }

  return BehaviorPattern.IDLE
}
```

### Phase 3: 数据存储与统计 (Week 2)

#### 3.3.1 模式数据持久化

```typescript
// 保存模式记录
async function savePatternStats(pattern: PatternStats): Promise<void>

// 获取今日模式汇总
function getTodayPatternSummary(): PatternSummary

// 获取模式历史（用于趋势分析）
function getPatternHistory(days: number): PatternStats[]
```

#### 3.3.2 异常检测

```typescript
// 检测工作时间摸鱼
function detectSlackDuringWork(): {
  isAbnormal: boolean
  slackDuration: number
  suggestion: string
}

// 检测游戏后的工作效率
function analyzeGamingImpact(): {
  gamingTime: number
  postGamingEfficiency: number
  recommendation: string
}
```

### Phase 4: UI 开发 (Week 3)

#### 3.4.1 实时状态指示

**组件**: `src/renderer/components/PatternIndicator.vue`

```vue
<template>
  <div class="pattern-indicator" :class="currentPattern">
    <div class="pattern-icon">{{ patternIcon }}</div>
    <div class="pattern-label">{{ patternLabel }}</div>
    <div class="pattern-duration">{{ formatDuration(duration) }}</div>
  </div>
</template>
```

样式:
- 🟢 工作模式 - 绿色
- 🟡 摸鱼模式 - 黄色
- 🔴 游戏模式 - 红色
- ⚪ 空闲模式 - 灰色

#### 3.4.2 模式分布图表

**组件**: `src/renderer/components/PatternChart.vue`

- 饼图展示各模式占比
- 堆叠柱状图展示一天中各时段的模式分布
- 折线图展示专注度变化趋势

#### 3.4.3 行为分析报告

**组件**: `src/renderer/components/PatternReport.vue`

展示内容:
- 📊 今日行为模式占比
- ⏱️ 各模式累计时长
- 📈 工作效率评分
- ⚠️ 异常行为提醒
- 💡 个性化建议

#### 3.4.4 异常提醒弹窗

**组件**: `src/renderer/components/PatternAlert.vue`

触发条件:
- 工作时间摸鱼超过2小时
- 连续空闲超过30分钟（可配置）
- 深夜游戏时间过长

### Phase 5: 集成与优化 (Week 4)

#### 3.5.1 系统集成

1. 在主进程中初始化模式引擎
2. 将模式状态添加到 IPC 通信
3. 在悬浮窗显示当前模式
4. 模式切换时触发 UI 更新

#### 3.5.2 性能优化

- 模式识别算法节流（1秒执行一次）
- 窗口监听防抖（避免频繁切换）
- 批量保存模式数据（每5分钟保存一次）

#### 3.5.3 配置选项

在设置页面添加:
- 行为模式检测开关
- 异常提醒阈值配置
- 工作类应用自定义清单
- 摸鱼类应用自定义清单

---

## 4. 关键技术点

### 4.1 窗口监听

**macOS**:
- 使用 `NSWorkspace.sharedWorkspace.notificationCenter`
- 监听 `NSWorkspaceDidActivateApplicationNotification`
- 需要辅助功能权限

**Windows**:
- 使用 `GetForegroundWindow()` Win32 API
- 或使用 AutoHotkey 的 `WinGetTitle`
- 需要管理员权限（可选）

### 4.2 滑动窗口算法

```typescript
class SlidingWindow {
  private window: Array<{ timestamp: number; keyType: string }> = []
  private readonly WINDOW_SIZE = 5 * 60 * 1000 // 5分钟

  add(timestamp: number, keyType: string): void {
    this.window.push({ timestamp, keyType })
    this.removeExpired(timestamp)
  }

  removeExpired(currentTime: number): void {
    const cutoff = currentTime - this.WINDOW_SIZE
    this.window = this.window.filter(item => item.timestamp > cutoff)
  }

  getStats(): KeyStats {
    // 计算各类按键占比
    const total = this.window.length
    const letters = this.window.filter(k => k.keyType === 'letter').length
    const shortcuts = this.window.filter(k => k.keyType === 'modifier').length
    const gamingKeys = this.window.filter(k =>
      ['Up', 'Down', 'Left', 'Right', 'w', 'a', 's', 'd', 'Space'].includes(k.keyType)
    ).length

    return {
      total,
      letterRatio: letters / total,
      shortcutRatio: shortcuts / total,
      gamingKeyRatio: gamingKeys / total,
      lastKeyTime: this.window[this.window.length - 1]?.timestamp || 0
    }
  }
}
```

### 4.3 模式切换处理

```typescript
// 模式切换时保存上一段数据
function onPatternChange(newPattern: BehaviorPattern): void {
  const currentStats = patternEngine.getCurrentStats()

  if (currentStats.pattern !== newPattern) {
    // 保存上一段
    currentStats.endTime = Date.now()
    currentStats.duration = currentStats.endTime - currentStats.startTime
    await savePatternStats(currentStats)

    // 开始新的一段
    patternEngine.startNewPattern(newPattern)

    // 触发 UI 更新
    mainWindow.webContents.send('pattern-changed', newPattern)
  }
}
```

---

## 5. 开发任务清单

### Phase 1: Native 层 (Week 1)

- [ ] macOS 窗口监听实现
- [ ] Windows 窗口监听实现
- [ ] 扩展键盘输出格式（添加时间戳）
- [ ] 更新 native 二进制文件

### Phase 2: 核心引擎 (Week 1-2)

- [ ] 定义模式相关数据模型
- [ ] 实现模式识别引擎
- [ ] 实现滑动窗口算法
- [ ] 实现应用分类逻辑
- [ ] 模式数据持久化

### Phase 3: 统计分析 (Week 2)

- [ ] 模式汇总统计
- [ ] 异常检测算法
- [ ] 游戏后效率分析
- [ ] 历史趋势分析

### Phase 4: UI 开发 (Week 3)

- [ ] 实时模式指示器
- [ ] 模式分布图表
- [ ] 行为分析报告页面
- [ ] 异常提醒弹窗
- [ ] 设置页面扩展

### Phase 5: 集成优化 (Week 4)

- [ ] 主进程集成
- [ ] IPC 通信实现
- [ ] 悬浮窗模式显示
- [ ] 性能优化
- [ ] 测试与 Bug 修复

---

## 6. 风险与挑战

### 6.1 技术风险

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 窗口监听权限问题 | 高 | 提前申请权限，做好降级处理 |
| 模式识别准确率 | 中 | 允许用户手动校正，持续优化算法 |
| 性能开销 | 中 | 节流控制，算法优化 |

### 6.2 隐私考虑

- 窗口标题可能包含敏感信息
- 需要明确的隐私声明
- 允许用户关闭模式识别功能
- 敏感应用白名单（银行、密码管理器等）

### 6.3 准确性优化

**机器学习方案（未来迭代）**:
- 收集用户行为数据
- 训练个性化识别模型
- 提高模式识别准确率

---

## 7. 预期成果

### 7.1 功能特性

- ✅ 实时行为模式识别
- ✅ 四种模式准确分类
- ✅ 可视化模式分析
- ✅ 智能异常提醒
- ✅ 效率分析报告

### 7.2 技术指标

- 模式识别延迟 < 1秒
- 准确率 > 80%（初始版本）
- 内存占用增加 < 10MB
- CPU 占用增加 < 0.5%

### 7.3 用户价值

- 📊 了解自己的工作节奏
- ⏰ 发现时间黑洞
- 📈 提升工作效率
- 🎯 培养良好习惯

---

**文档版本**: v1.0
**创建时间**: 2026-03-22
**预计开发周期**: 4周
