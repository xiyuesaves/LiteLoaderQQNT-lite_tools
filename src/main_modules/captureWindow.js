import { Logs } from "./logs.js";
const log = new Logs("捕获特定窗口模块");

let mainMessage, settingWindow;
function captureWindow(window) {
  // 监听页面加载完成事件
  window.webContents.on("did-stop-loading", () => {
    if (window.webContents.getURL().indexOf("#/main/message") !== -1) {
      log("捕获到主窗口");
      mainMessage = window;
    }
    if (window.webContents.getURL().indexOf("#/setting/settings/common") !== -1) {
      log("捕获到设置口");
      settingWindow = window;
    }
  });
}
export { captureWindow, mainMessage, settingWindow };
