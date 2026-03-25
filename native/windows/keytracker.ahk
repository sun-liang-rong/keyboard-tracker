#Requires AutoHotkey v2.0
; keytracker.ahk - Windows 键盘监听工具
; 简化的可工作版本

#NoTrayIcon
#Persistent
#SingleInstance Force

; 发送按键信息到 stdout
SendKey(category, keyName) {
    timestamp := DateDiff(A_NowUTC, "19700101000000", "Seconds") * 1000 + A_MSec
    FileAppend "KEYDOWN:" . category . ":" . keyName . ":" . timestamp . "`n", "*"
}

SendCombo(comboName) {
    FileAppend "COMBO:" . comboName . "`n", "*"
}

; ========== 组合键监听 ==========
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
~!Tab::SendCombo("SWITCH_APP")
~!F4::SendCombo("CLOSE_WINDOW")
~#d::SendCombo("SHOW_DESKTOP")
~#e::SendCombo("OPEN_EXPLORER")
~#r::SendCombo("RUN_DIALOG")
~#l::SendCombo("LOCK_SCREEN")
~^+Esc::SendCombo("TASK_MANAGER")

; ========== 单个按键监听 ==========
; 字母键 A-Z
~a::SendKey("letter", "a")
~b::SendKey("letter", "b")
~c::SendKey("letter", "c")
~d::SendKey("letter", "d")
~e::SendKey("letter", "e")
~f::SendKey("letter", "f")
~g::SendKey("letter", "g")
~h::SendKey("letter", "h")
~i::SendKey("letter", "i")
~j::SendKey("letter", "j")
~k::SendKey("letter", "k")
~l::SendKey("letter", "l")
~m::SendKey("letter", "m")
~n::SendKey("letter", "n")
~o::SendKey("letter", "o")
~p::SendKey("letter", "p")
~q::SendKey("letter", "q")
~r::SendKey("letter", "r")
~s::SendKey("letter", "s")
~t::SendKey("letter", "t")
~u::SendKey("letter", "u")
~v::SendKey("letter", "v")
~w::SendKey("letter", "w")
~x::SendKey("letter", "x")
~y::SendKey("letter", "y")
~z::SendKey("letter", "z")

; 数字键 0-9
~0::SendKey("number", "0")
~1::SendKey("number", "1")
~2::SendKey("number", "2")
~3::SendKey("number", "3")
~4::SendKey("number", "4")
~5::SendKey("number", "5")
~6::SendKey("number", "6")
~7::SendKey("number", "7")
~8::SendKey("number", "8")
~9::SendKey("number", "9")

; 功能键
~F1::SendKey("function", "F1")
~F2::SendKey("function", "F2")
~F3::SendKey("function", "F3")
~F4::SendKey("function", "F4")
~F5::SendKey("function", "F5")
~F6::SendKey("function", "F6")
~F7::SendKey("function", "F7")
~F8::SendKey("function", "F8")
~F9::SendKey("function", "F9")
~F10::SendKey("function", "F10")
~F11::SendKey("function", "F11")
~F12::SendKey("function", "F12")

; 控制键
~Space::SendKey("control", "Space")
~Enter::SendKey("control", "Enter")
~Tab::SendKey("control", "Tab")
~Backspace::SendKey("control", "Backspace")
~Delete::SendKey("control", "Delete")
~Escape::SendKey("control", "Escape")
~Up::SendKey("control", "Up")
~Down::SendKey("control", "Down")
~Left::SendKey("control", "Left")
~Right::SendKey("control", "Right")

; 符号键
~SC029::SendKey("symbol", "``")
~-::SendKey("symbol", "-")
~=::SendKey("symbol", "=")
~[::SendKey("symbol", "[")
~]::SendKey("symbol", "]")
~\::SendKey("symbol", "\")
~;::SendKey("symbol", ";")
~'::SendKey("symbol", "'")
~,::SendKey("symbol", ",")
~.::SendKey("symbol", ".")
~/::SendKey("symbol", "/")

; 输出就绪信号
FileAppend "READY`n", "*"
