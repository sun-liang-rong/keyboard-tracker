"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const url = require("url");
const path = require("path");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("index.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
class KeyboardTracker {
  constructor() {
    __publicField(this, "mainWindow", null);
    __publicField(this, "floatingWindow", null);
    __publicField(this, "tray", null);
    this.initApp();
  }
  initApp() {
    electron.app.whenReady().then(() => {
      this.createMainWindow();
      this.createTray();
      this.registerIPC();
    });
    electron.app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        electron.app.quit();
      }
    });
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
  createMainWindow() {
    this.mainWindow = new electron.BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      titleBarStyle: "hiddenInset",
      webPreferences: {
        preload: path.join(__dirname$1, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname$1, "../renderer/index.html"));
    }
  }
  createTray() {
    this.tray = new electron.Tray(path.join(__dirname$1, "../../public/icon.png"));
    const contextMenu = electron.Menu.buildFromTemplate([
      { label: "显示主界面", click: () => this.showMainWindow() },
      { label: "今日统计", enabled: false },
      { type: "separator" },
      { label: "退出", click: () => electron.app.quit() }
    ]);
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip("KeyboardTracker");
  }
  showMainWindow() {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }
  registerIPC() {
    electron.ipcMain.handle("get-today-stats", async () => {
      return { count: 0 };
    });
  }
}
new KeyboardTracker();
