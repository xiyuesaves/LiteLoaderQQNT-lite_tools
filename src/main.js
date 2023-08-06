// 运行在 Electron 主进程 下的插件入口
const { ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
let mainMessage, options;

let log = function (...args) {
  console.log(...args);
};

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
    convertMiniPrgmArk: false,
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
    try {
      // 调试工具
      const inspector = require("node:inspector");
      inspector.open(8899, "localhost", true);
    } catch (err) {
      log("%c当前版本无法开启远程调试", "background:#fe0000;color:#fff;");
    }

    try {
      // 编译样式
      const sass = require("sass");
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
      log("%c当前环境未安装sass，动态更新样式未启用", "background:#fe0000;color:#fff;");
    }
  } else {
    log = () => {};
  }

  log(
    "%c轻量工具箱已加载",
    "border-radius: 8px;padding:10px 20px;font-size:18px;background:linear-gradient(to right, #3f7fe8, #03ddf2);color:#fff;",
    plugin
  );

  // 返回消息id对应的发送时间
  ipcMain.handle("LiteLoader.lite_tools.getMsgIdAndTime", (event) => {
    // 只保留100条数据，减轻数据传递压力
    msgIdList = msgIdList.slice(-100);
    return msgIdList;
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
      log("%c更新配置信息", "background:#1a5d1a;color:#fff;", opt);
      options = opt;
      updateOptions();
    } else {
      log("%c获取配置信息", "background:#1a5d1a;color:#fff;", options);
    }
    return options;
  });

  // 控制台日志打印
  ipcMain.on("LiteLoader.lite_tools.log", (event, ...message) => {
    log("%c轻量工具箱 [渲染进程]: ", "background:#272829;color:#fff;", ...message);
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
        log("选择了文件", result);
        if (!result.canceled) {
          options.background.url = path.join(result.filePaths[0]).replace(/\\/g, "/");
          updateOptions();
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
      log("捕获到主窗口", window);
      mainMessage = window;
    }
  });

  // ipcMain 监听事件patch 仅9.9.0有效
  window.webContents.on("ipc-message", (_, channel, ...args) => {
    log(
      "%cipc-message被拦截",
      "background:#4477ce;color:#fff;",
      channel,
      args[1]?.[0]?.cmdName ? args[1]?.[0]?.cmdName : channel,
      args[1]?.[0],
      args
    );
    if (args[1]?.[0] === "nodeIKernelMsgService/sendMsg") {
      // log("消息发送事件", args[1]);
      if (args[1][1] && args[1][1].msgElements) {
        if (options.tail.enabled) {
          args[1][1].msgElements.forEach((el) => {
            if (el.textElement && el.textElement?.content?.length !== 0) {
              el.textElement.content += options.tail.content;
            }
          });
        }
      }
    }
  });

  const proxyIpcMsg = new Proxy(window.webContents._events["-ipc-message"], {
    apply(target, thisArg, args) {
      log(
        "%c-ipc-message被拦截",
        "background:#f6ca00;color:#fff;",
        args[2],
        args[3]?.[0]?.eventName ? args[3]?.[0]?.eventName : args[3]?.[0],
        args[3]
      );
      if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/sendMsg") {
        log("%c消息发送事件", "background:#5b9a8b;color:#fff;", args);
        if (args[3][1][1] && args[3][1][1].msgElements) {
          if (options.tail.enabled) {
            args[3][1][1].msgElements.forEach((el) => {
              if (el.textElement && el.textElement?.content?.length !== 0) {
                el.textElement.content += options.tail.content;
                log("%c消息增加后缀", "background:#5b9a8b;color:#fff;", el.textElement.content);
              }
            });
          }
        }
      }
      return target.apply(thisArg, args);
    },
  });
  window.webContents._events["-ipc-message"] = proxyIpcMsg;

  // 复写并监听ipc通信内容
  const original_send = window.webContents.send;

  const patched_send = function (channel, ...args) {
    log(
      "%cipc-send被拦截",
      "background:#74a488;color:#fff;",
      channel,
      args[1]?.[0]?.cmdName ? args[1]?.[0]?.cmdName : channel,
      args[1]?.[0],
      args
    );
    if (options.message.convertMiniPrgmArk || options.message.showMsgTime) {
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
            if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertMiniPrgmArk) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.prompt.includes("[QQ小程序]")) {
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
          if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertMiniPrgmArk) {
            const json = JSON.parse(msgElements.arkElement.bytesData);
            if (json?.prompt.includes("[QQ小程序]")) {
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
            if (msgElements.arkElement && msgElements.arkElement.bytesData && options.message.convertMiniPrgmArk) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.prompt.includes("[QQ小程序]")) {
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
  log("%c替换小程序卡片", "background:#fba1b7;color:#fff;", json);
  return JSON.stringify({
    app: "com.tencent.structmsg",
    config: json.config,
    desc: "新闻",
    extra: { app_type: 1, appid: json.meta.detail_1.appid, msg_seq, uin: json.meta.detail_1.host.uin },
    meta: {
      news: {
        action: "",
        android_pkg_name: "",
        app_type: 1,
        appid: json.meta.detail_1.appid,
        ctime: json.config.ctime,
        desc: json.meta.detail_1.desc,
        jumpUrl: json.meta.detail_1.qqdocurl.replace(/\\/g, ""),
        preview: json.meta.detail_1.preview,
        source_icon: json.meta.detail_1.icon,
        source_url: "",
        tag: getArkData(json),
        title: getArkData(json),
        uin: json.meta.detail_1.host.uin,
      },
    },
    prompt: `[分享]${getArkData(json)}`,
    ver: "0.0.0.1",
    view: "news",
  });
}

// appid对应小程序名称
const appidName = new Map([
  ["1109224783", "微博"],
  ["1109937557", "哔哩哔哩"],
]);

// 获取ark卡片对应内容
function getArkData(json) {
  return json.meta.detail_1.title || appidName.get(json.meta.detail_1.appid) || json.meta.detail_1.desc;
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
