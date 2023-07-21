// 运行在 Electron 主进程 下的插件入口
const { app, ipcMain, dialog, MessageChannelMain } = require("electron");
const path = require("path");
const fs = require("fs");
let mainMessage, settings, options;

// 默认配置文件
const defaultOptions = {
  sidebar: [],
  imageViewer: {
    quickClose: false,
  },
  message: {
    disabledSticker: false,
  },
};

// 加载插件时触发
function onLoad(plugin, liteloader) {
  console.log("轻量工具箱已加载");
  const pluginDataPath = plugin.path.data;
  const settingsPath = path.join(pluginDataPath, "settings.json");

  // 初始化配置文件路径
  if (!fs.existsSync(pluginDataPath)) {
    fs.mkdirSync(pluginDataPath, { recursive: true });
  }

  // 初始化配置文件
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(defaultOptions, null, 4));
  }

  // 获取本地配置文件
  fileOptions = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  // 保存配置和默认配置执行一次合并，以适配新增功能
  options = Object.assign(defaultOptions, fileOptions);

  // 获取侧边栏按钮
  ipcMain.handle("LiteLoader.lite_tools.getSidebar", async (event, message) => {
    mainMessage.webContents.send("LiteLoader.lite_tools.messageChannel", message);
    const list = await new Promise((res) => {
      ipcMain.once("LiteLoader.lite_tools.sendSidebar", (event, list) => {
        res(list);
      });
    });
    return list;
  });

  // 获取/修改配置信息
  ipcMain.handle("LiteLoader.lite_tools.config", (event, opt) => {
    if (opt) {
      console.log("更新配置信息", opt);
      options = opt;
      fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
      mainMessage.webContents.send("LiteLoader.lite_tools.messageChannel", {
        type: "set",
        options,
      });
    } else {
      console.log("获取配置信息", options);
    }
    return options;
  });

  // 控制台日志打印
  ipcMain.on("LiteLoader.lite_tools.log", (event, message) => {
    console.log("轻量工具箱 [渲染进程]: ", message);
  });
}

// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {
  window.webContents.on("did-stop-loading", () => {
    if (window.webContents.getURL().indexOf("#/main/message") !== -1) {
      console.log("捕获到主窗口");
      mainMessage = window;
    }
    if (window.webContents.getURL().indexOf("#/setting/settings/common") !== -1) {
      console.log("捕获到设置窗口");
      settings = window;
    }
  });
}

// 这两个函数都是可选的
module.exports = {
  onLoad,
  onBrowserWindowCreated,
};
