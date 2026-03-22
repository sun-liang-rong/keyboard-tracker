// window_observer.mm
// macOS 窗口监听工具 - 使用 NSWorkspace
// 编译命令: clang++ -framework Cocoa window_observer.mm -o window_observer-mac

#import <Cocoa/Cocoa.h>
#import <Foundation/Foundation.h>
#include <iostream>
#include <csignal>
#include <cstring>

// 全局变量，用于控制程序退出
volatile sig_atomic_t shouldExit = 0;

// 信号处理函数
void signalHandler(int sig) {
    shouldExit = 1;
}

// 获取当前活跃窗口信息并输出
void checkActiveWindow() {
    @autoreleasepool {
        // 获取当前活跃应用
        NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
        NSRunningApplication *activeApp = [workspace frontmostApplication];

        if (!activeApp) {
            return;
        }

        NSString *appName = [activeApp localizedName] ?: @"Unknown";
        NSString *bundleIdentifier = [activeApp bundleIdentifier] ?: @"";

        // 尝试获取当前窗口标题（需要辅助功能权限）
        NSString *windowTitle = @"";

        // 使用 AX API 获取窗口标题
        AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
        AXUIElementRef frontAppElement = NULL;
        AXUIElementRef frontWindow = NULL;
        CFStringRef windowTitleRef = NULL;

        // 获取当前焦点应用
        AXError result = AXUIElementCopyAttributeValue(systemWideElement,
                                                       kAXFocusedApplicationAttribute,
                                                       (CFTypeRef*)&frontAppElement);

        if (result == kAXErrorSuccess && frontAppElement) {
            // 获取焦点窗口
            result = AXUIElementCopyAttributeValue(frontAppElement,
                                                   kAXFocusedWindowAttribute,
                                                   (CFTypeRef*)&frontWindow);

            if (result == kAXErrorSuccess && frontWindow) {
                // 获取窗口标题
                result = AXUIElementCopyAttributeValue(frontWindow,
                                                       kAXTitleAttribute,
                                                       (CFTypeRef*)&windowTitleRef);

                if (result == kAXErrorSuccess && windowTitleRef) {
                    windowTitle = (__bridge NSString *)windowTitleRef;
                }
            }
        }

        // 清理
        if (windowTitleRef) CFRelease(windowTitleRef);
        if (frontWindow) CFRelease(frontWindow);
        if (frontAppElement) CFRelease(frontAppElement);
        if (systemWideElement) CFRelease(systemWideElement);

        // 获取当前时间戳
        NSTimeInterval timestamp = [[NSDate date] timeIntervalSince1970] * 1000;
        long long ts = (long long)timestamp;

        // 构建 JSON 输出
        // 转义字符串中的特殊字符
        NSString *escapedAppName = [appName stringByReplacingOccurrencesOfString:@"\\" withString:@"\\"];
        escapedAppName = [escapedAppName stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""];
        escapedAppName = [escapedAppName stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        escapedAppName = [escapedAppName stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];

        NSString *escapedWindowTitle = [windowTitle stringByReplacingOccurrencesOfString:@"\\" withString:@"\\"];
        escapedWindowTitle = [escapedWindowTitle stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""];
        escapedWindowTitle = [escapedWindowTitle stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
        escapedWindowTitle = [escapedWindowTitle stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];

        NSString *jsonString = [NSString stringWithFormat:@"{\"appName\":\"%@\",\"bundleId\":\"%@\",\"windowTitle\":\"%@\",\"timestamp\":%lld}",
                                escapedAppName, bundleIdentifier, escapedWindowTitle, ts];

        std::cout << "WINDOW:" << [jsonString UTF8String] << std::endl;
        std::flush(std::cout);
    }
}

// 应用切换通知回调
void activeApplicationChanged(NSNotification *notification) {
    checkActiveWindow();
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // 设置信号处理
        signal(SIGINT, signalHandler);
        signal(SIGTERM, signalHandler);

        // 检查辅助功能权限
        bool hasAccessibilityAccess = AXIsProcessTrustedWithOptions(NULL);
        if (!hasAccessibilityAccess) {
            std::cerr << "WARNING: 未授予辅助功能权限，窗口标题可能无法获取" << std::endl;
        }

        // 获取 NSWorkspace 通知中心
        NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
        NSNotificationCenter *notificationCenter = [workspace notificationCenter];

        // 注册应用激活通知
        [notificationCenter addObserverForName:NSWorkspaceDidActivateApplicationNotification
                                        object:nil
                                         queue:nil
                                    usingBlock:^(NSNotification *notification) {
            activeApplicationChanged(notification);
        }];

        // 输出就绪信号
        std::cout << "READY" << std::endl;
        std::flush(std::cout);

        // 输出初始窗口信息
        checkActiveWindow();

        // 保持运行，每秒检查一次（作为备选）
        while (!shouldExit) {
            [[NSRunLoop currentRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:1.0]];
        }

        // 移除观察者
        [notificationCenter removeObserver:nil
                                      name:NSWorkspaceDidActivateApplicationNotification
                                    object:nil];
    }

    return 0;
}
