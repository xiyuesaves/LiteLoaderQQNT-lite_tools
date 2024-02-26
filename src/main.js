// 运行在 Electron 主进程 下的插件入口
const { ipcMain, dialog, shell, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const EventEmitter = require("events");
class MainEvent extends EventEmitter {}
const mainEvent = new MainEvent();

// 本地模块
const Opt = require("./main_modules/option"); // 配置管理模块
const defalutLocalEmoticonsConfig = require("./defaultConfig/defalutLocalEmoticonsConfig.json"); // 默认本地表情配置文件
const loadOptions = require("./main_modules/loadOptions");
const LimitedMap = require("./main_modules/LimitedMap");
const MessageRecallList = require("./main_modules/MessageRecallList");
const globalBroadcast = require("./main_modules/globalBroadcast");
const processPic = require("./main_modules/processPic");
const replaceArk = require("./main_modules/replaceArk");
const debounce = require("./main_modules/debounce");
const RangesServer = require("./main_modules/rangesServer");
const videoServer = new RangesServer();
const logs = require("./main_modules/logs");
const { winGetFonts, linuxGetFonts, macGetFonts } = require("./main_modules/getFonts");
const { loadEmoticons, onUpdateEmoticons } = require("./main_modules/localEmoticons");

let log = () => {};

/**
 * 第一次关闭频道窗口检测
 */
let isFirstCloseGuidMainWindow = true;

/**
 * 配置数据
 */
let options = Opt.value;
/**
 * 本地表情模块配置数据
 */
let localEmoticonsConfig;
/**
 * 主窗口对象
 */
let mainMessage;
/**
 * 设置窗口
 */
let settingWindow;
/**
 * 常驻撤回历史消息
 */
let recordMessageRecallIdList;
/**
 * 本地保存的消息数量
 */
let localRecallMsgNum = 0;
/**
 * 易失常驻撤回历史消息
 */
let tempRecordMessageRecallIdList;
/**
 * 撤回消息本地保存路径
 */
let messageRecallPath;
/**
 * 最新的撤回消息本地json文件路径
 */
let messageRecallJson;
/**
 * 本地表情配置路径
 */
let localEmoticonsPath;
/**
 * 内存缓存消息记录-用于根据消息id获取撤回原始内容
 */
const catchMsgList = new LimitedMap(20000);
/**
 * 所有撤回消息本地切片列表
 */
let messageRecallFileList = [];
/**
 * 当前激活的聊天窗口数据
 */
let peer = null;
/**
 * 撤回消息查看窗口
 */
let recallViewWindow;
/**
 * 只读历史消息实例暂存数组
 */
let historyMessageRecallList = new Map();
/**
 * 本地表情包数据
 */
let localEmoticonsList = [];

/**
 * 系统字体列表
 */
let systemFontList = [];

/**
 * 背景视频地址
 */
let backgroundData = {
  href: "",
  type: "",
};

/**
 * 调试实例
 */
let mainLogs = null;

// 配置文件更新后保存到本地并广播更新事件
const settingsPath = path.join(LiteLoader.plugins["lite_tools"].path.data, "settings.json");

// 监听配置修改
const debounceUpdateOptions = debounce((newOptions) => {
  const oldOpt = JSON.parse(JSON.stringify(options));
  log("更新配置数据", oldOpt, newOptions);
  options = newOptions;
  fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
  globalBroadcast("LiteLoader.lite_tools.updateOptions", Opt._options);

  // 判断是否启用了本地表情包功能
  if (newOptions.localEmoticons.enabled) {
    // 如果新的配置文件中打开了本地表情功能，且当前文件夹路径和新路径不一致则刷新表情包列表
    if (newOptions.localEmoticons.localPath && oldOpt.localEmoticons.localPath !== newOptions.localEmoticons.localPath) {
      resetCommonlyEmoticons(); // 重置常用表情
      loadEmoticons(newOptions.localEmoticons.localPath); // 读取本地表情文件夹
    }
  }
  // 动态更新历史表情数量限制
  if (newOptions.localEmoticons.commonlyNum !== oldOpt.localEmoticons.commonlyNum) {
    if (newOptions.localEmoticons.commonlyNum < oldOpt.localEmoticons.commonlyNum) {
      localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.splice(0, newOptions.localEmoticons.commonlyNum);
      globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
      fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
    }
  }
  // 更新窗口背景
  if (newOptions.background.enabled) {
    if ([".mp4", ".webm"].includes(path.extname(newOptions.background.url))) {
      videoServer.setFilePath(newOptions.background.url);
      videoServer
        .startServer()
        .then((port) => {
          backgroundData = {
            href: `http://localhost:${port}/${path.basename(newOptions.background.url)}`,
            type: "video",
          };
          log("背景-更新为视频");
          globalBroadcast("LiteLoader.lite_tools.updateWallpaper", newOptions.background.enabled, backgroundData);
        })
        .catch((err) => {
          log("启用视频背景服务时出错", err);
          backgroundData = {
            href: "",
            type: "image",
          };
          globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
        });
    } else {
      videoServer.stopServer();
      backgroundData = {
        href: `local:///${newOptions.background.url.replace(/\\/g, "//")}`,
        type: "image",
      };
      log("背景-更新为图片");
      globalBroadcast("LiteLoader.lite_tools.updateWallpaper", newOptions.background.enabled, backgroundData);
    }
  } else {
    videoServer.stopServer();
    backgroundData = {
      href: "",
      type: "image",
    };
    globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
  }
}, 10);
Opt.on("update", debounceUpdateOptions);

// 加载插件时触发
function onLoad(plugin) {
  const pluginDataPath = plugin.path.data;
  const styleSassPath = path.join(plugin.path.plugin, "src/style.scss");
  const stylePath = path.join(plugin.path.plugin, "src/style.css");
  const globalScssPath = path.join(plugin.path.plugin, "src/global.scss");
  const globalPath = path.join(plugin.path.plugin, "src/global.css");
  const settingScssPath = path.join(plugin.path.plugin, "src/config/view.scss");
  const settingPath = path.join(plugin.path.plugin, "src/config/view.css");
  messageRecallPath = path.join(pluginDataPath, "/messageRecall");
  messageRecallJson = path.join(pluginDataPath, "/messageRecall/latestRecallMessage.json");
  localEmoticonsPath = path.join(pluginDataPath, "localEmoticonsConfig.json");

  // 重置函数this指向
  ipcMain.emit = ipcMain.emit.bind(ipcMain);

  // 初始化配置文件路径
  if (!fs.existsSync(pluginDataPath)) {
    fs.mkdirSync(pluginDataPath, { recursive: true });
  }

  // 初始化撤回消息列表文件路径
  if (!fs.existsSync(messageRecallPath)) {
    fs.mkdirSync(messageRecallPath, { recursive: true });
  }

  // 初始化当前撤回消息保存文件
  if (!fs.existsSync(messageRecallJson)) {
    fs.writeFileSync(messageRecallJson, JSON.stringify([], null, 4));
  }

  // 获取当前撤回消息文件列表
  fs.readdir(messageRecallPath, (err, dirList) => {
    if (!err) {
      dirList.forEach((fileName) => {
        if (fileName !== "latestRecallMessage.json") {
          messageRecallFileList.push(fileName.replace(".json", ""));
        }
      });
      // 排序文件名称
      messageRecallFileList.sort((a, b) => a - b);
      localRecallMsgNum = messageRecallFileList.length * 100;
    }
  });

  // 使用配置加载模块解决插件不同版本配置文件差异
  localEmoticonsConfig = loadOptions(defalutLocalEmoticonsConfig, localEmoticonsPath);

  if (options.debug.mainConsole) {
    mainLogs = new logs("主进程");
    if (options.debug.showWeb) {
      mainLogs.startLogServer();
    }
    log = mainLogs.log;
    // let renderLogs = new logs("渲染进程");
    // renderLog = renderLogs.log;

    try {
      // 调试工具
      const inspector = require("node:inspector");
      inspector.open(8899, "localhost", true);
    } catch (err) {
      // 当前版本inspector模块已被移除
      log("当前版本无法开启远程调试");
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
          globalBroadcast("LiteLoader.lite_tools.updateStyle", cssText);
        }, 100),
      );
      // 监听并编译global.scss
      fs.watch(
        globalScssPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(globalScssPath).css;
          fs.writeFileSync(globalPath, cssText);
          globalBroadcast("LiteLoader.lite_tools.updateGlobalStyle", cssText);
        }, 100),
      );
      // 监听并编译view.scss
      fs.watch(
        settingScssPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(settingScssPath).css;
          fs.writeFileSync(settingPath, cssText);
          globalBroadcast("LiteLoader.lite_tools.updateSettingStyle");
        }, 100),
      );
    } catch {
      log("当前环境未安装sass，动态更新样式未启用");
    }
  }
  // 控制台输出项目logo
  log("轻量工具箱已加载");

  // 初始化本地表情包功能
  // 监听本地表情包文件夹内的更新
  onUpdateEmoticons((emoticonsList) => {
    log("本地表情包更新", emoticonsList.length);
    // 将所有的图片路径放入Set
    const newPaths = new Set(
      emoticonsList.flatMap((emoticons) => {
        return emoticons.list.map((item) => item.path);
      }),
    );
    localEmoticonsList = emoticonsList;
    // 如果没有启用历史表情
    localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.filter((path) => newPaths.has(path));
    globalBroadcast("LiteLoader.lite_tools.updateEmoticons", emoticonsList);
    globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
    fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
  });
  // 判断是否启用了本地表情包功能
  if (options.localEmoticons.enabled) {
    if (options.localEmoticons.localPath) {
      log("尝试加载本地表情包文件夹");
      loadEmoticons(options.localEmoticons.localPath);
    }
  }

  // 初始化背景功能
  if (options.background.enabled && options.background.url) {
    if ([".mp4", ".webm"].includes(path.extname(options.background.url))) {
      videoServer.setFilePath(options.background.url);
      videoServer
        .startServer()
        .then((port) => {
          backgroundData = {
            href: `http://localhost:${port}/${path.basename(options.background.url)}`,
            type: "video",
          };
        })
        .catch((err) => {
          log("启用视频背景服务时出错", err);
          backgroundData = {
            href: "",
            type: "image",
          };
        });
    } else {
      backgroundData = {
        href: `local:///${options.background.url.replace(/\\/g, "//")}`,
        type: "image",
      };
    }
  }

  // 初始化阻止撤回功能
  // 初始化常驻撤回消息历史记录-每100条记录切片为一个json文件
  recordMessageRecallIdList = new MessageRecallList(messageRecallJson, messageRecallPath, 100);
  tempRecordMessageRecallIdList = new Map();
  // 监听常驻历史撤回记录实例创建新的文件切片
  recordMessageRecallIdList.onNewFile((newFileName) => {
    log("新增切片文件", newFileName);
    messageRecallFileList.push(newFileName.replace(".json", ""));
    // 排序文件名称
    messageRecallFileList.sort((a, b) => a - b);
  });
  recordMessageRecallIdList.onNewRecallMsg(() => {
    localRecallMsgNum = messageRecallFileList.length * 100 + recordMessageRecallIdList.map.size;
    globalBroadcast("LiteLoader.lite_tools.updateRecallListNum", localRecallMsgNum);
  });

  // 进程通信相关

  // 获取背景数据
  ipcMain.handle("LiteLoader.lite_tools.getWallpaper", () => {
    return [options.background.enabled, backgroundData];
  });

  // 复制文件
  ipcMain.on("LiteLoader.lite_tools.copyFile", (event, from, to) => {
    log("复制文件", from, to);
    fs.copyFile(from, to, (err) => {
      if (err) {
        log("复制文件出错", err);
      } else {
        log("复制文件完成");
      }
    });
  });

  // 获取系统字体列表
  ipcMain.handle("LiteLoader.lite_tools.getSystemFonts", async (event) => {
    if (systemFontList.length <= 1) {
      try {
        switch (LiteLoader.os.platform) {
          case "win32":
            systemFontList = await winGetFonts();
            break;
          case "darwin":
            systemFontList = await macGetFonts();
            break;
          case "linux":
            systemFontList = await linuxGetFonts();
            break;
        }
      } catch (err) {
        log("获取字体列表失败", err);
        systemFontList = ["获取系统字体列表失败"];
      }
    }
    return systemFontList;
  });

  // 获取本地保存的撤回消息数量
  ipcMain.on("LiteLoader.lite_tools.getRecallListNum", (event) => {
    localRecallMsgNum = messageRecallFileList.length * 100 + recordMessageRecallIdList.map.size;
    event.returnValue = localRecallMsgNum;
  });

  // 返回本地表情包数据
  ipcMain.handle("LiteLoader.lite_tools.getLocalEmoticonsList", (event) => {
    log("返回本地表情包数据");
    return localEmoticonsList;
  });

  // 返回常用表情包数据
  ipcMain.handle("LiteLoader.lite_tools.getLocalEmoticonsConfig", (event) => {
    log("返回本地表情包配置");
    return localEmoticonsConfig;
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
    list.forEach((item) => {
      if (!options.textAreaFuncList.find((el) => el.name === item.name)) {
        options.textAreaFuncList.push(item);
      }
    });
  });

  // 更新聊天框上方功能列表
  ipcMain.on("LiteLoader.lite_tools.sendChatTopList", (event, list) => {
    list.forEach((item) => {
      if (!options.chatAreaFuncList.find((el) => el.name === item.name)) {
        options.chatAreaFuncList.push(item);
      }
    });
  });

  // 修改配置信息
  ipcMain.on("LiteLoader.lite_tools.setOptions", (event, opt) => {
    log("更新配置信息", opt);
    Opt.updateOptions(opt);
  });

  // 获取配置信息
  ipcMain.on("LiteLoader.lite_tools.getOptions", (event) => {
    log("获取配置信息");
    event.returnValue = Opt._options;
  });

  // 返回窗口id
  ipcMain.on("LiteLoader.lite_tools.getWebContentId", (event) => {
    log("获取窗口id", event.sender.id.toString());
    event.returnValue = event.sender.id.toString();
  });

  // 返回当前激活的peer数据
  ipcMain.on("LiteLoader.lite_tools.getPeer", (event) => {
    log("获取peer", peer);
    event.returnValue = peer;
  });

  // 保存图片消息到本地
  ipcMain.on("LiteLoader.lite_tools.saveBase64ToFile", async (event, fileName, base64) => {
    log("接收到保存为文件事件");
    const buffer = Buffer.from(base64.split(",")[1], "base64");
    if (options.messageToImage.path && fs.existsSync(options.messageToImage.path)) {
      const savePath = path.join(options.messageToImage.path, fileName);
      log("默认文件路径", savePath);
      fs.writeFileSync(savePath, buffer, { encoding: null });
    } else {
      dialog
        .showSaveDialog({
          title: "请选择位置", //默认路径,默认选择的文件
          properties: ["dontAddToRecent "],
          message: "选择图片保存位置",
          defaultPath: fileName,
        })
        .then((result) => {
          log(result);
          if (!result.canceled) {
            log("选择了文件夹", result.filePath);
            fs.writeFileSync(result.filePath, buffer, { encoding: null });
          }
        })
        .catch((err) => {
          log("无效操作", err);
        });
    }
  });
  // 选择默认图片消息保存路径
  ipcMain.on("LiteLoader.lite_tools.openSelectDefaultSaveFilePath", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件夹", //默认路径,默认选择的文件
        properties: ["openDirectory"],
        buttonLabel: "选择文件夹",
      })
      .then((result) => {
        log("选择了文件夹", result);
        if (!result.canceled) {
          const newPath = path.join(result.filePaths[0]);
          options.messageToImage.path = newPath;
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });

  // 控制台日志打印
  ipcMain.on("LiteLoader.lite_tools.log", (event, ...message) => {
    // log("渲染进程>", ...message);
  });

  // 更新常用表情列表
  ipcMain.on("LiteLoader.lite_tools.addCommonlyEmoticons", addCommonlyEmoticons);

  // 打开文件夹
  ipcMain.on("LiteLoader.lite_tools.openFolder", (event, localPath) => {
    const openPath = path.normalize(localPath);
    shell.showItemInFolder(openPath);
  });
  // 打开文件
  ipcMain.on("LiteLoader.lite_tools.openFile", (event, localPath) => {
    const openPath = path.normalize(localPath);
    shell.openPath(openPath);
  });
  // 从历史记录中移除指定文件
  ipcMain.on("LiteLoader.lite_tools.deleteCommonlyEmoticons", (event, localPath) => {
    const newSet = new Set(localEmoticonsConfig.commonlyEmoticons);
    // 如果已经有这个表情了，则更新位置
    newSet.delete(localPath);
    localEmoticonsConfig.commonlyEmoticons = Array.from(newSet);
    globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
    fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
  });

  // 获取用户信息事件
  ipcMain.handle("LiteLoader.lite_tools.getUserInfo", async (event, uid) => {
    const userInfo = await new Promise((resolve) => {
      function onEvent(channel, ...args) {
        if (
          channel === "IPC_DOWN_2" &&
          ["nodeIKernelProfileListener/onProfileDetailInfoChanged", "nodeIKernelProfileListener/onProfileSimpleChanged"].includes(
            args?.[1]?.[0]?.cmdName,
          )
        ) {
          mainEvent.off("send", onEvent);
          resolve(args[1]);
        }
      }
      mainEvent.on("send", onEvent);
      ipcMain.emit("IPC_UP_2", {}, { type: "request", callbackId: crypto.randomUUID(), eventName: "ns-ntApi-2" }, [
        "nodeIKernelProfileService/getUserDetailInfo",
        { uid: uid },
        null,
      ]);
    });
    return userInfo;
  });

  // 发送所有的本地撤回数据
  ipcMain.on("LiteLoader.lite_tools.getReacllMsgData", () => {
    let msgList = new Map();
    msgList = new Map([...msgList, ...recordMessageRecallIdList.map]);
    for (let i = 0; i < messageRecallFileList.length; i++) {
      const fileName = messageRecallFileList[i];
      const recall = new MessageRecallList(path.join(messageRecallPath, `${fileName}.json`));
      msgList = new Map([...msgList, ...recall.map]);
    }
    log("发送消息数据", msgList.size);
    recallViewWindow.webContents.send("LiteLoader.lite_tools.onReacllMsgData", msgList);
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

  // 选择文件事件
  ipcMain.on("LiteLoader.lite_tools.openSelectBackground", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件", //默认路径,默认选择的文件
        defaultPath: "default.jpg", //过滤文件后缀
        filters: [
          {
            name: "img",
            extensions: ["jpg", "png", "gif", "webp", "jpeg", "mp4", "webm"],
          },
        ], //打开按钮
        buttonLabel: "选择", //回调结果渲染到img标签上
      })
      .then((result) => {
        log("选择了文件", result);
        if (!result.canceled) {
          const newFilePath = path.join(result.filePaths[0]);
          // 背景视频相关
          if (options.background.enabled && newFilePath !== options.background.url) {
            if ([".mp4", ".webm"].includes(path.extname(newFilePath))) {
              videoServer.setFilePath(newFilePath);
              videoServer
                .startServer()
                .then((port) => {
                  backgroundData = {
                    href: `http://localhost:${port}/${path.basename(newFilePath)}`,
                    type: "video",
                  };
                  log("背景-更新为视频");
                  globalBroadcast("LiteLoader.lite_tools.updateWallpaper", options.background.enabled, backgroundData);
                })
                .catch((err) => {
                  log("启用视频背景服务时出错", err);
                  backgroundData = {
                    href: "",
                    type: "image",
                  };
                  globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
                });
            } else {
              videoServer.stopServer();
              backgroundData = {
                href: `local:///${newFilePath.replace(/\\/g, "//")}`,
                type: "image",
              };
              log("背景-更新为图片");
              globalBroadcast("LiteLoader.lite_tools.updateWallpaper", options.background.enabled, backgroundData);
            }
          }
          options.background.url = newFilePath;
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });

  // 选择文件夹事件
  ipcMain.on("LiteLoader.lite_tools.openSelectLocalEmoticonsFolder", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件夹", //默认路径,默认选择的文件
        properties: ["openDirectory"],
        buttonLabel: "选择文件夹",
      })
      .then((result) => {
        log("选择了文件夹", result);
        if (!result.canceled) {
          const newPath = path.join(result.filePaths[0]);
          // 判断是否启用了本地表情包功能
          if (options.localEmoticons.enabled) {
            if (newPath && options.localEmoticons.localPath !== newPath) {
              resetCommonlyEmoticons();
              loadEmoticons(newPath);
            }
          }
          options.localEmoticons.localPath = newPath;
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });

  // 删除所有本地保存撤回记录
  ipcMain.on("LiteLoader.lite_tools.clearLocalStorageRecallMsg", () => {
    log("尝试清除本地数据");
    // 弹出对话框询问用户是否继续
    const result = dialog.showMessageBoxSync(settingWindow, {
      type: "warning",
      title: "警告",
      message: "您即将清空所有撤回消息数据，是否继续？",
      buttons: ["是", "否"],
      defaultId: 0, // 默认选中 "是" 按钮
      cancelId: 1, // 按下 ESC 或点击窗口关闭按钮的行为相当于点击 "否" 按钮
    });

    if (result === 0) {
      recordMessageRecallIdList.map = new Map();
      recordMessageRecallIdList.saveFile();
      deleteFilesInDirectory(messageRecallPath, "latestRecallMessage.json");
      messageRecallFileList = [];
      localRecallMsgNum = 0;
      globalBroadcast("LiteLoader.lite_tools.updateRecallListNum", localRecallMsgNum);
      log("清空本地消息记录");
    }
  });

  // 查看本地撤回数据
  ipcMain.on("LiteLoader.lite_tools.openRecallMsgList", () => {
    try {
      openRecallView();
    } catch (err) {
      log("出现错误", err.message);
    }
  });

  // 跳转到指定聊天窗口的对应消息
  ipcMain.on("LiteLoader.lite_tools.sendToMsg", (event, sceneData) => {
    ipcMain.emit(
      "IPC_UP_2",
      {
        sender: {
          send: (...args) => {},
        },
      },
      { type: "request", callbackId: crypto.randomUUID(), eventName: "ns-WindowApi-2" },
      [
        "goMainWindowScene",
        {
          scene: sceneData.scene,
          sceneParams: {
            peerUid: sceneData.peerUid,
            chatType: sceneData.chatType,
            type: sceneData.type,
            params: {
              msgId: sceneData.msgId,
            },
          },
        },
      ],
    );
  });
}
onLoad(LiteLoader.plugins["lite_tools"]);

function openRecallView() {
  if (recallViewWindow) {
    recallViewWindow.webContents.focus();
  } else {
    recallViewWindow = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(LiteLoader.plugins["lite_tools"].path.plugin, "/src/preload.js"),
      },
    });
    recallViewWindow.loadFile(path.join(LiteLoader.plugins["lite_tools"].path.plugin, `/src/config/showRecallList.html`));
    recallViewWindow.webContents.on("before-input-event", (event, input) => {
      if (input.key == "F5" && input.type == "keyUp") {
        recallViewWindow.loadFile(path.join(LiteLoader.plugins["lite_tools"].path.plugin, `/src/config/showRecallList.html`));
      }
    });

    recallViewWindow.on("closed", () => {
      recallViewWindow = null;
    });
  }
}

