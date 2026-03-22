// keylogger.mm
// macOS 键盘监听工具 - 使用 Quartz / CGEvent
// 编译命令: clang++ -framework CoreGraphics -framework CoreFoundation keylogger.mm -o keytracker-mac

#include <CoreGraphics/CoreGraphics.h>
#include <CoreFoundation/CoreFoundation.h>
#include <iostream>
#include <csignal>
#include <map>
#include <string>

// 全局变量，用于控制程序退出
volatile sig_atomic_t shouldExit = 0;

// 信号处理函数
void signalHandler(int sig) {
    shouldExit = 1;
}

// 按键分类
enum KeyCategory {
    KEY_LETTER,      // 字母键 A-Z
    KEY_NUMBER,      // 数字键 0-9
    KEY_FUNCTION,    // 功能键 F1-F12
    KEY_CONTROL,     // 控制键 (Enter, Space, Tab, etc.)
    KEY_SYMBOL,      // 符号键
    KEY_MODIFIER,    // 修饰键 (Shift, Ctrl, Alt, Cmd)
    KEY_OTHER        // 其他
};

// 获取按键分类名称
const char* getCategoryName(KeyCategory category) {
    switch (category) {
        case KEY_LETTER: return "letter";
        case KEY_NUMBER: return "number";
        case KEY_FUNCTION: return "function";
        case KEY_CONTROL: return "control";
        case KEY_SYMBOL: return "symbol";
        case KEY_MODIFIER: return "modifier";
        default: return "other";
    }
}

// macOS 虚拟键码映射
// 参考: https://developer.apple.com/library/archive/technotes/tn2450/_index.html
struct KeyInfo {
    const char* name;
    KeyCategory category;
};

