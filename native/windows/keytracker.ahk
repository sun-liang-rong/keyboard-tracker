; keytracker.ahk
; Windows 键盘监听工具 - AutoHotkey v2 脚本
; 编译命令: Ahk2Exe.exe /in keytracker.ahk /out keytracker-win.exe

#NoTrayIcon
#Persistent
#SingleInstance Force

; 隐藏窗口
#WinActivateForce

; 发送按键信息的函数
SendKey(category, keyName) {
    FileAppend("KEYDOWN:" . category . ":" . keyName . "`n", "*", "UTF-8")
}

; 发送组合键信息的函数
SendCombo(comboName) {
    FileAppend("COMBO:" . comboName . "`n", "*", "UTF-8")
}

; ========== 组合键监听 ==========

; 复制粘贴相关
~^c::SendCombo("COPY")
~^v::SendCombo("PASTE")
~^x::SendCombo("CUT")
~^a::SendCombo("SELECT_ALL")
~^z::SendCombo("UNDO")
~^+z::SendCombo("REDO")
~^s::SendCombo("SAVE")
~^f::SendCombo("FIND")
~^p::SendCombo("PRINT")
~^n::SendCombo("NEW")
~^o::SendCombo("OPEN")
~^w::SendCombo("CLOSE_TAB")
~^t::SendCombo("NEW_TAB")
~^+t::SendCombo("REOPEN_TAB")
~^Tab::SendCombo("NEXT_TAB")
~^+Tab::SendCombo("PREV_TAB")

; Alt 组合键
~!Tab::SendCombo("SWITCH_APP")
~!F4::SendCombo("CLOSE_WINDOW")
~!Enter::SendCombo("ALT_ENTER")

; Win 组合键
~#d::SendCombo("SHOW_DESKTOP")
~#e::SendCombo("OPEN_EXPLORER")
~#r::SendCombo("RUN_DIALOG")
~#l::SendCombo("LOCK_SCREEN")
~#Tab::SendCombo("TASK_VIEW")
~#+s::SendCombo("SNIPPING_TOOL")

; Ctrl+Shift 组合
~^+Esc::SendCombo("TASK_MANAGER")
~^+n::SendCombo("NEW_FOLDER")

; ========== 单个按键监听 ==========

; 字母键 A-Z
~*a::SendKey("letter", "a")
~*b::SendKey("letter", "b")
~*c::SendKey("letter", "c")
~*d::SendKey("letter", "d")
~*e::SendKey("letter", "e")
~*f::SendKey("letter", "f")
~*g::SendKey("letter", "g")
~*h::SendKey("letter", "h")
~*i::SendKey("letter", "i")
~*j::SendKey("letter", "j")
~*k::SendKey("letter", "k")
~*l::SendKey("letter", "l")
~*m::SendKey("letter", "m")
~*n::SendKey("letter", "n")
~*o::SendKey("letter", "o")
~*p::SendKey("letter", "p")
~*q::SendKey("letter", "q")
~*r::SendKey("letter", "r")
~*s::SendKey("letter", "s")
~*t::SendKey("letter", "t")
~*u::SendKey("letter", "u")
~*v::SendKey("letter", "v")
~*w::SendKey("letter", "w")
~*x::SendKey("letter", "x")
~*y::SendKey("letter", "y")
~*z::SendKey("letter", "z")

; 数字键 0-9
~*0::SendKey("number", "0")
~*1::SendKey("number", "1")
~*2::SendKey("number", "2")
~*3::SendKey("number", "3")
~*4::SendKey("number", "4")
~*5::SendKey("number", "5")
~*6::SendKey("number", "6")
~*7::SendKey("number", "7")
~*8::SendKey("number", "8")
~*9::SendKey("number", "9")

; 功能键 F1-F12
~*F1::SendKey("function", "F1")
~*F2::SendKey("function", "F2")
~*F3::SendKey("function", "F3")
~*F4::SendKey("function", "F4")
~*F5::SendKey("function", "F5")
~*F6::SendKey("function", "F6")
~*F7::SendKey("function", "F7")
~*F8::SendKey("function", "F8")
~*F9::SendKey("function", "F9")
~*F10::SendKey("function", "F10")
~*F11::SendKey("function", "F11")
~*F12::SendKey("function", "F12")

