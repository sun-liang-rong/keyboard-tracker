/**
 * 行为模式识别引擎
 * 通过分析键盘输入模式和活跃窗口，智能识别用户当前的行为状态
 */

import { getCurrentWindowInfo } from './tracker'
import { BehaviorPattern, PatternStats, PatternSummary } from './database'

// ========== 类型定义 ==========

/** 窗口信息 */
export interface WindowInfo {
  appName: string
  bundleId?: string
  windowTitle: string
  timestamp: number
}

/** 按键统计 */
export interface KeyStats {
  total: number
  letterRatio: number      // 字母键占比
  numberRatio: number      // 数字键占比
  shortcutRatio: number    // 修饰键占比（快捷键相关）
  gamingKeyRatio: number   // 游戏键占比（WASD/方向键/空格）
  controlKeyRatio: number  // 控制键占比（Enter/Backspace等）
  lastKeyTime: number      // 最后一次按键时间戳
}

/** 滑动窗口中的按键事件 */
interface KeyEvent {
  timestamp: number
  category: string
  keyName: string
}

// ========== 模式识别引擎 ==========

export class PatternEngine {
  // 滑动窗口大小（5分钟）
  private readonly WINDOW_SIZE = 5 * 60 * 1000

  // 空闲判定时间（5分钟无操作）
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000

  // 模式判定阈值
  private readonly THRESHOLDS = {
    WORK: { shortcutRatio: 0.3, minKeys: 10 },
    SLACK: { letterRatio: 0.8, shortcutRatio: 0.1, minKeys: 10 },
    GAMING: { gamingKeyRatio: 0.6, minKeys: 20 },
    IDLE: { idleTime: 5 * 60 * 1000 }
  }

  // 工作类应用清单
  private readonly WORK_APPS = [
    'Code', 'Visual Studio Code', 'IntelliJ IDEA', 'WebStorm',
    'Xcode', 'Terminal', 'iTerm', 'iTerm2', 'Hyper',
    'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint',
    'Pages', 'Numbers', 'Keynote',
    'Figma', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator',
    'Sublime Text', 'Atom', 'Vim', 'Neovim',
    'Cursor', 'Trae', 'Windsurf',
    'GitHub Desktop', 'SourceTree',
    'Postman', 'Insomnia', 'TablePlus',
    'Notion', 'Obsidian', 'Typora',
    'Docker Desktop', 'Kubernetes'
  ]

  // 摸鱼类应用清单
  private readonly SLACK_APPS = [
    'WeChat', '微信', 'QQ', 'Telegram', 'Slack', 'Discord',
    'WhatsApp', 'Line', '钉钉', '飞书', 'Lark'
  ]

  // 浏览器类应用（需要进一步判断）
  private readonly BROWSER_APPS = [
    'Chrome', 'Google Chrome', 'Safari', 'Firefox', 'Edge',
    'Opera', 'Brave Browser', 'Arc'
  ]

  // 游戏类应用关键词
  private readonly GAMING_KEYWORDS = [
    'game', 'steam', 'battle.net', 'epic', 'origin',
    'league of legends', 'valorant', 'csgo', 'dota',
    'minecraft', 'fortnite', 'pubg', 'apex',
    '魔兽世界', '英雄联盟', '原神', '王者荣耀'
  ]

  // 滑动窗口
  private window: KeyEvent[] = []

  // 当前模式
  private currentPattern: BehaviorPattern = BehaviorPattern.IDLE
  private currentPatternStartTime: number = Date.now()
  private currentPatternKeyCount: number = 0
  private currentAppName: string = ''

  // 模式历史记录（用于统计）
  private patternHistory: PatternStats[] = []

  // 上次检查时间
  private lastCheckTime: number = Date.now()

  // 模式切换回调
  private onPatternChangeCallback: ((pattern: BehaviorPattern, stats: PatternStats) => void) | null = null

  /**
   * 设置模式切换回调
   */
  setOnPatternChange(callback: (pattern: BehaviorPattern, stats: PatternStats) => void): void {
    this.onPatternChangeCallback = callback
  }