// 键码映射表 (只包含可打印和常用按键)
std::map<CGKeyCode, KeyInfo> createKeyMap() {
    std::map<CGKeyCode, KeyInfo> map;
    // 字母键 A-Z
    map[0] = {"a", KEY_LETTER};
    map[11] = {"b", KEY_LETTER};
    map[8] = {"c", KEY_LETTER};
    map[2] = {"d", KEY_LETTER};
    map[14] = {"e", KEY_LETTER};
    map[3] = {"f", KEY_LETTER};
    map[5] = {"g", KEY_LETTER};
    map[4] = {"h", KEY_LETTER};
    map[34] = {"i", KEY_LETTER};
    map[38] = {"j", KEY_LETTER};
    map[40] = {"k", KEY_LETTER};
    map[37] = {"l", KEY_LETTER};
    map[46] = {"m", KEY_LETTER};
    map[45] = {"n", KEY_LETTER};
    map[31] = {"o", KEY_LETTER};
    map[35] = {"p", KEY_LETTER};
    map[12] = {"q", KEY_LETTER};
    map[15] = {"r", KEY_LETTER};
    map[1] = {"s", KEY_LETTER};
    map[17] = {"t", KEY_LETTER};
    map[32] = {"u", KEY_LETTER};
    map[9] = {"v", KEY_LETTER};
    map[13] = {"w", KEY_LETTER};
    map[7] = {"x", KEY_LETTER};
    map[16] = {"y", KEY_LETTER};
    map[6] = {"z", KEY_LETTER};

    // 数字键 0-9
    map[29] = {"0", KEY_NUMBER};
    map[18] = {"1", KEY_NUMBER};
    map[19] = {"2", KEY_NUMBER};
    map[20] = {"3", KEY_NUMBER};
    map[21] = {"4", KEY_NUMBER};
    map[23] = {"5", KEY_NUMBER};
    map[22] = {"6", KEY_NUMBER};
    map[26] = {"7", KEY_NUMBER};
    map[28] = {"8", KEY_NUMBER};
    map[25] = {"9", KEY_NUMBER};

    // 功能键 F1-F12
    map[122] = {"F1", KEY_FUNCTION};
    map[120] = {"F2", KEY_FUNCTION};
    map[99] = {"F3", KEY_FUNCTION};
    map[118] = {"F4", KEY_FUNCTION};
    map[96] = {"F5", KEY_FUNCTION};
    map[97] = {"F6", KEY_FUNCTION};
    map[98] = {"F7", KEY_FUNCTION};
    map[100] = {"F8", KEY_FUNCTION};
    map[101] = {"F9", KEY_FUNCTION};
    map[109] = {"F10", KEY_FUNCTION};
    map[103] = {"F11", KEY_FUNCTION};
    map[111] = {"F12", KEY_FUNCTION};

    // 控制键
    map[36] = {"Enter", KEY_CONTROL};
    map[48] = {"Tab", KEY_CONTROL};
    map[49] = {"Space", KEY_CONTROL};
    map[51] = {"Delete", KEY_CONTROL};
    map[117] = {"ForwardDelete", KEY_CONTROL};
    map[53] = {"Escape", KEY_CONTROL};
    map[114] = {"Insert", KEY_CONTROL};
    map[115] = {"End", KEY_CONTROL};
    map[119] = {"Home", KEY_CONTROL};
    map[116] = {"PageUp", KEY_CONTROL};
    map[121] = {"PageDown", KEY_CONTROL};
    map[123] = {"Left", KEY_CONTROL};
    map[124] = {"Right", KEY_CONTROL};
    map[125] = {"Down", KEY_CONTROL};
    map[126] = {"Up", KEY_CONTROL};

    // Numpad数字
    map[82] = {"Numpad0", KEY_NUMBER};
    map[83] = {"Numpad1", KEY_NUMBER};
    map[84] = {"Numpad2", KEY_NUMBER};
    map[85] = {"Numpad3", KEY_NUMBER};
    map[86] = {"Numpad4", KEY_NUMBER};
    map[87] = {"Numpad5", KEY_NUMBER};
    map[88] = {"Numpad6", KEY_NUMBER};
    map[89] = {"Numpad7", KEY_NUMBER};
    map[91] = {"Numpad8", KEY_NUMBER};
    map[92] = {"Numpad9", KEY_NUMBER};

    // 符号键
    map[50] = {"`", KEY_SYMBOL};
    map[27] = {"-", KEY_SYMBOL};
    map[24] = {"=", KEY_SYMBOL};
    map[33] = {"[", KEY_SYMBOL};
    map[30] = {"]", KEY_SYMBOL};
    map[42] = {"\\", KEY_SYMBOL};
    map[41] = {";", KEY_SYMBOL};
    map[39] = {"'", KEY_SYMBOL};
    map[43] = {",", KEY_SYMBOL};
    map[47] = {".", KEY_SYMBOL};
    map[44] = {"/", KEY_SYMBOL};

    // 修饰键
    map[56] = {"Shift", KEY_MODIFIER};
    map[60] = {"Shift", KEY_MODIFIER};
    map[59] = {"Control", KEY_MODIFIER};
    map[62] = {"Control", KEY_MODIFIER};
    map[58] = {"Option", KEY_MODIFIER};
    map[61] = {"Option", KEY_MODIFIER};
    map[55] = {"Command", KEY_MODIFIER};
    map[63] = {"Command", KEY_MODIFIER};
    map[57] = {"CapsLock", KEY_MODIFIER};

    return map;
}

std::map<CGKeyCode, KeyInfo> keyMap = createKeyMap();

// 修饰键状态跟踪
struct ModifierState {
    bool leftShift = false;
    bool rightShift = false;
    bool leftControl = false;
    bool rightControl = false;
    bool leftOption = false;
    bool rightOption = false;
    bool leftCommand = false;
    bool rightCommand = false;
};

ModifierState modifiers;

// 更新修饰键状态
void updateModifierState(CGKeyCode keyCode, bool pressed) {
    switch (keyCode) {
        case 56: modifiers.leftShift = pressed; break;
        case 60: modifiers.rightShift = pressed; break;
        case 59: modifiers.leftControl = pressed; break;
        case 62: modifiers.rightControl = pressed; break;
        case 58: modifiers.leftOption = pressed; break;
        case 61: modifiers.rightOption = pressed; break;
        case 55: modifiers.leftCommand = pressed; break;
        case 63: modifiers.rightCommand = pressed; break;
    }
}

