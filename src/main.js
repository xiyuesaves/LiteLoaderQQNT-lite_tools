// 运行在 Electron 主进程 下的插件入口
const { ipcMain, dialog, shell } = require("electron");
const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");

// 本地模块
let loadOptions = require("./main_modules/loadOptions");
const { loadEmoticons, onUpdateEmoticons } = require("./main_modules/localEmoticons");

let mainMessage, recordMessageRecallIdList, messageRecallPath, messageRecallJson;

let log = function (...args) {
  console.log(...args);
};

// 自定义limitMap，在达到指定数量后清空最后一条记录
class LimitedMap {
  constructor(limit) {
    this.limit = limit;
    this.map = new Map();
    this.keys = [];
  }
  set(key, value) {
    // 如果当前map存储消息超过指定大小，则删除最后一条数据
    if (this.map.size >= this.limit) {
      const oldestKey = this.keys.shift();
      this.map.delete(oldestKey);
    }
    this.map.set(key, value);
    this.keys.push(key);
  }
  get(key) {
    return this.map.get(key);
  }
  has(key) {
    return this.map.has(key);
  }
  delete(key) {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
    }
    this.map.delete(key);
  }
}

// 撤回消息切片管理
class MessageRecallList {
  constructor(messageRecallJson, messageRecallPath = false, limit = 0) {
    log(
      `新的历史记录实例，目标文件 ${path.basename(messageRecallJson)} 实例状态 ${
        messageRecallPath ? "读写" : "只读"
      } 切片大小 ${limit}`,
    );
    this.limit = limit;
    this.messageRecallPath = messageRecallPath;
    this.latestPath = messageRecallJson;
    this.newFileEvent = [];
    this.map = new Map(JSON.parse(fs.readFileSync(this.latestPath, { encoding: "utf-8" }))); // 从文件中初始化撤回信息
  }
  set(key, value) {
    if (this.messageRecallPath) {
      this.map.set(key, value);
      if (this.map.size >= this.limit) {
        log("缓存撤回消息超过阈值，开始切片");
        const newFileName = `${new Date().getTime()}.json`;
        fs.writeFileSync(path.join(this.messageRecallPath, newFileName), JSON.stringify(Array.from(this.map)));
        this.newFileEvent.forEach((callback) => callback(newFileName));
        this.map = new Map();
      }
      fs.writeFileSync(this.latestPath, JSON.stringify(Array.from(this.map)));
    } else {
      console.error("该实例工作在只读模式");
    }
  }
  // 如果产生新的切片文件，将会调用该方法传入的回调
  onNewFile(callback) {
    if (this.messageRecallPath) {
      this.newFileEvent.push(callback);
    } else {
      console.error("该实例工作在只读模式");
    }
  }
  get(key) {
    return this.map.get(key);
  }
  has(key) {
    return this.map.has(key);
  }
  delete(key) {
    if (this.messageRecallPath) {
      this.map.delete(key);
    } else {
      console.error("该实例工作在只读模式");
    }
  }
}

const listenList = []; // 所有打开过的窗口对象
const catchMsgList = new LimitedMap(2000); // 内存缓存消息记录-用于根据消息id获取撤回原始内容
const messageRecallFileList = []; // 所有撤回消息本地切片列表
let peer = null; // 激活聊天界面信息
let historyMessageRecallList = new Map(); // 只读历史消息实例暂存数组
let localEmoticonsList = []; // 本地表情包数据

// 向所有未销毁页面发送广播
function globalBroadcast(channel, data) {
  listenList.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  });
}

