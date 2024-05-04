import { app, ipcMain, dialog, shell, BrowserWindow } from "electron";
import { initMain } from "./main_modules/initMain.js";
import { config, onUpdateConfig, loadUserConfig } from "./main_modules/config.js";
import { Logs } from "./main_modules/logs.js";

// 功能模块
import "./main_modules/wallpaper.js";
import "./main_modules/initStyle.js";
import "./main_modules/getFonts.js";

const log = new Logs("main");
/**
 * 是否已经初始化
 */
let init = false;

/**
 * 窗口创建时触发
 * @param {BrowserWindow} window window对象
 */
function onBrowserWindowCreated(window) {
  try {
    proxyIpcMessage(window);
    proxySend(window);
  } catch (err) {
    log("出现错误", err);
  }
}

function proxyIpcMessage(window) {
  const ipc_message_proxy = window.webContents._events["-ipc-message"]?.[0] || window.webContents._events["-ipc-message"];
  const proxyIpcMsg = new Proxy(ipc_message_proxy, {
    apply(target, thisArg, args) {
      return target.apply(thisArg, args);
    },
  });
  if (window.webContents._events["-ipc-message"]?.[0]) {
    window.webContents._events["-ipc-message"][0] = proxyIpcMsg;
  } else {
    window.webContents._events["-ipc-message"] = proxyIpcMsg;
  }
}
/**
 * 重写并监听ipc通信内容的函数。
 *
 * @param {BrowserWindow} window - 窗口对象。
 */
function proxySend(window) {
  // 复写并监听ipc通信内容
  const originalSend = window.webContents.send;
  window.webContents.send = (...args) => {
    if (init) {

    } else {
      if (args?.[2]?.[0]?.cmdName === "nodeIKernelSessionListener/onSessionInitComplete") {
        loadUserConfig(args?.[2]?.[0]?.payload?.uid);
        log("成功读取配置文件");
        initMain();
        init = true;
      }
    }
    originalSend.call(window.webContents, ...args);
  };
}

module.exports = { onBrowserWindowCreated };
