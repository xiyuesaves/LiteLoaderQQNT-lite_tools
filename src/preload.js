// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");

// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("lite_tools", {
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
  openSelectLocalEmoticonsFolder: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectLocalEmoticonsFolder"),
  // 删除本地表情文件
  deleteEmoticonsFile: (path) => ipcRenderer.invoke("LiteLoader.lite_tools.deleteEmoticonsFile", path),
  // 设置窗口向主进程请求消息窗口侧边栏按钮信息
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  // 获取配置文件
  getOptions: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getOptions"),
  // 更新配置文件
  setOptions: (options) => ipcRenderer.send("LiteLoader.lite_tools.setOptions", options),
  // 获取当前窗口peer
  getPeer: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getPeer"),
  updatePeer: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updatePeer", callback),
  // 获取撤回信息数据
  getMessageRecallId: () => ipcRenderer.invoke("LiteLoader.lite_tools.getMessageRecallId"),
  // 消息窗口向主进程发送输入框上方功能列表
  sendTextAreaList: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendTextAreaList", list),
  // 消息窗口向主进程发送侧边栏按钮信息
  sendSidebar: (list) => ipcRenderer.send("LiteLoader.lite_tools.sendSidebar", list),
  // 打开选择背景图片窗口
  openSelectBackground: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectBackground"),
  // 监听背景数据变化
  onUpdateWallpaper: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateWallpaper", callback),
  // 获取背景数据
  getWallpaper: () => ipcRenderer.invoke("LiteLoader.lite_tools.getWallpaper"),
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
  // 清理本地保存撤回记录
  clearLocalStorageRecallMsg: () => ipcRenderer.send("LiteLoader.lite_tools.clearLocalStorageRecallMsg"),
  // 打开本地撤回数据
  openRecallMsgList: () => ipcRenderer.send("LiteLoader.lite_tools.openRecallMsgList"),
  // 获取所有的撤回消息
  getReacllMsgData: () => ipcRenderer.send("LiteLoader.lite_tools.getReacllMsgData"),
  // 获取所有撤回数据
  onReacllMsgData: (callback) => ipcRenderer.on("LiteLoader.lite_tools.onReacllMsgData", callback),
  // 获取所有的撤回消息数量
  getRecallListNum: () => ipcRenderer.sendSync("LiteLoader.lite_tools.getRecallListNum"),
  // 更新撤回消息数量
  onUpdateRecallListNum: (callback) => ipcRenderer.on("LiteLoader.lite_tools.updateRecallListNum", callback),
  // 跳转到指定聊天对话的指定位置处
  sendToMsg: (sceneData) => ipcRenderer.send("LiteLoader.lite_tools.sendToMsg", sceneData),
  // 通过Uid获取用户信息
  getUserInfo: (uid) => ipcRenderer.invoke("LiteLoader.lite_tools.getUserInfo", uid),
  // 保存blob到本地
  saveBase64ToFile: (...data) => ipcRenderer.send("LiteLoader.lite_tools.saveBase64ToFile", ...data),
  // 选择消息图片默认保存位置
  openSelectDefaultSaveFilePath: () => ipcRenderer.send("LiteLoader.lite_tools.openSelectDefaultSaveFilePath"),
  // 从历史记录中移除指定文件
  deleteCommonlyEmoticons: (path) => ipcRenderer.send("LiteLoader.lite_tools.deleteCommonlyEmoticons", path),
  // 获取系统字体列表
  getSystemFonts: () => ipcRenderer.invoke("LiteLoader.lite_tools.getSystemFonts"),
  // 关键字提醒
  onKeywordReminder: (callback) => ipcRenderer.on("LiteLoader.lite_tools.onKeywordReminder", callback),
  // 复制文件
  copyFile: (...data) => ipcRenderer.invoke("LiteLoader.lite_tools.copyFile", ...data),
  // 获取链接预览数据
  getWebPrevew: (url) => ipcRenderer.invoke("LiteLoader.lite_tools.getWebPrevew", url),
  // 设置窗口图标
  setWindowIcon: (...args) => ipcRenderer.send("LiteLoader.lite_tools.setWindowIcon", ...args),
  /**
   *
   * @param {String} sendEventName 发送事件名称
   * @param {String} cmdName 命令名称
   * @param {Array} args 参数数组
   * @param {Null | Boolean | String | String[]} awaitCallback 是否需要等待回调，如果传入为字符串，则将回调监听事件改为该字符串
   * @param {Boolean} register 注册（未知）
   * @returns
   */
  nativeCall: (sendEventName, cmdName, args, webContentId = 2, awaitCallback = false, register = false) => {
    const callbackId = crypto.randomUUID();
    const eventName = `${sendEventName}-${webContentId}${register ? "-register" : ""}`;
    let resolve;
    if (awaitCallback) {
      resolve = new Promise((res) => {
        function onEvent(event, ...args) {
          if (typeof awaitCallback === "boolean") {
            if (args[0]?.callbackId === callbackId) {
              ipcRenderer.off(`IPC_DOWN_${webContentId}`, onEvent);
              res(args[1]);
            }
          } else if (Array.isArray(awaitCallback)) {
            if (awaitCallback.includes(args?.[1]?.[0]?.cmdName)) {
              ipcRenderer.off(`IPC_DOWN_${webContentId}`, onEvent);
              res(args[1]);
            }
          } else {
            if (args?.[1]?.[0]?.cmdName === awaitCallback) {
              ipcRenderer.off(`IPC_DOWN_${webContentId}`, onEvent);
              res(args[1]);
            }
          }
        }
        ipcRenderer.on(`IPC_DOWN_${webContentId}`, onEvent);
      });
    } else {
      resolve = Promise.resolve(true);
    }
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
    return resolve;
  },
});