  /**
   * 添加按键事件到滑动窗口
   */
  addKeyEvent(category: string, keyName: string, timestamp: number): void {
    // 添加新事件
    this.window.push({ timestamp, category, keyName })

    // 清理过期事件
    this.removeExpiredEvents(timestamp)

    // 更新当前模式计数
    this.currentPatternKeyCount++

    // 检查是否需要重新分析模式（每秒最多一次）
    const now = Date.now()
    if (now - this.lastCheckTime > 1000) {
      this.lastCheckTime = now
      this.analyzeCurrentPattern()
    }
  }

  /**
   * 清理过期的按键事件
   */
  private removeExpiredEvents(currentTime: number): void {
    const cutoff = currentTime - this.WINDOW_SIZE
    this.window = this.window.filter(event => event.timestamp > cutoff)
  }

  /**
   * 计算当前滑动窗口的按键统计
   */
  private calculateKeyStats(): KeyStats {
    const total = this.window.length
    if (total === 0) {
      return {
        total: 0,
        letterRatio: 0,
        numberRatio: 0,
        shortcutRatio: 0,
        gamingKeyRatio: 0,
        controlKeyRatio: 0,
        lastKeyTime: 0
      }
    }

    const letters = this.window.filter(e => e.category === 'letter').length
    const numbers = this.window.filter(e => e.category === 'number').length
    const modifiers = this.window.filter(e => e.category === 'modifier').length
    const controls = this.window.filter(e => e.category === 'control').length

    // 游戏键：WASD、方向键、空格
    const gamingKeys = this.window.filter(e =>
      ['Up', 'Down', 'Left', 'Right', 'w', 'a', 's', 'd', 'Space'].includes(e.keyName)
    ).length

    // 最后按键时间
    const lastKeyTime = this.window[this.window.length - 1]?.timestamp || 0

    return {
      total,
      letterRatio: letters / total,
      numberRatio: numbers / total,
      shortcutRatio: modifiers / total,
      gamingKeyRatio: gamingKeys / total,
      controlKeyRatio: controls / total,
      lastKeyTime
    }
  }

  /**
   * 获取当前窗口信息
   */
  private getWindowInfo(): WindowInfo | null {
    return getCurrentWindowInfo()
  }

  /**
   * 分类应用类型
   */
  private categorizeApp(appName: string): 'work' | 'chat' | 'browser' | 'game' | 'other' {
    const lowerAppName = appName.toLowerCase()

    // 检查是否为游戏
    for (const keyword of this.GAMING_KEYWORDS) {
      if (lowerAppName.includes(keyword.toLowerCase())) {
        return 'game'
      }
    }

    // 检查是否为工作应用
    for (const workApp of this.WORK_APPS) {
      if (appName.includes(workApp) || workApp.includes(appName)) {
        return 'work'
      }
    }

    // 检查是否为聊天应用
    for (const slackApp of this.SLACK_APPS) {
      if (appName.includes(slackApp) || slackApp.includes(appName)) {
        return 'chat'
      }
    }

    // 检查是否为浏览器
    for (const browser of this.BROWSER_APPS) {
      if (appName.includes(browser) || browser.includes(appName)) {
        return 'browser'
      }
    }

    return 'other'
  }