// 检查是否是修饰键
bool isModifierKey(CGKeyCode keyCode) {
    return keyCode == 56 || keyCode == 60 ||  // Shift
           keyCode == 59 || keyCode == 62 ||  // Control
           keyCode == 58 || keyCode == 61 ||  // Option
           keyCode == 55 || keyCode == 63;    // Command
}

// 使用 CGEventGetFlags 实时获取当前修饰键状态
std::string getActiveModifiersStringFromEvent(CGEventRef event) {
    std::string result;
    CGEventFlags flags = CGEventGetFlags(event);

    if (flags & kCGEventFlagMaskControl) result += "Ctrl+";
    if (flags & kCGEventFlagMaskAlternate) result += "Alt+";
    if (flags & kCGEventFlagMaskCommand) result += "Cmd+";
    if (flags & kCGEventFlagMaskShift) result += "Shift+";

    return result;
}

// 获取当前活动的修饰键字符串（从内存状态）
std::string getActiveModifiersString() {
    std::string result;
    if (modifiers.leftControl || modifiers.rightControl) result += "Ctrl+";
    if (modifiers.leftOption || modifiers.rightOption) result += "Alt+";
    if (modifiers.leftCommand || modifiers.rightCommand) result += "Cmd+";
    if (modifiers.leftShift || modifiers.rightShift) result += "Shift+";
    return result;
}

// 识别常见组合键
const char* recognizeCombo(const char* keyName, CGEventRef event) {
    // 使用事件中的实时修饰键状态
    std::string mods = getActiveModifiersStringFromEvent(event);
    if (mods.empty()) return nullptr;

    std::string combo = mods + keyName;

    // 复制粘贴相关
    if (combo == "Cmd+c" || combo == "Ctrl+c") return "COPY";
    if (combo == "Cmd+v" || combo == "Ctrl+v") return "PASTE";
    if (combo == "Cmd+x" || combo == "Ctrl+x") return "CUT";
    if (combo == "Cmd+a" || combo == "Ctrl+a") return "SELECT_ALL";
    if (combo == "Cmd+z" || combo == "Ctrl+z") return "UNDO";
    if (combo == "Cmd+Shift+z" || combo == "Ctrl+Shift+z") return "REDO";
    if (combo == "Cmd+s" || combo == "Ctrl+s") return "SAVE";
    if (combo == "Cmd+f" || combo == "Ctrl+f") return "FIND";
    if (combo == "Cmd+p" || combo == "Ctrl+p") return "PRINT";
    if (combo == "Cmd+n" || combo == "Ctrl+n") return "NEW";
    if (combo == "Cmd+o" || combo == "Ctrl+o") return "OPEN";
    if (combo == "Cmd+w" || combo == "Ctrl+w") return "CLOSE_TAB";
    if (combo == "Cmd+t" || combo == "Ctrl+t") return "NEW_TAB";
    if (combo == "Cmd+Shift+t" || combo == "Ctrl+Shift+t") return "REOPEN_TAB";
    if (combo == "Cmd+Tab" || combo == "Ctrl+Tab") return "NEXT_TAB";
    if (combo == "Cmd+Shift+Tab" || combo == "Ctrl+Shift+Tab") return "PREV_TAB";

    // macOS 特有
    if (combo == "Cmd+q") return "QUIT_APP";
    if (combo == "Cmd+h") return "HIDE_APP";
    if (combo == "Cmd+m") return "MINIMIZE";
    if (combo == "Cmd+Space") return "SPOTLIGHT";

    // 其他常见组合
    if (combo == "Ctrl+Alt+Delete") return "TASK_MANAGER";
    if (combo == "Alt+Tab" || combo == "Cmd+Tab") return "SWITCH_APP";
    if (combo == "Alt+F4") return "CLOSE_WINDOW";

    return nullptr;
}
bool getKeyInfo(CGKeyCode keyCode, const char*& name, KeyCategory& category) {
    auto it = keyMap.find(keyCode);
    if (it != keyMap.end()) {
        name = it->second.name;
        category = it->second.category;
        return true;
    }
    return false;
}

