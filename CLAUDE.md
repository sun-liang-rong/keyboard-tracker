# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyboardTracker - 键盘活跃度统计工具

跨平台桌面应用（Windows / macOS），记录键盘使用情况，统计每日/每周/每月敲击次数和时间段分布。

## Tech Stack

- **Framework**: Electron (v29) with vite-plugin-electron
- **Frontend**: Vue 3 + Vite + TypeScript + Tailwind CSS
- **State Management**: Pinia
- **Database**: lowdb (JSON-based local database)
- **Charts**: ECharts (to be integrated)
- **Keyboard Tracking**: Platform-native CLI tools
  - macOS: Quartz/CGEvent (C++ compiled binary)
  - Windows: AutoHotkey (compiled to .exe)

## Project Structure

```
KeyboardTracker/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Main entry, window management
│   │   ├── preload.ts       # IPC bridge between main/renderer
│   │   └── database.ts      # lowdb initialization
│   ├── renderer/            # Vue 3 frontend
│   │   ├── main.ts          # Renderer entry
│   │   ├── App.vue          # Root component
│   │   ├── router/          # Vue Router
│   │   ├── stores/          # Pinia stores
│   │   │   ├── stats.ts     # Statistics state
│   │   │   └── settings.ts  # Settings state
│   │   ├── views/           # Page components
│   │   │   ├── Dashboard.vue
│   │   │   └── Settings.vue
│   │   ├── components/      # Reusable components
│   │   └── style.css        # Tailwind imports
│   └── bin/                 # Compiled native binaries
│       ├── keytracker-mac
│       └── keytracker-win.exe
├── native/                  # Source code for native tools
│   ├── macos/keylogger.mm   # macOS Quartz implementation
│   └── windows/keytracker.ahk # Windows AutoHotkey script
├── public/                  # Static assets
├── index.html              # Renderer HTML template
├── package.json
├── vite.config.ts          # Vite + Electron configuration
├── tailwind.config.js
└── tsconfig.json
```

## Common Commands

```bash
# Install dependencies
npm install

# Development (hot reload for both main and renderer)
npm run dev

# Build for production
npm run build

# Build platform-specific
npm run build:win    # Windows installer
npm run build:mac    # macOS DMG

# Lint
npm run lint
```

## Architecture Notes

### Keyboard Tracking
- Main process spawns native binary via `child_process.spawn()`
- Binary outputs "KEYDOWN" to stdout for each keystroke
- Main process parses stdout and updates statistics
- Platform detection: `process.platform === 'win32'` or `'darwin'`

### Data Flow
1. Native binary captures keystrokes → outputs to stdout
2. Main process reads stdout → updates lowdb database
3. Renderer requests stats via IPC → main process queries lowdb
4. Statistics displayed in Vue components

### Database (lowdb)
- Location: `app.getPath('userData')/keyboard-tracker-db.json`
- Schema: See `src/main/database.ts`
- Auto-saves on write operations

### IPC Channels
- `get-today-stats` - Get today's statistics
- `get-week-stats` - Get weekly statistics
- `get-month-stats` - Get monthly statistics
- `get-settings` - Get application settings
- `save-settings` - Save application settings
- `minimize-window` - Minimize main window
- `close-window` - Close main window
- `keystroke-update` (event) - Real-time keystroke count updates

## Building Native Binaries

### macOS
```bash
cd native/macos
clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac
cp keytracker-mac ../../src/bin/
```

Requires: Xcode Command Line Tools

### Windows
1. Install AutoHotkey v2
2. Use Ahk2Exe to compile:
   ```
   Ahk2Exe.exe /in keytracker.ahk /out keytracker-win.exe
   ```
3. Copy `keytracker-win.exe` to `src/bin/`

## Important Considerations

- **Permissions**: macOS requires Accessibility permission for CGEventTap
- **Security**: Never log actual key content, only count
- **Performance**: Native binaries run in separate process, minimal overhead
- **Data Privacy**: All data stored locally, no cloud upload
