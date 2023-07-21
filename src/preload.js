// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("lite_tools", {
  // 主进程向消息窗口发送
  messageChannel: (callback) => ipcRenderer.on("LiteLoader.lite_tools.messageChannel", callback),
  // 消息窗口向主进程发送侧边栏按钮信息
  sendSidebar: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendSidebar", list),
  // 设置窗口向主进程请求消息窗口侧边栏按钮信息
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  // 获取和更新配置文件
  config: (options) => ipcRenderer.invoke("LiteLoader.lite_tools.config", options),
  // 在主进程的终端打印渲染进程日志
  log: (msg) => ipcRenderer.send("LiteLoader.lite_tools.log", msg),
});
