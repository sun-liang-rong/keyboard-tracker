; window_tracker.ahk
; Windows 窗口监听工具 - AutoHotkey v2 脚本
; 编译命令: Ahk2Exe.exe /in window_tracker.ahk /out window_tracker-win.exe

#NoTrayIcon
#Persistent
#SingleInstance Force

#WinActivateForce

; 全局变量存储上一个窗口
lastWindow := ""

; 发送窗口信息的函数
SendWindowInfo(appName, windowTitle) {
    ; 获取当前时间戳（毫秒级 Unix 时间戳）
    timestamp := GetUnixTimestamp()

    ; 转义特殊字符
    appName := StrReplace(appName, "\", "\\")
    appName := StrReplace(appName, """", "\\""")
    appName := StrReplace(appName, "`n", "\\n")
    appName := StrReplace(appName, "`r", "\\r")

    windowTitle := StrReplace(windowTitle, "\", "\\")
    windowTitle := StrReplace(windowTitle, """", "\\""")
    windowTitle := StrReplace(windowTitle, "`n", "\\n")
    windowTitle := StrReplace(windowTitle, "`r", "\\r")

    ; 构建 JSON 并输出
    jsonString := "{`"appName`":`"" . appName . "`",`"windowTitle`":`"" . windowTitle . "`",`"timestamp`":" . timestamp . "}"
    FileAppend("WINDOW:" . jsonString . "`n", "*", "UTF-8")
}

; 获取 Unix 时间戳（毫秒）
GetUnixTimestamp() {
    ; 使用 A_NowUTC 和 DateDiff 计算 Unix 时间戳
    utcNow := A_NowUTC
    ; 从 1970-01-01 到现在的秒数
    seconds := DateDiff(utcNow, "19700101000000", "Seconds")
    ; 转换为毫秒并添加毫秒部分
    return seconds * 1000 + A_MSec
}

; 获取当前活跃窗口信息
GetActiveWindowInfo() {
    ; 获取窗口标题
    windowTitle := WinGetTitle("A")

    ; 获取进程名
    try {
        appName := WinGetProcessName("A")
    } catch {
        appName := "Unknown"
    }

    return { appName: appName, windowTitle: windowTitle }
}

; 检查窗口变化
CheckWindowChange() {
    global lastWindow

    info := GetActiveWindowInfo()
    currentWindow := info.appName . "|" . info.windowTitle

    ; 如果窗口变化了，发送新窗口信息
    if (currentWindow != lastWindow) {
        lastWindow := currentWindow
        SendWindowInfo(info.appName, info.windowTitle)
    }
}

; 注册窗口焦点变化监听
OnMessage(0x0004, "WM_ACTIVATEAPP")  ; WM_ACTIVATEAPP

WM_ACTIVATEAPP(wParam, lParam, msg, hwnd) {
    if (wParam = 1) {  ; 应用被激活
        SetTimer(CheckWindowChange, -100)  ; 延迟 100ms 检查
    }
}

; 定时检查窗口变化（作为备选，每 500ms 检查一次）
SetTimer(CheckWindowChange, 500)

; 输出就绪信号
FileAppend("READY`n", "*", "UTF-8")

; 发送初始窗口信息
Sleep(100)
CheckWindowChange()

; 保持脚本运行
return