  /**
   * 分析当前行为模式
   */
  private analyzeCurrentPattern(): void {
    const stats = this.calculateKeyStats()
    const windowInfo = this.getWindowInfo()
    const now = Date.now()

    // 1. 优先判断空闲模式
    if (stats.lastKeyTime === 0 || now - stats.lastKeyTime > this.IDLE_TIMEOUT) {
      this.switchPattern(BehaviorPattern.IDLE, now)
      return
    }

    // 需要足够的样本量才进行模式判断
    if (stats.total < 5) {
      return // 保持当前模式
    }

    // 2. 根据窗口和按键特征判断
    const appCategory = windowInfo ? this.categorizeApp(windowInfo.appName) : 'other'

    let detectedPattern: BehaviorPattern | null = null

    // 游戏模式判断
    if (appCategory === 'game' || stats.gamingKeyRatio >= this.THRESHOLDS.GAMING.gamingKeyRatio) {
      if (stats.total >= this.THRESHOLDS.GAMING.minKeys) {
        detectedPattern = BehaviorPattern.GAMING
      }
    }

    // 工作模式判断
    if (!detectedPattern && (appCategory === 'work' || stats.shortcutRatio >= this.THRESHOLDS.WORK.shortcutRatio)) {
      if (stats.total >= this.THRESHOLDS.WORK.minKeys) {
        detectedPattern = BehaviorPattern.WORK
      }
    }

    // 摸鱼模式判断
    if (!detectedPattern && (appCategory === 'chat' || appCategory === 'browser')) {
      if (stats.letterRatio >= this.THRESHOLDS.SLACK.letterRatio &&
          stats.shortcutRatio <= this.THRESHOLDS.SLACK.shortcutRatio &&
          stats.total >= this.THRESHOLDS.SLACK.minKeys) {
        detectedPattern = BehaviorPattern.SLACK
      }
    }

    // 纯按键模式判断（当窗口信息不可用或模糊时）
    if (!detectedPattern) {
      if (stats.gamingKeyRatio >= this.THRESHOLDS.GAMING.gamingKeyRatio &&
          stats.total >= this.THRESHOLDS.GAMING.minKeys) {
        detectedPattern = BehaviorPattern.GAMING
      } else if (stats.shortcutRatio >= this.THRESHOLDS.WORK.shortcutRatio &&
                 stats.total >= this.THRESHOLDS.WORK.minKeys) {
        detectedPattern = BehaviorPattern.WORK
      } else if (stats.letterRatio >= this.THRESHOLDS.SLACK.letterRatio &&
                 stats.shortcutRatio <= this.THRESHOLDS.SLACK.shortcutRatio &&
                 stats.total >= this.THRESHOLDS.SLACK.minKeys) {
        detectedPattern = BehaviorPattern.SLACK
      }
    }

    // 默认为空闲
    if (!detectedPattern) {
      detectedPattern = BehaviorPattern.IDLE
    }

    // 切换模式
    this.switchPattern(detectedPattern, now)
  }

  /**
   * 切换行为模式
   */
  private switchPattern(newPattern: BehaviorPattern, timestamp: number): void {
    if (this.currentPattern === newPattern) {
      return // 模式没有变化
    }

    // 保存上一个模式的统计
    const previousStats: PatternStats = {
      pattern: this.currentPattern,
      startTime: this.currentPatternStartTime,
      endTime: timestamp,
      duration: timestamp - this.currentPatternStartTime,
      keyCount: this.currentPatternKeyCount,
      appName: this.currentAppName
    }

    this.patternHistory.push(previousStats)

    // 限制历史记录大小（保留最近100条）
    if (this.patternHistory.length > 100) {
      this.patternHistory.shift()
    }

    // 切换到新模式
    const windowInfo = this.getWindowInfo()
    this.currentPattern = newPattern
    this.currentPatternStartTime = timestamp
    this.currentPatternKeyCount = 0
    this.currentAppName = windowInfo?.appName || ''

    console.log(`[PatternEngine] Pattern changed: ${previousStats.pattern} -> ${newPattern}, duration: ${previousStats.duration}ms`)

    // 触发回调
    if (this.onPatternChangeCallback) {
      this.onPatternChangeCallback(newPattern, previousStats)
    }
  }

  /**
   * 获取当前行为模式
   */
  getCurrentPattern(): BehaviorPattern {
    return this.currentPattern
  }

  /**
   * 获取当前模式统计
   */
  getCurrentStats(): PatternStats {
    return {
      pattern: this.currentPattern,
      startTime: this.currentPatternStartTime,
      endTime: Date.now(),
      duration: Date.now() - this.currentPatternStartTime,
      keyCount: this.currentPatternKeyCount,
      appName: this.currentAppName
    }
  }

  /**
   * 获取模式历史
   */
  getPatternHistory(): PatternStats[] {
    return [...this.patternHistory]
  }

