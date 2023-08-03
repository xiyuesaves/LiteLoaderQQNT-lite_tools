// 调试工具
const inspector = require("node:inspector");

// 编译样式
const sass = require("sass");

// http服务，处理高版本无法使用file协议的问题
const express = require("express");
const net = require("net");
const app = express();

// 获取空闲端口号
const port = (() => {
  const server = net.createServer();
  server.listen(0);
  const { port } = server.address();
  server.close();
  return port;
})();

// 运行在 Electron 主进程 下的插件入口
const { ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
let log = console.log;
let mainMessage, options;

// 默认配置文件
const defaultOptions = {
  spareInitialization: false,
  debug: false,
  sidebar: {
    top: [],
    bottom: [],
  },
  imageViewer: {
    quickClose: false,
  },
  message: {
    disabledSticker: false,
    disabledHotGIF: false,
    disabledBadge: false,
    disabledSlideMultipleSelection: false,
    convertBiliBiliArk: false,
    showMsgTime: false,
    showMsgTimeHover: false,
    autoOpenURL: false,
  },
  tail: {
    enabled: false,
    content: "",
  },
  textAreaFuncList: [],
  chatAreaFuncList: [],
  background: {
    enabled: false,
    showUrl: "",
    url: "",
  },
};

const listenList = [];
let msgIdList = [];

// 加载插件时触发
function onLoad(plugin) {
  const pluginDataPath = plugin.path.data;
  const settingsPath = path.join(pluginDataPath, "settings.json");
  const styleSassPath = path.join(plugin.path.plugin, "src/style.scss");
  const stylePath = path.join(plugin.path.plugin, "src/style.css");
  const globalScssPath = path.join(plugin.path.plugin, "src/global.scss");
  const globalPath = path.join(plugin.path.plugin, "src/global.css");
  const configPath = path.join(plugin.path.plugin, "src/config");
  const catchPath = path.join(plugin.path.cache);

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

  if (options.debug) {
    inspector.open(8899, "localhost", true);
    try {
      // 监听并编译style.scss
      fs.watch(
        styleSassPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(styleSassPath).css;
          fs.writeFileSync(stylePath, cssText);
          updateStyle(cssText, "style");
        }, 100)
      );
      // 监听并编译global.scss
      fs.watch(
        globalScssPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(globalScssPath).css;
          fs.writeFileSync(globalPath, cssText);
          updateStyle(cssText, "global");
        }, 100)
      );
    } catch {
      log("当前环境未安装sass，样式监听未启用");
    }
  } else {
    log = () => {};
  }

  // 配置界面
  app.use("/config", express.static(configPath));

  // 自定义背景
  app.use("/cache", express.static(catchPath));

  // 开始监听
  app.listen(port);

  log("轻量工具箱已加载", plugin);
  log("http服务已启用", port);

  ipcMain.handle("LiteLoader.lite_tools.getMsgIdAndTime", (event) => {
    // 只保留100条数据，减轻数据传递压力
    msgIdList = msgIdList.slice(-100);
    return msgIdList;
  });

  // 获取http端口
  ipcMain.handle("LiteLoader.lite_tools.getPort", (event) => {
    return port;
  });

  // 打开网址
  ipcMain.on("LiteLoader.lite_tools.openWeb", (event, url) => {
    shell.openExternal(url);
  });

  // 获取侧边栏按钮
  ipcMain.handle("LiteLoader.lite_tools.getSidebar", async (event, message) => {
    mainMessage.webContents.send("LiteLoader.lite_tools.optionsOpen", message);
    const list = await new Promise((res) => {
      ipcMain.once("LiteLoader.lite_tools.sendSidebar", (event, list) => {
        options.sidebar = list;
        res(list);
      });
    });
    return list;
  });

  // 更新输入框上方功能列表
  ipcMain.on("LiteLoader.lite_tools.sendTextAreaList", (event, list) => {
    let res = new Map(),
      concat = options.textAreaFuncList.concat(list);
    options.textAreaFuncList = concat.filter((item) => !res.has(item["name"]) && res.set(item["name"], 1));
    updateOptions();
  });

  // 更新聊天框上方功能列表
  ipcMain.on("LiteLoader.lite_tools.sendChatTopList", (event, list) => {
    let res = new Map(),
      concat = options.chatAreaFuncList.concat(list);
    options.chatAreaFuncList = concat.filter((item) => !res.has(item["name"]) && res.set(item["name"], 1));
    updateOptions();
  });

  // 获取/修改配置信息
  ipcMain.handle("LiteLoader.lite_tools.config", (event, opt) => {
    if (opt) {
      log("更新配置信息", opt);
      options = opt;
      updateOptions();
    } else {
      log("获取配置信息", options);
    }
    return options;
  });

  // 控制台日志打印
  ipcMain.on("LiteLoader.lite_tools.log", (event, ...message) => {
    log("轻量工具箱 [渲染进程]: ", ...message);
  });

  // 获取全局样式
  ipcMain.handle("LiteLoader.lite_tools.getGlobalStyle", (event) => {
    try {
      return fs.readFileSync(globalPath, "utf-8");
    } catch (err) {
      if (fs.existsSync(globalScssPath)) {
        const cssText = sass.compile(globalScssPath).css;
        fs.writeFileSync(globalPath, cssText);
        return cssText;
      } else {
        log("无法找到源scss文件");
        return "";
      }
    }
  });

  // 获取自定义样式
  ipcMain.handle("LiteLoader.lite_tools.getStyle", (event) => {
    try {
      return fs.readFileSync(stylePath, "utf-8");
    } catch (err) {
      if (fs.existsSync(styleSassPath)) {
        const cssText = sass.compile(styleSassPath).css;
        fs.writeFileSync(stylePath, cssText);
        return cssText;
      } else {
        log("无法找到源scss文件");
        return "";
      }
    }
  });

  ipcMain.on("LiteLoader.lite_tools.openSelectBackground", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件", //默认路径,默认选择的文件
        defaultPath: "default.jpg", //过滤文件后缀
        filters: [
          {
            name: "img",
            extensions: ["jpg", "png", "gif", "mp4"],
          },
        ], //打开按钮
        buttonLabel: "选择", //回调结果渲染到img标签上
      })
      .then((result) => {
        if (!result.canceled) {
          const rawFilePath = path.join(result.filePaths[0]).replace(/\\/g, "/");
          const backgroundFolder = path.join(catchPath, "background_file");
          const fileName = path.basename(rawFilePath);
          const backgroundFilePath = path.join(backgroundFolder, fileName);
          // 判断是不是缓存文件夹路径
          if (options.background.url.includes("/cache/background_file/")) {
            try {
              fs.unlinkSync(path.join(backgroundFolder, path.basename(options.background.url)));
            } catch (err) {
              log("删除文件失败", err);
            }
          }
          log("选择了文件", rawFilePath);
          // 创建文件夹路径
          if (!fs.existsSync(backgroundFolder)) {
            if (!fs.existsSync(catchPath)) {
              fs.mkdirSync(catchPath);
            }
            fs.mkdirSync(backgroundFolder);
          }
          // 复制文件到插件缓存目录
          fs.copyFile(rawFilePath, backgroundFilePath, () => {
            options.background.showUrl = rawFilePath;
            options.background.url = `/cache/background_file/${fileName}`;
            updateOptions();
          });
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });

  function updateStyle(styleText, type) {
    listenList.forEach((window) => {
      if (!window.isDestroyed()) {
        if (type === "style") {
          window.webContents.send("LiteLoader.lite_tools.updateStyle", styleText);
        } else if (type === "global") {
          window.webContents.send("LiteLoader.lite_tools.updateGlobalStyle", styleText);
        }
      }
    });
  }

  function updateOptions() {
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    listenList.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send("LiteLoader.lite_tools.updateOptions", options);
      }
    });
  }
}

// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {
  // 新窗口添加到推送列表
  listenList.push(window);

  // 监听页面加载完成事件
  window.webContents.on("did-stop-loading", () => {
    if (window.webContents.getURL().indexOf("#/main/message") !== -1) {
      log("捕获到主窗口");
      mainMessage = window;
    }
  });

  // ipcMain 监听事件patch
  window.webContents.on("ipc-message", (_, channel, ...args) => {
    // log("ipc-msg被拦截", channel, args);
    if (args[1] && args[1][0] === "nodeIKernelMsgService/sendMsg") {
      // log("消息发送事件", args[1]);
      if (args[1][1] && args[1][1].msgElements) {
        if (options.tail.enabled) {
          args[1][1].msgElements.forEach((el) => {
            if (el.textElement && el.textElement.length !== 0) {
              el.textElement.content += options.tail.content;
            }
          });
        }
      }
    }
  });
  // window.webContents.on("ipc-message-sync", (_, channel, ...args) => {
  //   log("ipc-msg-sync被拦截", channel, args);
  // });

  // 复写并监听ipc通信内容
  const original_send = window.webContents.send;

  const patched_send = function (channel, ...args) {
    // log(channel, args);
    if (options.message.convertBiliBiliArk || options.message.showMsgTime) {
      // 替换历史消息中的小程序卡片
      const msgListIndex = args.findIndex(
        (item) =>
          item &&
          item.hasOwnProperty("msgList") &&
          item.msgList != null &&
          item.msgList instanceof Array &&
          item.msgList.length > 0
      );
      if (msgListIndex !== -1) {
        args[msgListIndex].msgList.forEach((msgItem) => {
          log("解析到消息数据", msgItem);
          // 获取消息id和发送时间存入map
          if (options.message.showMsgTime) {
            msgIdList.push([msgItem.msgId, msgItem.msgTime * 1000]);
          }
          // 处理小程序卡片
          let msg_seq = msgItem.msgSeq;
          msgItem.elements.forEach((msgElements) => {
            if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertBiliBiliArk) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.meta?.detail_1?.appid === "1109937557") {
                msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
              }
            }
          });
        });
      }
      // 替换新消息中的小程序卡片
      const onAddSendMsg = args[1]
        ? Array.isArray(args[1])
          ? args[1].findIndex((item) => item.cmdName === "nodeIKernelMsgListener/onAddSendMsg")
          : -1
        : -1;
      if (onAddSendMsg !== -1) {
        log("这是我发送的新消息", args[1]);
        // 获取消息id和发送时间存入map
        if (options.message.showMsgTime) {
          msgIdList.push([
            args[1][onAddSendMsg].payload.msgRecord.msgId,
            args[1][onAddSendMsg].payload.msgRecord.msgTime * 1000,
          ]);
        }
        // 处理小程序卡片
        const msg_seq = args[1][onAddSendMsg].payload.msgRecord.msgSeq;
        args[1][onAddSendMsg].payload.msgRecord.elements.forEach((msgElements) => {
          if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertBiliBiliArk) {
            const json = JSON.parse(msgElements.arkElement.bytesData);
            if (json?.meta?.detail_1?.appid === "1109937557") {
              msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
            }
          }
        });
      }
      // 替换新消息中的小程序卡片
      const onRecvMsg = args[1]
        ? Array.isArray(args[1])
          ? args[1].findIndex((item) => item.cmdName === "nodeIKernelMsgListener/onRecvMsg")
          : -1
        : -1;
      if (onRecvMsg !== -1) {
        log("这是新接收到的消息", args[1]);
        args[1][onRecvMsg].payload.msgList.forEach((arrs) => {
          // 获取消息id和发送时间存入map
          if (options.message.showMsgTime) {
            msgIdList.push([arrs.msgId, arrs.msgTime * 1000]);
          }
          // 打开发给自己的链接
          if (options.message.autoOpenURL) {
            if (arrs.msgSeq === "0" && arrs.senderUid === arrs.peerUid && arrs.chatType === 8) {
              log("这是我的手机的消息", arrs);
              arrs.elements.forEach((msgElements) => {
                if (msgElements.textElement) {
                  if (/^http(s)?:\/\//.test(msgElements.textElement.content)) {
                    shell.openExternal(msgElements.textElement.content.split(" ")[0]);
                  }
                }
              });
            }
          }
          // 处理小程序卡片
          const msg_seq = arrs.msgSeq;
          arrs.elements.forEach((msgElements) => {
            if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertBiliBiliArk) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.meta?.detail_1?.appid === "1109937557") {
                msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
              }
            }
          });
        });
      }
    }

    // 记录下可能会用到的时间名称

    // 视频加载完成事件
    // cmdName: "nodeIKernelMsgListener/onRichMediaDownloadComplete";

    // 打开图片预览窗口事件
    // windowName: "ImageViewerWindow";

    return original_send.call(window.webContents, channel, ...args);
  };

  window.webContents.send = patched_send;
}

// 卡片替换函数
function replaceArk(json, msg_seq) {
  return JSON.stringify({
    app: "com.tencent.structmsg",
    config: json.config,
    desc: "新闻",
    extra: { app_type: 1, appid: 100951776, msg_seq, uin: json.meta.detail_1.host.uin },
    meta: {
      news: {
        action: "",
        android_pkg_name: "",
        app_type: 1,
        appid: 100951776,
        ctime: json.config.ctime,
        desc: json.meta.detail_1.desc,
        jumpUrl: json.meta.detail_1.qqdocurl.replace(/\\/g, ""),
        preview: json.meta.detail_1.preview,
        source_icon: json.meta.detail_1.icon,
        source_url: "",
        tag: "哔哩哔哩",
        title: "哔哩哔哩",
        uin: json.meta.detail_1.host.uin,
      },
    },
    prompt: "[分享]哔哩哔哩",
    ver: "0.0.0.1",
    view: "news",
  });
}

// 防抖函数
function debounce(fn, time) {
  let timer = null;
  return function (...args) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, time);
  };
}

// 这两个函数都是可选的
module.exports = {
  onLoad,
  onBrowserWindowCreated,
};
