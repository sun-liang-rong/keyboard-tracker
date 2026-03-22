"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 统计数据
  getTodayStats: () => electron.ipcRenderer.invoke("get-today-stats"),
  getWeekStats: () => electron.ipcRenderer.invoke("get-week-stats"),
  getMonthStats: () => electron.ipcRenderer.invoke("get-month-stats"),
  // 设置
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  // 窗口控制
  minimizeWindow: () => electron.ipcRenderer.invoke("minimize-window"),
  closeWindow: () => electron.ipcRenderer.invoke("close-window"),
  // 监听事件
  onKeystrokeUpdate: (callback) => {
    electron.ipcRenderer.on("keystroke-update", (_, count) => callback(count));
  }
});
