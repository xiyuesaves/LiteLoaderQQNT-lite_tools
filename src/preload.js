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
  // 设置窗口向主进程请求消息窗口侧边栏按钮信息
  getSidebar: (msg) => ipcRenderer.invoke("LiteLoader.lite_tools.getSidebar", msg),
  // 获取和更新配置文件
  config: (options) => ipcRenderer.invoke("LiteLoader.lite_tools.config", options),
  // 获取背景样式
  getStyle: () => ipcRenderer.invoke("LiteLoader.lite_tools.getStyle"),
  // 获取全局样式
  getGlobalStyle: () => ipcRenderer.invoke("LiteLoader.lite_tools.getGlobalStyle"),
  // 获取消息id对应时间
  getMsgIdAndTime: () => ipcRenderer.invoke("LiteLoader.lite_tools.getMsgIdAndTime"),
  // 获取消息id对应Uid
  getMsgIdAndUid: () => ipcRenderer.invoke("LiteLoader.lite_tools.getMsgIdAndUid"),
  // 获取当前窗口peer
  getPeer: () => ipcRenderer.invoke("LiteLoader.lite_tools.getPeer"),
  // 获取撤回信息数据
  getMessageRecallId: () => ipcRenderer.invoke("LiteLoader.lite_tools.getMessageRecallId"),
  // 转发消息
  forwardMessage: (srcpeer, dstpeer, msgIds) => {
    ipcRenderer.send(
      "IPC_UP_2",
      {
        type: "request",
        callbackId: self.crypto.randomUUID(),
        eventName: "ns-ntApi-2",
      },
      [
        "nodeIKernelMsgService/forwardMsgWithComment",
        {
          msgIds: msgIds,
          srcContact: {
            chatType: srcpeer.chatType == "friend" ? 1 : srcpeer.chatType == "group" ? 2 : 1,
            peerUid: srcpeer.uid,
            guildId: "",
          },
          dstContacts: [
            {
              chatType: dstpeer.chatType == "friend" ? 1 : dstpeer.chatType == "group" ? 2 : 1,
              peerUid: dstpeer.uid,
              guildId: "",
            },
          ],
          commentElements: [],
        },
        undefined,
      ]
    );
  },
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
});
