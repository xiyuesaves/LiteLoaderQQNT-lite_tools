// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("lite_tools", {
  // 设置界面打开，动态获取侧边栏数据
  optionsOpen: (callback) => ipcRenderer.on("LiteLoader.lite_tools.optionsOpen", callback),
  // 更新样式信息
  updateStyle: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateStyle", callback),
  // 更新全局样式
  updateGlobalStyle: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateGlobalStyle", callback),
  // 更新配置信息
  updateOptions: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateOptions", callback),
  // 消息窗口向主进程发送侧边栏按钮信息
  sendSidebar: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendSidebar", list),
  // 设置窗口向主进程请求消息窗口侧边栏按钮信息
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  // 消息窗口向主进程发送输入框上方功能列表
  sendTextAreaList: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendTextAreaList", list),
  // 获取和更新配置文件
  config: (options) => ipcRenderer.invoke("LiteLoader.lite_tools.config", options),
  // 渲染进程准备完毕
  getStyle: () => ipcRenderer.invoke("LiteLoader.lite_tools.getStyle"),
  // 打开选择背景图片窗口
  openSelectBackground: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectBackground"),
  // 获取main进程http端口
  getPort: () => ipcRenderer.invoke("LiteLoader.lite_tools.getPort"),
  // 在浏览器打开页面
  openWeb: (url) => ipcRenderer.send("LiteLoader.lite_tools.openWeb", url),
  // 在主进程的终端打印渲染进程日志
  log: (...msg) => ipcRenderer.send("LiteLoader.lite_tools.log", ...msg),
});