// 删除文件夹内的所有文件
function deleteFilesInDirectory(directoryPath, fileToPreserve) {
  // 读取目录中的所有文件
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("无法读取该文件夹:", err);
      return;
    }
    // 遍历文件数组，删除每个文件
    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      if (file !== fileToPreserve) {
        // 删除文件
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("删除文件失败:", err);
          } else {
            log("删除成功:", filePath);
          }
        });
      }
    });
  });
}

// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {
  // 监听页面加载完成事件
  window.webContents.on("did-stop-loading", () => {
    // 如果打开的是频道窗口且启用了临时修复方法，则直接关闭窗口
    if (window.webContents.getURL().indexOf("#/index/2") !== -1 && isFirstCloseGuidMainWindow) {
      if (options.fixAbnormalResourceUsage && isFirstCloseGuidMainWindow) {
        setTimeout(() => {
          window.close();
        }, 500);
      }
      isFirstCloseGuidMainWindow = false;
    }

    if (window.webContents.getURL().indexOf("#/main/message") !== -1) {
      log("捕获到主窗口");
      mainMessage = window;
    }
    if (window.webContents.getURL().indexOf("#/setting/settings/common") !== -1) {
      log("捕获到设置口");
      settingWindow = window;
    }
  });

  // 代理官方监听器
  const ipc_message_proxy = window.webContents._events["-ipc-message"]?.[0] || window.webContents._events["-ipc-message"];

  const proxyIpcMsg = new Proxy(ipc_message_proxy, {
    apply(target, thisArg, args) {
      if (options.debug.showChannedCommunication) {
        log("get", args[2], args[3]?.[1]?.[0], args);
      }
      ipc_message(args);
      return target.apply(thisArg, args);
    },
  });

  function ipc_message(args) {
    if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/sendMsg") {
      log("消息发送事件", args);
      if (args[3][1][1] && args[3][1][1].msgElements) {
        if (options.tail.enabled) {
          const peerUid = args[3][1][1]?.peer?.peerUid;
          const tail = options.tail.list.find((tail) => {
            if (tail.filter.length === 1 && tail.filter[0] === "") {
              return true;
            }
            if (tail.filter.includes(peerUid)) {
              return true;
            }
          });
          // 必须含有peerUid且匹配到后缀数据
          if (peerUid && tail) {
            const tailContext = tail.content;
            const newLine = tail.newLine;
            args[3][1][1].msgElements.forEach((el) => {
              if (el.textElement && el.textElement?.content?.length !== 0) {
                if (newLine) {
                  el.textElement.content += "\n";
                }
                el.textElement.content += tailContext;
                log("消息增加后缀", el.textElement.content);
              }
            });
          }
        }
      }
    }
    if (args[3]?.[1]?.[0] === "changeRecentContacPeerUid") {
      log("切换聊天窗口", args[3]?.[1]?.[1]);
      peer = {
        chatType: args[3]?.[1]?.[1]?.peerUid[0] === "u" ? "friend" : "group",
        uid: args[3]?.[1]?.[1]?.peerUid,
        guildId: args[3]?.[1]?.[1]?.peer?.guildId,
      };
      globalBroadcast("LiteLoader.lite_tools.updatePeer", peer);
    }
    if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/setMsgRead") {
      log("切换聚焦窗口", args[3]?.[1]?.[1]);
      peer = {
        chatType: args[3]?.[1]?.[1].peer.peerUid[0] === "u" ? "friend" : "group",
        uid: args[3]?.[1]?.[1].peer.peerUid,
        guildId: args[3]?.[1]?.[1]?.peer.guildId,
      };
      globalBroadcast("LiteLoader.lite_tools.updatePeer", peer);
    }
  }

  if (window.webContents._events["-ipc-message"]?.[0]) {
    window.webContents._events["-ipc-message"][0] = proxyIpcMsg;
  } else {
    window.webContents._events["-ipc-message"] = proxyIpcMsg;
  }

  // 复写并监听ipc通信内容
  const original_send = window.webContents.send;

  // 主进程发送消息方法
  const patched_send = function (channel, ...args) {
    mainEvent.emit("send", channel, ...args);
    if (options.debug.showChannedCommunication) {
      log("send", channel, args?.[0]?.callbackId, args);
    }
    // 捕获消息列表
    const msgList = args[1]?.msgList;
    if (msgList && msgList.length) {
      log("捕获到消息数据", msgList.length);
      // 遍历消息列表中的所有消息
      if (options.message.convertMiniPrgmArk || options.preventMessageRecall.enabled) {
        msgList.forEach((msgItem, index) => {
          let msg_seq = msgItem.msgSeq;
          // 遍历消息内容数组
          msgItem.elements.forEach((msgElements) => {
            // 替换历史消息中的小程序卡片
            if (msgElements?.arkElement?.bytesData && options.message.convertMiniPrgmArk) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.prompt.includes("[QQ小程序]")) {
                msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
              }
            }
            // 替换被撤回的消息内容
            if (options.preventMessageRecall.enabled) {
              // 检测到消息里有撤回标记，且不是自己发送的消息
              if (msgElements?.grayTipElement?.revokeElement) {
                const findInCatch = catchMsgList.get(msgItem.msgId); // 尝试从内存中查找对应消息并替换元素
                // 如果在聊天缓存里找到了被撤回的内容，且是自己发起的撤回，那么需要额外判断是否开启了拦截自己的撤回事件
                if (
                  findInCatch &&
                  (!msgElements?.grayTipElement?.revokeElement?.isSelfOperate || options.preventMessageRecall.preventSelfMsg)
                ) {
                  log(`${msgItem.msgId} 从消息列表中找到消息记录`, findInCatch);
                  // 在消息对象上补充撤回信息
                  findInCatch.lite_tools_recall = {
                    operatorNick: msgElements.grayTipElement.revokeElement.operatorNick, // 执行撤回昵称
                    operatorRemark: msgElements.grayTipElement.revokeElement.operatorRemark, // 执行撤回备注昵称
                    operatorMemRemark: msgElements.grayTipElement.revokeElement.operatorMemRemark, // 执行撤回群昵称

                    origMsgSenderNick: msgElements.grayTipElement.revokeElement.origMsgSenderNick, // 发送消息角色
                    origMsgSenderRemark: msgElements.grayTipElement.revokeElement.origMsgSenderRemark, // 发送消息角色
                    origMsgSenderMemRemark: msgElements.grayTipElement.revokeElement.origMsgSenderMemRemark, // 发送消息角色
                    recallTime: msgItem.recallTime, // 撤回时间
                  };
                  if (options.preventMessageRecall.localStorage) {
                    recordMessageRecallIdList.set(findInCatch.msgId, findInCatch); // 存入常驻历史撤回记录
                  } else {
                    tempRecordMessageRecallIdList.set(findInCatch.msgId, findInCatch); // 重启QQ后丢失
                  }
                  processPic(findInCatch);
                  msgList[index] = findInCatch; // 替换撤回标记
                } else {
                  const findInRecord = (
                    options.preventMessageRecall.localStorage ? recordMessageRecallIdList : tempRecordMessageRecallIdList
                  ).get(msgItem.msgId); // 从常驻历史撤回记录中查找消息id
                  if (findInRecord) {
                    log(`${msgItem.msgId} 从常驻缓存中找到消息记录`, findInRecord.peerName, findInRecord.sendNickName);
                    processPic(findInRecord);
                    msgList[index] = findInRecord; // 替换撤回标记
                    // 只有在开启持久化保存选项时，才读取本地已保存的撤回数据
                  } else if (options.preventMessageRecall.localStorage) {
                    const msgRecallTime = parseInt(msgItem.recallTime) * 1000; // 获取消息发送时间
                    const historyFile = messageRecallFileList.find((fileName) => parseInt(fileName) >= msgRecallTime); // 有概率含有这条撤回消息的切片文件
                    if (historyFile) {
                      if (!historyMessageRecallList.has(historyFile)) {
                        const messageRecallList = new MessageRecallList(path.join(messageRecallPath, `${historyFile}.json`));
                        historyMessageRecallList.set(historyFile, messageRecallList);
                      }
                      const findInHistory = historyMessageRecallList.get(historyFile).get(msgItem.msgId);
                      if (findInHistory) {
                        log(`${msgItem.msgId} 从历史缓存中找到消息记录`, findInHistory);
                        processPic(findInHistory);
                        msgList[index] = findInHistory; // 替换撤回标记
                      } else {
                        log(`${msgItem.msgId} 没有撤回记录`);
                      }
                    } else {
                      log(`${msgItem.msgId} 没有对应时间的历史切片`);
                    }
                  }
                }
                // 针对撤回消息添加特殊字段用于展示数据
                msgList[index].lite_tools_recall = {
                  operatorNick: msgElements.grayTipElement.revokeElement.operatorNick, // 执行撤回昵称
                  operatorRemark: msgElements.grayTipElement.revokeElement.operatorRemark, // 执行撤回备注昵称
                  operatorMemRemark: msgElements.grayTipElement.revokeElement.operatorMemRemark, // 执行撤回群昵称

                  origMsgSenderNick: msgElements.grayTipElement.revokeElement.origMsgSenderNick, // 发送消息角色
                  origMsgSenderRemark: msgElements.grayTipElement.revokeElement.origMsgSenderRemark, // 发送消息角色
                  origMsgSenderMemRemark: msgElements.grayTipElement.revokeElement.origMsgSenderMemRemark, // 发送消息角色
                  recallTime: msgItem.recallTime, // 撤回时间
                };
              } else if (msgElements?.grayTipElement?.revokeElement?.isSelfOperate) {
                log("本人发起的撤回，放行");
              } else {
                catchMsgList.set(msgItem.msgId, msgItem); // 消息数据存入缓存
              }
            }
          });
        });
      }
      // 销毁加载的只读历史数据实例
      historyMessageRecallList = new Map();
    }

    // 本人发送的消息
    const onAddSendMsg = findEventIndex(args, "nodeIKernelMsgListener/onAddSendMsg");
    if (onAddSendMsg !== -1) {
      log("这是我发送的新消息", args[1]);
      // 处理小程序卡片
      if (options.message.convertMiniPrgmArk) {
        const msg_seq = args[1][onAddSendMsg].payload.msgRecord.msgSeq;
        args[1][onAddSendMsg].payload.msgRecord.elements.forEach((msgElements) => {
          if (msgElements.arkElement && msgElements.arkElement.bytesData) {
            const json = JSON.parse(msgElements.arkElement.bytesData);
            if (json?.prompt.includes("[QQ小程序]")) {
              msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
            }
          }
        });
      }
    }

    // 接收到的新消息
    const onRecvMsg = findEventIndex(args, "nodeIKernelMsgListener/onRecvMsg");
    if (onRecvMsg !== -1) {
      // log("收到新消息", args[1]);
      args[1][onRecvMsg].payload.msgList.forEach((arrs) => {
        // 阻止撤回
        if (options.preventMessageRecall.enabled) {
          // 将消息存入map
          catchMsgList.set(arrs.msgId, arrs);
        }
        // 处理小程序卡片
        if (options.message.convertMiniPrgmArk) {
          const msg_seq = arrs.msgSeq;
          arrs.elements.forEach((msgElements) => {
            if (msgElements.arkElement && msgElements.arkElement.bytesData) {
              const json = JSON.parse(msgElements.arkElement.bytesData);
              if (json?.prompt.includes("[QQ小程序]")) {
                msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
              }
            }
          });
        }
      });
    }

    // 更新消息信息列表
    const onMsgInfoListUpdate = findEventIndex(args, "nodeIKernelMsgListener/onMsgInfoListUpdate");
    if (onMsgInfoListUpdate !== -1) {
      log("更新消息信息列表", args[1]);
      const msgItem = args[1][0]?.payload?.msgList[0];
      if (options.preventMessageRecall.enabled) {
        if (msgItem.elements[0]?.grayTipElement?.revokeElement) {
          const revokeElement = msgItem.elements[0].grayTipElement.revokeElement;
          // 如果开启了拦截自己的撤回事件，则始终为true
          if (!revokeElement.isSelfOperate || options.preventMessageRecall.preventSelfMsg) {
            log("捕获到实时撤回事件，已被阻止", msgItem);
            const findInCatch = catchMsgList.get(msgItem.msgId);
            if (findInCatch) {
              // 广播实时撤回消息参数
              const recallData = {
                operatorNick: revokeElement.operatorNick, // 执行撤回昵称
                operatorRemark: revokeElement.operatorRemark, // 执行撤回备注昵称
                operatorMemRemark: revokeElement.operatorMemRemark, // 执行撤回群昵称

                origMsgSenderNick: revokeElement.origMsgSenderNick, // 发送消息角色
                origMsgSenderRemark: revokeElement.origMsgSenderRemark, // 发送消息角色
                origMsgSenderMemRemark: revokeElement.origMsgSenderMemRemark, // 发送消息角色
                recallTime: msgItem.recallTime, // 撤回时间
              };
              findInCatch.lite_tools_recall = recallData;
              globalBroadcast("LiteLoader.lite_tools.onMessageRecall", {
                msgId: findInCatch.msgId,
                recallData,
              });
              // 写入常驻内存缓存
              if (options.preventMessageRecall.localStorage) {
                recordMessageRecallIdList.set(findInCatch.msgId, findInCatch); // 存入常驻历史撤回记录
              } else {
                tempRecordMessageRecallIdList.set(findInCatch.msgId, findInCatch);
              }
              // 从消息列表缓存移除
              // catchMsgList.delete(msgItem.msgId);
              processPic(findInCatch);
              msgItem = findInCatch; // 替换撤回标记
            } else {
              log("被撤回消息没有在缓存中，反撤回失败");
            }
          } else {
            log("本人发起的撤回，放行");
          }
        } else {
          // 将消息存入map
          catchMsgList.set(msgItem.msgId, msgItem);
        }
      }
    }
    // 记录下可能会用到的事件名称

    // 视频加载完成事件
    // cmdName: "nodeIKernelMsgListener/onRichMediaDownloadComplete";

    // 打开图片预览窗口事件
    // windowName: "ImageViewerWindow";

    // 继续原有逻辑
    return original_send.call(window.webContents, channel, ...args);
  };

  window.webContents.send = patched_send;
}

// 判断事件名称
function findEventIndex(args, eventName) {
  return args[1] ? (Array.isArray(args[1]) ? args[1].findIndex((item) => item.cmdName === eventName) : -1) : -1;
}

// 重置常用表情列表
function resetCommonlyEmoticons() {
  localEmoticonsConfig.commonlyEmoticons = [];
  globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
}

// 增加常用表情
function addCommonlyEmoticons(event, src) {
  if (!options.localEmoticons.commonlyEmoticons) {
    return;
  }
  log("更新常用表情", localEmoticonsPath, options.localEmoticons.commonlyNum);
  const newSet = new Set(localEmoticonsConfig.commonlyEmoticons);
  // 如果已经有这个表情了，则更新位置
  newSet.delete(src);
  localEmoticonsConfig.commonlyEmoticons = Array.from(newSet);
  localEmoticonsConfig.commonlyEmoticons.unshift(src);
  // 删除多余的值
  if (localEmoticonsConfig.commonlyEmoticons.length > options.localEmoticons.commonlyNum) {
    localEmoticonsConfig.commonlyEmoticons.pop();
  }
  log("历史表情列表", localEmoticonsConfig);
  globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
}

module.exports = {
  onBrowserWindowCreated,
};