// 下载被撤回的图片
function processPic(msgItem) {
  msgItem?.elements?.forEach(async (el) => {
    if (el?.picElement) {
      log("该消息含有图片", el);
      const pic = el.picElement;
      const picName = pic.md5HexStr.toUpperCase();
      const picUrl = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${picName}/`;
      if (!fs.existsSync(pic.sourcePath)) {
        log("下载原图", `${picUrl}0`);
        const body = await downloadPic(`${picUrl}0`);
        fs.mkdirSync(path.dirname(pic.sourcePath), { recursive: true });
        fs.writeFileSync(pic.sourcePath, body);
      }
      // 修复本地数据中的错误
      if (pic?.thumbPath && (pic.thumbPath instanceof Array || pic.thumbPath instanceof Object)) {
        pic.thumbPath = new Map([
          [0, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_0")],
          [198, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_198")],
          [720, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_720")],
        ]);
      }
      if (pic?.thumbPath && (pic.thumbPath instanceof Array || pic.thumbPath instanceof Map)) {
        pic.thumbPath.forEach(async (el, key) => {
          if (!fs.existsSync(el)) {
            log("下载缩略图", `${picUrl}${key}`);
            const body = await downloadPic(`${picUrl}${key}`);
            fs.mkdirSync(path.dirname(el), { recursive: true });
            fs.writeFileSync(el, body);
          }
        });
      }
    }
  });
}

// 下载方法
function downloadPic(url) {
  const protocolModule = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    function doRequest(url) {
      log("下载撤回消息中的图片", url);
      protocolModule.get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
        } else {
          const chunks = [];
          response.on("data", (chunk) => {
            chunks.push(chunk);
          });
          response.on("end", () => {
            const responseData = Buffer.concat(chunks);
            resolve(responseData); // 解析 Promise 并传递数据
            log("下载图片完成");
          });
          response.on("error", (err) => {
            log("下载图片失败", err);
            reject(err); // 解析 Promise 并传递错误
          });
        }
      });
    }
    doRequest(url);
  });
}

// 加载插件时触发
function onLoad(plugin) {
  const pluginDataPath = plugin.path.data;
  const settingsPath = path.join(pluginDataPath, "settings.json");
  const styleSassPath = path.join(plugin.path.plugin, "src/style.scss");
  const stylePath = path.join(plugin.path.plugin, "src/style.css");
  const globalScssPath = path.join(plugin.path.plugin, "src/global.scss");
  const globalPath = path.join(plugin.path.plugin, "src/global.css");
  const settingScssPath = path.join(plugin.path.plugin, "src/config/view.scss");
  const settingPath = path.join(plugin.path.plugin, "src/config/view.css");
  messageRecallPath = path.join(pluginDataPath, "/messageRecall");
  messageRecallJson = path.join(pluginDataPath, "/messageRecall/latestRecallMessage.json");

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
      log("读取到历史切片文件", messageRecallFileList);
    }
  });

  // 使用配置加载模块解决插件不同版本配置文件差异
  options = loadOptions(settingsPath);

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
      log("%c当前环境未安装sass，动态更新样式未启用", "background:#fe0000;color:#fff;");
    }
  } else {
    log = () => {};
  }

  // 控制台输出项目logo
  log(
    "%c轻量工具箱已加载",
    "border-radius: 8px;padding:10px 20px;font-size:18px;background:linear-gradient(to right, #3f7fe8, #03ddf2);color:#fff;",
    plugin,
  );

  // 监听本地表情包文件夹内的更新
  onUpdateEmoticons((emoticonsList) => {
    console.log("本地表情包更新", emoticonsList.length);
    globalBroadcast("LiteLoader.lite_tools.updateEmoticons", emoticonsList);
    localEmoticonsList = emoticonsList;
  });

  // 判断是否启用了本地表情包功能
  if (options.localEmoticons.enabled) {
    if (options.localEmoticons.localPath) {
      console.log("尝试加载本地表情包文件夹");
      loadEmoticons(options.localEmoticons.localPath);
    }
  }

  // 初始化常驻撤回消息历史记录-每100条记录切片为一个json文件
  recordMessageRecallIdList = new MessageRecallList(messageRecallJson, messageRecallPath, 100);

  // 监听常驻历史撤回记录实例创建新的文件切片
  recordMessageRecallIdList.onNewFile((newFileName) => {
    log("新增切片文件", newFileName);
    messageRecallFileList.push(newFileName.replace(".json", ""));
    // 排序文件名称
    messageRecallFileList.sort((a, b) => a - b);
  });

  // 返回本地表情包数据
  ipcMain.handle("LiteLoader.lite_tools.getLocalEmoticonsList", (event) => {
    log("返回本地表情包数据");
    return localEmoticonsList;
  });

  // 返回当前激活的peer数据
  ipcMain.handle("LiteLoader.lite_tools.getPeer", (event) => {
    log("返回peer", peer);
    return peer;
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
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    globalBroadcast("LiteLoader.lite_tools.updateOptions", options);
  });

  // 更新聊天框上方功能列表
  ipcMain.on("LiteLoader.lite_tools.sendChatTopList", (event, list) => {
    let res = new Map(),
      concat = options.chatAreaFuncList.concat(list);
    options.chatAreaFuncList = concat.filter((item) => !res.has(item["name"]) && res.set(item["name"], 1));
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    globalBroadcast("LiteLoader.lite_tools.updateOptions", options);
  });

  // 修改配置信息
  ipcMain.on("LiteLoader.lite_tools.setOptions", (event, opt) => {
    log("%c更新配置信息", "background:#1a5d1a;color:#fff;", opt);
    options = opt;
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    // 判断是否启用了本地表情包功能
    if (options.localEmoticons.enabled) {
      if (options.localEmoticons.localPath) {
        loadEmoticons(options.localEmoticons.localPath);
      }
    }
    globalBroadcast("LiteLoader.lite_tools.updateOptions", options);
  });

  // 获取配置信息
  ipcMain.on("LiteLoader.lite_tools.getOptions", (event) => {
    log("%c获取配置信息", "background:#1a5d1a;color:#fff;", options);
    event.returnValue = options;
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

  // 选择文件事件
  ipcMain.on("LiteLoader.lite_tools.openSelectBackground", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件", //默认路径,默认选择的文件
        defaultPath: "default.jpg", //过滤文件后缀
        filters: [
          {
            name: "img",
            extensions: ["jpg", "png", "gif"],
          },
        ], //打开按钮
        buttonLabel: "选择", //回调结果渲染到img标签上
      })
      .then((result) => {
        log("选择了文件", result);
        if (!result.canceled) {
          options.background.url = path.join(result.filePaths[0]).replace(/\\/g, "/");
          fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
          globalBroadcast("LiteLoader.lite_tools.updateOptions", options);
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });

  // 选择文件夹事件
  ipcMain.on("LiteLoader.lite_tools.openSelectFolder", () => {
    dialog
      .showOpenDialog({
        title: "请选择文件夹", //默认路径,默认选择的文件
        properties: ["openDirectory"],
        buttonLabel: "选择文件夹",
      })
      .then((result) => {
        console.log("选择了文件夹", result);
        if (!result.canceled) {
          options.localEmoticons.localPath = path.join(result.filePaths[0]).replace(/\\/g, "/");
          fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
          // 判断是否启用了本地表情包功能
          if (options.localEmoticons.enabled) {
            if (options.localEmoticons.localPath) {
              loadEmoticons(options.localEmoticons.localPath);
            }
          }
          globalBroadcast("LiteLoader.lite_tools.updateOptions", options);
        }
      })
      .catch((err) => {
        console.log("无效操作", err);
      });
  });
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
  // window.webContents.on("ipc-message", (_, channel, ...args) => {
  //   log(
  //     "%cipc-message被拦截",
  //     "background:#4477ce;color:#fff;",
  //     channel,
  //     args[1]?.[0]?.cmdName ? args[1]?.[0]?.cmdName : channel,
  //     args[1]?.[0],
  //     args
  //   );
  // });

  const proxyIpcMsg = new Proxy(window.webContents._events["-ipc-message"], {
    apply(target, thisArg, args) {
      // log("%c-ipc-message被拦截", "background:#f6ca00;color:#fff;", args[2], args[3]?.[0]?.eventName ? args[3]?.[0]?.eventName : args[3]?.[0], args[3], args);
      if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/sendMsg") {
        log("%c消息发送事件", "background:#5b9a8b;color:#fff;", args);
        if (args[3][1][1] && args[3][1][1].msgElements) {
          if (options.tail.enabled) {
            args[3][1][1].msgElements.forEach((el) => {
              if (el.textElement && el.textElement?.content?.length !== 0) {
                if (options.tail.newLine) {
                  el.textElement.content += "\n";
                }
                el.textElement.content += options.tail.content;
                log("%c消息增加后缀", "background:#5b9a8b;color:#fff;", el.textElement.content);
              }
            });
          }
        }
      }
      if (args[3]?.[1]?.[0] === "changeRecentContacPeerUid") {
        peer = {
          chatType: args[3]?.[1]?.[1].peerUid[0] === "u" ? "friend" : "group",
          uid: args[3]?.[1]?.[1].peerUid,
        };
        log("%c切换聊天窗口", "background:#b3642d;color:#fff;", peer);
      }
      if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/setMsgRead") {
        peer = {
          chatType: args[3]?.[1]?.[1].peer.peerUid[0] === "u" ? "friend" : "group",
          uid: args[3]?.[1]?.[1].peer.peerUid,
        };
        log("%c切换聚焦窗口", "background:#b3642d;color:#fff;", peer);
      }
      return target.apply(thisArg, args);
    },
  });
  window.webContents._events["-ipc-message"] = proxyIpcMsg;

  // 复写并监听ipc通信内容
  const original_send = window.webContents.send;
  const patched_send = function (channel, ...args) {
    // log("%cipc-send被拦截", "background:#74a488;color:#fff;", channel, args[1]?.[0]?.cmdName ? args[1]?.[0]?.cmdName : channel, args[1]?.[0], args);

    // 拦截侧边栏数据
    // if(args[1] && args[1]?.configData?.group && args[1]?.configData?.content){
    //   const temp =  JSON.parse(args[1].configData.content);
    //   args[1].configData.content = temp.map(el => {el.status = 2; return el})
    // }

    // if (options.message.convertMiniPrgmArk || options.message.showMsgTime) {
    // 捕获消息列表
    const msgList = args[1]?.msgList;
    if (msgList && msgList.length) {
      log("解析到消息数据", msgList);
      // 遍历消息列表中的所有消息
      if (options.message.showMsgTime || options.message.convertMiniPrgmArk || options.message.preventMessageRecall) {
        msgList.forEach((msgItem, index) => {
          let msg_seq = msgItem.msgSeq;
          // 遍历消息内容数组
          if (options.message.convertMiniPrgmArk || options.message.preventMessageRecall) {
            msgItem.elements.forEach((msgElements) => {
              // 替换历史消息中的小程序卡片
              if (msgElements?.arkElement?.bytesData && options.message.convertMiniPrgmArk) {
                const json = JSON.parse(msgElements.arkElement.bytesData);
                if (json?.prompt.includes("[QQ小程序]")) {
                  msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
                }
              }
              // 替换被撤回的消息内容
              if (options.message.preventMessageRecall) {
                if (
                  msgElements?.grayTipElement?.revokeElement &&
                  !msgElements?.grayTipElement?.revokeElement?.isSelfOperate
                ) {
                  // 尝试从内存中查找对应消息并替换元素
                  const findInCatch = catchMsgList.get(msgItem.msgId);
                  if (findInCatch) {
                    log(
                      `%c ${msgItem.msgId} 从消息列表中找到消息记录`,
                      "background-color:#7eb047;color:#ffffff;",
                      findInCatch,
                    );
                    // 如果是从最新的缓存中获取到的原内容，则需要存入常驻历史撤回记录
                    recordMessageRecallIdList.set(findInCatch.msgId, findInCatch);
                    // 为避免重复写入常驻历史撤回记录，从消息记录中移除已经被使用过的数据
                    catchMsgList.delete(msgItem.msgId);
                    // 下载消息内的图片并修复数据结构
                    processPic(findInCatch);
                    // 替换撤回标记
                    msgList[index] = findInCatch;
                  } else {
                    // 从常驻撤回消息中查找消息id
                    const findInRecord = recordMessageRecallIdList.get(msgItem.msgId);
                    if (findInRecord) {
                      log(
                        `%c ${msgItem.msgId} 从常驻缓存中找到消息记录`,
                        "background-color:#7eb047;color:#ffffff;",
                        findInRecord,
                      );
                      // 下载消息内的图片并修复数据结构
                      processPic(findInRecord);
                      // 替换撤回标记
                      msgList[index] = findInRecord;
                    } else {
                      // 没有记录的消息暂时不进行操作
                      // log(`%c ${msgItem.msgId} 没有记录消息内容`, "background-color:#e64a19;color:#ffffff;");
                      // 获取消息发送时间-在实际时间后面加1秒的原因是如果刚好处于文件切片位置，切片文件因为精度问题会大于该时间1秒以内
                      const msgRecallTime = parseInt(msgItem.recallTime) * 1000;
                      // 根据时间找到可能含有数据的历史记录切片
                      const historyFile = messageRecallFileList.find((fileName) => parseInt(fileName) >= msgRecallTime);
                      log(
                        "判断历史切片是否可能含有撤回内容",
                        messageRecallFileList,
                        msgItem.msgId,
                        msgRecallTime,
                        historyFile,
                      );
                      if (historyFile) {
                        // 创建只读实例用于匹配消息id，创建的实例将在遍历完所有消息后统一销毁
                        if (!historyMessageRecallList.has(historyFile)) {
                          historyMessageRecallList.set(
                            historyFile,
                            new MessageRecallList(path.join(messageRecallPath, `${historyFile}.json`)),
                          );
                        }
                        const findInHistory = historyMessageRecallList.get(historyFile).get(msgItem.msgId);
                        if (findInHistory) {
                          log(
                            `%c ${msgItem.msgId} 从历史缓存中找到消息记录`,
                            "background-color:#7eb047;color:#ffffff;",
                            findInHistory,
                          );
                          // 下载消息内的图片并修复数据结构
                          processPic(findInHistory);
                          // 替换撤回标记
                          msgList[index] = findInHistory;
                        } else {
                          // 没有记录的消息暂时不进行操作
                          log(`%c ${msgItem.msgId} 没有记录消息内容`, "background-color:#e64a19;color:#ffffff;");
                        }
                      } else {
                        log(`%c ${msgItem.msgId} 没有对应时间的历史切片`, "background-color:#e64a19;color:#ffffff;");
                      }
                    }
                  }
                  msgList[index].lite_tools_recall = {
                    operatorNick: msgElements.grayTipElement.revokeElement.operatorNick, // 执行撤回的角色
                    origMsgSenderNick: msgElements.grayTipElement.revokeElement.origMsgSenderNick, // 发送消息角色
                    recallTime: msgItem.recallTime, // 撤回时间
                  };
                } else if (msgElements?.grayTipElement?.revokeElement?.isSelfOperate) {
                  log("自己的撤回操作，放行");
                } else {
                  // 不是撤回标记则记录进内存缓存中
                  catchMsgList.set(msgItem.msgId, msgItem);
                }
              }
            });
          }
        });
      }
      // 销毁加载的只读历史数据实例
      historyMessageRecallList = new Map();
    }

    // 捕获接收到消息事件-替换新消息中的小程序卡片
    const onAddSendMsg = args[1]
      ? Array.isArray(args[1])
        ? args[1].findIndex((item) => item.cmdName === "nodeIKernelMsgListener/onAddSendMsg")
        : -1
      : -1;
    if (onAddSendMsg !== -1) {
      log("这是我发送的新消息", args[1]);
      // 阻止撤回
      if (options.message.preventMessageRecall) {
        // 不是撤回标记则记录进内存缓存中
        catchMsgList.set(args[1][onAddSendMsg].payload.msgRecord.msgId, args[1][onAddSendMsg].payload.msgRecord);
      }
      // 获取消息id和发送时间存入map
      // if (options.message.showMsgTime) {
      //   msgIdList.set(args[1][onAddSendMsg].payload.msgRecord.msgId, {
      //     msgTime: args[1][onAddSendMsg].payload.msgRecord.msgTime * 1000,
      //     senderUid: args[1][onAddSendMsg].payload.msgRecord.senderUid,
      //   });
      // }
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

    // 捕获自身发送消息事件-替换新消息中的小程序卡片
    const onRecvMsg = args[1]
      ? Array.isArray(args[1])
        ? args[1].findIndex((item) => item.cmdName === "nodeIKernelMsgListener/onRecvMsg")
        : -1
      : -1;
    if (onRecvMsg !== -1) {
      log("这是新接收到的消息", args[1]);
      args[1][onRecvMsg].payload.msgList.forEach((arrs) => {
        // 阻止撤回
        if (options.message.preventMessageRecall) {
          // 不是撤回标记则记录进内存缓存中
          catchMsgList.set(arrs.msgId, arrs);
        }
        // 获取消息id和发送时间存入数组
        // if (options.message.showMsgTime) {
        //   msgIdList.set(arrs.msgId, { msgTime: arrs.msgTime * 1000, senderUid: arrs.senderUid });
        // }
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

    // 捕获重排消息事件-拦截撤回指令
    const onMsgInfoListUpdate = args[1]
      ? Array.isArray(args[1])
        ? args[1].findIndex((item) => item.cmdName === "nodeIKernelMsgListener/onMsgInfoListUpdate")
        : -1
      : -1;
    if (onMsgInfoListUpdate !== -1) {
      log("更新消息信息列表", args[1]);
      const msgItem = args[1][0]?.payload?.msgList[0];
      if (options.message.preventMessageRecall && msgItem.elements[0]?.grayTipElement?.revokeElement) {
        if (!msgItem.elements[0].grayTipElement.revokeElement.isSelfOperate) {
          log("捕获到撤回事件，已被阻止");
          const findInCatch = catchMsgList.get(msgItem.msgId);
          // 广播撤回事件
          const recallData = {
            operatorNick: msgItem.elements[0].grayTipElement.revokeElement.operatorNick, // 执行撤回的角色
            origMsgSenderNick: msgItem.elements[0].grayTipElement.revokeElement.origMsgSenderNick, // 发送消息角色
            recallTime: msgItem.recallTime, // 撤回时间
          };
          globalBroadcast("LiteLoader.lite_tools.onMessageRecall", {
            msgId: findInCatch.msgId,
            recallData,
          });
          // 写入常驻内存缓存
          recordMessageRecallIdList.set(findInCatch.msgId, findInCatch);
          // 从消息列表缓存移除
          catchMsgList.delete(msgItem.msgId);
          // 下载消息内的图片并修复数据结构
          processPic(findInCatch);
          findInCatch.lite_tools_recall = recallData;
          // 替换撤回内容
          msgItem = findInCatch;
        } else {
          log("本人发起的撤回，放行");
        }
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
