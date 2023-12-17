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
  // 更新设置界面样式
  updateSettingStyle: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateSettingStyle", callback),
  // 更新配置信息
  updateOptions: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateOptions", callback),
  // 撤回事件监听
  onMessageRecall: (callback) => ipcRenderer.on("LiteLoader.lite_tools.onMessageRecall", callback),
  // 监听本地表情更新
  updateEmoticons: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateEmoticons", callback),
  // 监听常用表情列表更新
  updateLocalEmoticonsConfig: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateLocalEmoticonsConfig", callback),
  // 主动获取本地表情列表
  getLocalEmoticonsList: () => ipcRenderer.invoke("LiteLoader.lite_tools.getLocalEmoticonsList"),
  // 主动获取常用表情列表
  getLocalEmoticonsConfig: () => ipcRenderer.invoke("LiteLoader.lite_tools.getLocalEmoticonsConfig"),
  // 打开选择本地表情文件夹窗口
  openSelectFolder: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectFolder"),
  // 设置窗口向主进程请求消息窗口侧边栏按钮信息
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  // 获取配置文件
  getOptions: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getOptions"),
  // 更新配置文件
  setOptions: (options) => ipcRenderer.send("LiteLoader.lite_tools.setOptions", options),
  // 获取背景样式
  getStyle: () => ipcRenderer.invoke("LiteLoader.lite_tools.getStyle"),
  // 获取全局样式
  getGlobalStyle: () => ipcRenderer.invoke("LiteLoader.lite_tools.getGlobalStyle"),
  // 获取当前窗口peer
  getPeer: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getPeer"),
  // 获取撤回信息数据
  getMessageRecallId: () => ipcRenderer.invoke("LiteLoader.lite_tools.getMessageRecallId"),
  // 消息窗口向主进程发送输入框上方功能列表
  sendTextAreaList: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendTextAreaList", list),
  // 打开选择背景图片窗口
  openSelectBackground: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectBackground"),
  // 消息窗口向主进程发送侧边栏按钮信息
  sendSidebar: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendSidebar", list),
  // 聊天窗口顶部功能列表
  sendChatTopList: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendChatTopList", list),
  // 在浏览器打开页面
  openWeb: (url) => ipcRenderer.send("LiteLoader.lite_tools.openWeb", url),
  // 在主进程的终端打印渲染进程日志
  log: (...msg) => ipcRenderer.send("LiteLoader.lite_tools.log", ...msg),
  // 更新常用表情列表
  addCommonlyEmoticons: (src) => ipcRenderer.send("LiteLoader.lite_tools.addCommonlyEmoticons", src),
  // 获取窗口Id
  getWebContentId: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getWebContentId"),
  // 打开文件路径
  openFolder: (path) => ipcRenderer.send("LiteLoader.lite_tools.openFolder", path),
  // 打开文件
  openFile: (path) => ipcRenderer.send("LiteLoader.lite_tools.openFile", path),
  // 从历史记录中移除指定文件
  deleteCommonlyEmoticons: (path) => ipcRenderer.send("LiteLoader.lite_tools.deleteCommonlyEmoticons", path),
  /**
   *
   * @param {String} sendEventName 发送事件名称
   * @param {String} cmdName 命令名称
   * @param {Array} args 参数数组
   * @param {Boolean} awaitCallback 是否需要等待回调
   * @param {Boolean} register 注册（未知）
   * @returns
   */
  nativeCall: (sendEventName, cmdName, args, webContentId = 2, awaitCallback = false, register = false) => {
    const callbackId = crypto.randomUUID();
    const eventName = `${sendEventName}-${webContentId}${register ? "-register" : ""}`;
    // 发送事件
    ipcRenderer.send(
      `IPC_UP_${webContentId}`,
      {
        type: "request",
        callbackId,
        eventName,
      },
      [cmdName, ...args],
    );
    if (awaitCallback) {
      return new Promise((res) => {
        ipcRenderer.on(`IPC_DOWN_${webContentId}`, function (event, ...args) {
          if (args[0]?.callbackId === callbackId) {
            res(args[1]);
            ipcRenderer.removeListener(`IPC_DOWN_${webContentId}`, this);
          }
        });
      });
    } else {
      return true;
    }
  },
});