// 键盘事件回调函数
CGEventRef eventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    // 处理修饰键状态变化事件
    if (type == kCGEventFlagsChanged) {
        // 获取按键代码
        CGKeyCode keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
        // 更新修饰键状态 - 根据当前flags状态判断是按下还是释放
        CGEventFlags flags = CGEventGetFlags(event);
        bool isPressed = false;
        switch (keyCode) {
            case 56: // left Shift
            case 60: // right Shift
                isPressed = (flags & kCGEventFlagMaskShift) != 0;
                break;
            case 59: // left Control
            case 62: // right Control
                isPressed = (flags & kCGEventFlagMaskControl) != 0;
                break;
            case 58: // left Option
            case 61: // right Option
                isPressed = (flags & kCGEventFlagMaskAlternate) != 0;
                break;
            case 55: // left Command
            case 63: // right Command
                isPressed = (flags & kCGEventFlagMaskCommand) != 0;
                break;
        }
        updateModifierState(keyCode, isPressed);
        return event;
    }

    // 只处理按键按下事件
    if (type == kCGEventKeyDown) {
        // 使用实时修饰键状态
        std::string mods = getActiveModifiersStringFromEvent(event);

        // 获取按键代码
        CGKeyCode keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);

        // 检查是否是修饰键本身 - 如果不是修饰键才处理
        if (isModifierKey(keyCode)) {
            return event;
        }

        const char* keyName = "unknown";
        KeyCategory category = KEY_OTHER;

        // 查找按键信息
        if (getKeyInfo(keyCode, keyName, category)) {
            // 检查是否是组合键 - 使用实时修饰键状态
            const char* comboName = recognizeCombo(keyName, event);
            if (comboName) {
                // 输出组合键事件
                std::cout << "COMBO:" << comboName << std::endl;
            } else if (!mods.empty()) {
                // 有修饰键按下但不是已知组合
                std::cout << "COMBO:OTHER" << std::endl;
            }

            // 同时输出单个按键事件（带时间戳）
            long long timestamp = (long long)(CFAbsoluteTimeGetCurrent() + kCFAbsoluteTimeIntervalSince1970) * 1000;
            std::cout << "KEYDOWN:" << getCategoryName(category) << ":" << keyName << ":" << timestamp << std::endl;
        } else {
            // 未知按键
            std::cout << "KEYDOWN:other:unknown" << std::endl;
        }
        std::flush(std::cout);
    }
    return event;
}

int main(int argc, const char * argv[]) {
    // 设置信号处理
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);

    // 创建事件掩码，监听按键按下和修饰键变化事件
    CGEventMask eventMask = CGEventMaskBit(kCGEventKeyDown) | CGEventMaskBit(kCGEventFlagsChanged);

    // 创建事件 tap
    CFMachPortRef eventTap = CGEventTapCreate(
        kCGSessionEventTap,           // 监听整个用户会话的事件
        kCGHeadInsertEventTap,        // 将 tap 插入到最前面，确保能拦截到事件
        kCGEventTapOptionListenOnly,  // 仅监听，不拦截事件
        eventMask,                    // 事件掩码
        eventCallback,                // 回调函数
        nullptr                       // 用户数据
    );

    if (!eventTap) {
        std::cerr << "ERROR: 无法创建事件 tap。请确保已授予辅助功能权限。" << std::endl;
        return 1;
    }

    // 创建 run loop source
    CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);

    // 添加到当前 run loop
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);

    // 启用事件 tap
    CGEventTapEnable(eventTap, true);

    // 输出就绪信号
    std::cout << "READY" << std::endl;
    std::flush(std::cout);

    // 运行 run loop
    while (!shouldExit) {
        CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, false);
    }

    // 清理
    CGEventTapEnable(eventTap, false);
    CFRunLoopRemoveSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
    CFRelease(runLoopSource);
    CFRelease(eventTap);

    return 0;
}
