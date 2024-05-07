import { app, ipcMain, dialog, shell, BrowserWindow } from "electron";
import { initMain } from "./main_modules/initMain.js";
import { config, onUpdateConfig, loadUserConfig } from "./main_modules/config.js";
import { Logs } from "./main_modules/logs.js";
import { addMsgTail } from "./main_modules/addMsgTail.js";
import { preventEscape } from "./main_modules/preventEscape.js";
import { replaceMiniAppArk } from "./main_modules/replaceMiniAppArk.js";
import { keywordReminder } from "./main_modules/keywordReminder.js";

// 导入独立功能模块
import "./main_modules/wallpaper.js";
import "./main_modules/initStyle.js";
import "./main_modules/getFonts.js";
import "./main_modules/localEmoticons.js";
import "./main_modules/getWebPreview.js";

const log = new Logs("main");
/**
 * 是否已经初始化
 */
let init = false;

/**
 * 处理当浏览器窗口被创建的事件。
 *
 * @param {BrowserWindow} window - 浏览器窗口对象。
 * @return {void} 此函数不返回任何内容。
 */
function onBrowserWindowCreated(window) {
  try {
    proxyIpcMessage(window);
    proxySend(window);
    preventEscape(window);
  } catch (err) {
    log("出现错误", err);
  }
}

/**
 * 将给定 Electron 浏览器窗口的 IPC 消息事件代理到添加自定义行为。
 *
 * @param {Electron.BrowserWindow} window - 要代理其 IPC 消息事件的浏览器窗口。
 * @return {void} 此函数不返回任何内容。
 */
function proxyIpcMessage(window) {
  const ipc_message_proxy = window.webContents._events["-ipc-message"]?.[0] || window.webContents._events["-ipc-message"];
  const proxyIpcMsg = new Proxy(ipc_message_proxy, {
    apply(target, thisArg, args) {
      addMsgTail(args);
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
 * 复写并监听给定 Electron 浏览器窗口中的 IPC 通信内容。
 *
 * @param {Electron.BrowserWindow} window - 要代理 IPC 消息事件的浏览器窗口。
 * @return {void} 此函数不返回任何内容。
 */
function proxySend(window) {
  // 复写并监听ipc通信内容
  const originalSend = window.webContents.send;
  window.webContents.send = (...args) => {
    if (init) {
      try {
        replaceMiniAppArk(args);
        keywordReminder(args);
      } catch (err) {
        log("出现错误", err);
      }
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
