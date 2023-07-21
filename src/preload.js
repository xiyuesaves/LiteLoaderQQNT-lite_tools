// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("lite_tools", {
  updateSidebar: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateSidebar", callback),
  sendSidebar: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendSidebar", list),
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  config: (options) => ipcRenderer.invoke("LiteLoader.lite_tools.config", options),
  log: (msg) => ipcRenderer.send("LiteLoader.lite_tools.log", msg),
});