  /**
   * 获取今日模式汇总
   */
  getTodayPatternSummary(): PatternSummary {
    const todayStart = new Date().setHours(0, 0, 0, 0)

    // 合并历史记录和当前模式
    const allStats = [
      ...this.patternHistory,
      this.getCurrentStats()
    ].filter(stat => stat.endTime >= todayStart)

    const totalDuration = allStats.reduce((sum, stat) => sum + stat.duration, 0)

    const workDuration = allStats
      .filter(stat => stat.pattern === BehaviorPattern.WORK)
      .reduce((sum, stat) => sum + stat.duration, 0)

    const slackDuration = allStats
      .filter(stat => stat.pattern === BehaviorPattern.SLACK)
      .reduce((sum, stat) => sum + stat.duration, 0)

    const gamingDuration = allStats
      .filter(stat => stat.pattern === BehaviorPattern.GAMING)
      .reduce((sum, stat) => sum + stat.duration, 0)

    const idleDuration = allStats
      .filter(stat => stat.pattern === BehaviorPattern.IDLE)
      .reduce((sum, stat) => sum + stat.duration, 0)

    const total = totalDuration || 1 // 避免除以0

    return {
      work: {
        duration: workDuration,
        percentage: Math.round((workDuration / total) * 100)
      },
      slack: {
        duration: slackDuration,
        percentage: Math.round((slackDuration / total) * 100)
      },
      gaming: {
        duration: gamingDuration,
        percentage: Math.round((gamingDuration / total) * 100)
      },
      idle: {
        duration: idleDuration,
        percentage: Math.round((idleDuration / total) * 100)
      }
    }
  }

  /**
   * 检测工作时间摸鱼
   */
  detectSlackDuringWork(): {
    isAbnormal: boolean
    slackDuration: number
    workDuration: number
    suggestion: string
  } {
    const summary = this.getTodayPatternSummary()
    const workHours = 8 * 60 * 60 * 1000 // 8小时（毫秒）

    // 假设工作时间内，摸鱼超过2小时为异常
    const isAbnormal = summary.slack.duration > 2 * 60 * 60 * 1000 &&
                       summary.work.duration < workHours * 0.5

    let suggestion = ''
    if (isAbnormal) {
      suggestion = '工作时间摸鱼时间过长，建议专注于工作'
    } else if (summary.slack.duration > 1 * 60 * 60 * 1000) {
      suggestion = '适当休息有助于提高效率，但注意控制时间'
    } else {
      suggestion = '工作状态良好，保持专注'
    }

    return {
      isAbnormal,
      slackDuration: summary.slack.duration,
      workDuration: summary.work.duration,
      suggestion
    }
  }

  /**
   * 分析游戏对工作效率的影响
   */
  analyzeGamingImpact(): {
    gamingTime: number
    postGamingEfficiency: number
    recommendation: string
  } {
    const summary = this.getTodayPatternSummary()
    const gamingTime = summary.gaming.duration

    // 查找游戏后的工作模式
    let postGamingWorkTime = 0
    let postGamingTotalTime = 0

    for (let i = 0; i < this.patternHistory.length - 1; i++) {
      if (this.patternHistory[i].pattern === BehaviorPattern.GAMING) {
        // 检查游戏后的下一个模式
        const nextPattern = this.patternHistory[i + 1]
        postGamingTotalTime += nextPattern.duration
        if (nextPattern.pattern === BehaviorPattern.WORK) {
          postGamingWorkTime += nextPattern.duration
        }
      }
    }

    const efficiency = postGamingTotalTime > 0
      ? (postGamingWorkTime / postGamingTotalTime) * 100
      : 100

    let recommendation = ''
    if (gamingTime > 3 * 60 * 60 * 1000) {
      recommendation = '游戏时间过长，可能影响工作效率和身体健康，建议适度游戏'
    } else if (efficiency < 50 && gamingTime > 0) {
      recommendation = '游戏后工作效率较低，建议游戏后适当休息再开始工作'
    } else if (gamingTime > 0) {
      recommendation = '游戏时间适中，且能保持良好的工作状态'
    } else {
      recommendation = '今日无游戏记录，专注于工作'
    }

    return {
      gamingTime,
      postGamingEfficiency: Math.round(efficiency),
      recommendation
    }
  }

  /**
   * 重置引擎状态
   */
  reset(): void {
    this.window = []
    this.currentPattern = BehaviorPattern.IDLE
    this.currentPatternStartTime = Date.now()
    this.currentPatternKeyCount = 0
    this.currentAppName = ''
    this.patternHistory = []
    this.lastCheckTime = Date.now()
  }
}

// 导出单例实例
export const patternEngine = new PatternEngine()