; 控制键
~*Space::SendKey("control", "Space")
~*Enter::SendKey("control", "Enter")
~*Return::SendKey("control", "Enter")
~*Tab::SendKey("control", "Tab")
~*Backspace::SendKey("control", "Backspace")
~*Delete::SendKey("control", "Delete")
~*Escape::SendKey("control", "Escape")
~*Insert::SendKey("control", "Insert")
~*Home::SendKey("control", "Home")
~*End::SendKey("control", "End")
~*PgUp::SendKey("control", "PageUp")
~*PgDn::SendKey("control", "PageDown")
~*Up::SendKey("control", "Up")
~*Down::SendKey("control", "Down")
~*Left::SendKey("control", "Left")
~*Right::SendKey("control", "Right")
~*NumLock::SendKey("control", "NumLock")

; Numpad 数字
~*Numpad0::SendKey("number", "Numpad0")
~*Numpad1::SendKey("number", "Numpad1")
~*Numpad2::SendKey("number", "Numpad2")
~*Numpad3::SendKey("number", "Numpad3")
~*Numpad4::SendKey("number", "Numpad4")
~*Numpad5::SendKey("number", "Numpad5")
~*Numpad6::SendKey("number", "Numpad6")
~*Numpad7::SendKey("number", "Numpad7")
~*Numpad8::SendKey("number", "Numpad8")
~*Numpad9::SendKey("number", "Numpad9")

; Numpad 其他键
~*NumpadDot::SendKey("control", "NumpadDecimal")
~*NumpadDiv::SendKey("control", "NumpadDivide")
~*NumpadMult::SendKey("control", "NumpadMultiply")
~*NumpadAdd::SendKey("control", "NumpadPlus")
~*NumpadSub::SendKey("control", "NumpadMinus")
~*NumpadEnter::SendKey("control", "NumpadEnter")

; 符号键
~*`::SendKey("symbol", "`")
~*-::SendKey("symbol", "-")
~*=::SendKey("symbol", "=")
~*[::SendKey("symbol", "[")
~*]::SendKey("symbol", "]")
~*\::SendKey("symbol", "\")
~*;::SendKey("symbol", ";")
~*'::SendKey("symbol", "'")
~*,::SendKey("symbol", ",")
~*.::SendKey("symbol", ".")
~*/::SendKey("symbol", "/")

; 符号键 (Shift组合)
~*+::SendKey("symbol", "+")
~*_::SendKey("symbol", "_")
~*!::SendKey("symbol", "!")
~*@::SendKey("symbol", "@")
~*#::SendKey("symbol", "#")
~*$::SendKey("symbol", "$")
~*%::SendKey("symbol", "%")
~*^::SendKey("symbol", "^")
~*&::SendKey("symbol", "&")
~*(::SendKey("symbol", "(")
~*)::SendKey("symbol", ")")
~*<::SendKey("symbol", "<")
~*>::SendKey("symbol", ">")
~*?::SendKey("symbol", "?")
~*:::SendKey("symbol", ":")
~*"::SendKey("symbol", '"')
~*{::SendKey("symbol", "{")
~*}::SendKey("symbol", "}")
~*|::SendKey("symbol", "|")
~*~::SendKey("symbol", "~")

; 修饰键 (可选，通常不计入主要统计)
~*LShift::SendKey("modifier", "LShift")
~*RShift::SendKey("modifier", "RShift")
~*LCtrl::SendKey("modifier", "LControl")
~*RCtrl::SendKey("modifier", "RControl")
~*LAlt::SendKey("modifier", "LAlt")
~*RAlt::SendKey("modifier", "RAlt")
~*LWin::SendKey("modifier", "LWin")
~*RWin::SendKey("modifier", "RWin")
~*CapsLock::SendKey("modifier", "CapsLock")

; 输出就绪信号
FileAppend("READY`n", "*", "UTF-8")

; 保持脚本运行
return
