// 运行在 Electron 主进程 下的插件入口
const { app, ipcMain, dialog, MessageChannelMain } = require("electron");
const path = require("path");
const fs = require("fs");
let mainMessage, settings, options;

// 加载插件时触发
function onLoad(plugin, liteloader) {
  console.log("轻量工具箱已加载");
  const pluginDataPath = plugin.path.data;
  const settingsPath = path.join(pluginDataPath, "settings.json");
  options = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  // 初始化配置文件路径
  if (!fs.existsSync(pluginDataPath)) {
    fs.mkdirSync(pluginDataPath, { recursive: true });
  }

  // 初始化配置文件
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          sidebar: [],
          imageViewer: {
            quickClose: false,
          },
        },
        null,
        4
      )
    );
  }

  // 窗口初始化完成事件
  ipcMain.on("LiteLoader.lite_tools.windowReady", (event, hash) => {
    console.log("窗口加载完成事件", hash);
    switch (hash) {
      case "#/main/message":
        mainMessage.webContents.send("LiteLoader.lite_tools.updateSidebar", {
          type: "set",
          options,
        });
        break;
    }
  });

  // 获取侧边栏按钮
  ipcMain.handle("LiteLoader.lite_tools.getSidebar", async (event, message) => {
    mainMessage.webContents.send("LiteLoader.lite_tools.updateSidebar", message);
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
      options = opt;
      fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
      mainMessage.webContents.send("LiteLoader.lite_tools.updateSidebar", {
        type: "set",
        options,
      });
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
