import { ipcMain, shell } from "electron";
import { config, onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("initMain");

function initMain() {
  log("初始化主进程", config);
}

// 通用ipc事件处理

// 打开网址
ipcMain.on("LiteLoader.lite_tools.openWeb", (_, url) => {
  shell.openExternal(url);
});
// 复制文件
ipcMain.handle("LiteLoader.lite_tools.copyFile", async (_, from, to) => {
  return new Promise((res, rej) => {
    fs.copyFile(from, to, (err) => {
      if (err) {
        res(false);
      } else {
        res(true);
      }
    });
  });
});
// 返回窗口id
ipcMain.on("LiteLoader.lite_tools.getWebContentId", (event) => {
  log("获取窗口id", event.sender.id.toString());
  event.returnValue = event.sender.id.toString();
});

// 调试用代码

// 获取本地保存的撤回消息数量
ipcMain.on("LiteLoader.lite_tools.getRecallListNum", (event) => {
  event.returnValue = 123;
});
export { initMain };
