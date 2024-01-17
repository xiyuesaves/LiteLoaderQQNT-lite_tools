// 运行在 Electron 主进程 下的插件入口
const { ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const EventEmitter = require("events");

// 自定义事件
const optionsEvent = new EventEmitter();

// 本地模块
const defaultConfig = require("./defaultConfig/defaultConfig.json"); // 默认插件配置文件
const defalutLocalEmoticonsConfig = require("./defaultConfig/defalutLocalEmoticonsConfig.json"); // 默认本地表情配置文件
const loadOptions = require("./main_modules/loadOptions");
const { loadEmoticons, onUpdateEmoticons } = require("./main_modules/localEmoticons");
const { LimitedMap } = require("./main_modules/LimitedMap");
const { MessageRecallList } = require("./main_modules/MessageRecallList");
const { globalBroadcast } = require("./main_modules/globalBroadcast");
const { processPic } = require("./main_modules/processPic");
const { replaceArk } = require("./main_modules/replaceArk");
const { debounce } = require("./main_modules/debounce");
const { logs } = require("./main_modules/logs");

let log = () => {};

/**
 * 主窗口对象
 */
let mainMessage;
/**
 * 常驻撤回历史消息
 */
let recordMessageRecallIdList;
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
 * 所有打开过的窗口对象
 */
const listenList = [];
/**
 * 内存缓存消息记录-用于根据消息id获取撤回原始内容
 */
const catchMsgList = new LimitedMap(2000);
/**
 * 所有撤回消息本地切片列表
 */
const messageRecallFileList = [];
/**
 * 当前激活的聊天窗口数据
 */
let peer = null;
/**
 * 只读历史消息实例暂存数组
 */
let historyMessageRecallList = new Map();
/**
 * 本地表情包数据
 */
let localEmoticonsList = [];
/**
 * 配置数据
 */
let options, localEmoticonsConfig;

optionsEvent.on("beforeUpdate", (newOptions) => {
  // 判断是否启用了本地表情包功能
  if (newOptions.localEmoticons.enabled) {
    // 如果新的配置文件中打开了本地表情功能，且当前文件夹路径和新路径不一致则刷新表情包列表
    if (newOptions.localEmoticons.localPath && options.localEmoticons.localPath !== newOptions.localEmoticons.localPath) {
      resetCommonlyEmoticons(); // 重置常用表情
      loadEmoticons(newOptions.localEmoticons.localPath); // 读取本地表情文件夹
    }
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  }
  if (newOptions.localEmoticons.commonlyNum !== options.localEmoticons.commonlyNum) {
    if (newOptions.localEmoticons.commonlyNum < options.localEmoticons.commonlyNum) {
      localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.splice(0, newOptions.localEmoticons.commonlyNum);
      globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
      fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
    }
  }
});

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
  localEmoticonsPath = path.join(pluginDataPath, "localEmoticonsConfig.json");

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
    }
  });

  // 使用配置加载模块解决插件不同版本配置文件差异
  options = loadOptions(defaultConfig, settingsPath);
  localEmoticonsConfig = loadOptions(defalutLocalEmoticonsConfig, localEmoticonsPath);

  if (options.debug) {
    let mainLogs = new logs("主进程");
    mainLogs.startLogServer();
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
          globalBroadcast(listenList, "LiteLoader.lite_tools.updateStyle", cssText);
        }, 100),
      );
      // 监听并编译global.scss
      fs.watch(
        globalScssPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(globalScssPath).css;
          fs.writeFileSync(globalPath, cssText);
          globalBroadcast(listenList, "LiteLoader.lite_tools.updateGlobalStyle", cssText);
        }, 100),
      );
      // 监听并编译view.scss
      fs.watch(
        settingScssPath,
        "utf-8",
        debounce(() => {
          const cssText = sass.compile(settingScssPath).css;
          fs.writeFileSync(settingPath, cssText);
          globalBroadcast(listenList, "LiteLoader.lite_tools.updateSettingStyle");
        }, 100),
      );
    } catch {
      log("当前环境未安装sass，动态更新样式未启用");
    }
  }
  // 控制台输出项目logo
  log("轻量工具箱已加载");

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

    // 如果没有启用历史表情，则不推送，但是仍旧要更新配置文件
    localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.filter((path) => newPaths.has(path));
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateEmoticons", emoticonsList);
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
    fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
  });

  // 判断是否启用了本地表情包功能
  if (options.localEmoticons.enabled) {
    if (options.localEmoticons.localPath) {
      log("尝试加载本地表情包文件夹");
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
    let res = new Map(),
      concat = options.textAreaFuncList.concat(list);
    options.textAreaFuncList = concat.filter((item) => !res.has(item["name"]) && res.set(item["name"], 1));
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateOptions", options);
  });

  // 更新聊天框上方功能列表
  ipcMain.on("LiteLoader.lite_tools.sendChatTopList", (event, list) => {
    let res = new Map(),
      concat = options.chatAreaFuncList.concat(list);
    options.chatAreaFuncList = concat.filter((item) => !res.has(item["name"]) && res.set(item["name"], 1));
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateOptions", options);
  });

  // 修改配置信息
  ipcMain.on("LiteLoader.lite_tools.setOptions", (event, opt) => {
    log("更新配置信息", opt);
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateOptions", opt);
    optionsEvent.emit("beforeUpdate", opt);
    options = opt;
    fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
    optionsEvent.emit("update", opt);
  });

  // 获取配置信息
  ipcMain.on("LiteLoader.lite_tools.getOptions", (event) => {
    log("获取配置信息");
    event.returnValue = options;
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
    globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
    fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
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
          options.background.url = path.join(result.filePaths[0]);
          fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
          globalBroadcast(listenList, "LiteLoader.lite_tools.updateOptions", options);
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
          fs.writeFileSync(settingsPath, JSON.stringify(options, null, 4));
          globalBroadcast(listenList, "LiteLoader.lite_tools.updateOptions", options);
        }
      })
      .catch((err) => {
        log("无效操作", err);
      });
  });
}
onLoad(LiteLoader.plugins["lite_tools"]);

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

  // 代理官方监听器
  const proxyIpcMsg = new Proxy(window.webContents._events["-ipc-message"], {
    apply(target, thisArg, args) {
      log("get", args);
      if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/sendMsg") {
        log("消息发送事件", args);
        if (args[3][1][1] && args[3][1][1].msgElements) {
          if (options.tail.enabled) {
            const peerUid = args[3][1][1]?.peer?.peerUid;
            const chatType = args[3][1][1]?.peer?.chatType;
            const tail = options.tail.list.find((tail) => {
              if (tail.filter.length === 1 && tail.filter[0] === "") {
                return true;
              }
              if (tail.filter.includes(peerUid)) {
                return true;
              }
            });
            log(options.tail.list, tail);
            // 必须含有peerUid且匹配到后缀数据且聊天类型为群组才会执行
            if (peerUid && tail && chatType === 2) {
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
        peer = {
          chatType: args[3]?.[1]?.[1].peerUid[0] === "u" ? "friend" : "group",
          uid: args[3]?.[1]?.[1].peerUid,
          guildId: args[3]?.[1]?.[1].peer.guildId,
        };
        log("切换聊天窗口", peer);
      }
      if (args[3]?.[1]?.[0] === "nodeIKernelMsgService/setMsgRead") {
        peer = {
          chatType: args[3]?.[1]?.[1].peer.peerUid[0] === "u" ? "friend" : "group",
          uid: args[3]?.[1]?.[1].peer.peerUid,
          guildId: args[3]?.[1]?.[1].peer.guildId,
        };
        log("切换聚焦窗口", peer);
      }
      return target.apply(thisArg, args);
    },
  });
  window.webContents._events["-ipc-message"] = proxyIpcMsg;

  // 复写并监听ipc通信内容
  const original_send = window.webContents.send;

  // 主进程发送消息方法
  const patched_send = function (channel, ...args) {
    log("send", channel, args);
    // 捕获消息列表
    const msgList = args[1]?.msgList;
    if (msgList && msgList.length) {
      log("解析到消息数据");
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
                if (msgElements?.grayTipElement?.revokeElement && !msgElements?.grayTipElement?.revokeElement?.isSelfOperate) {
                  // 尝试从内存中查找对应消息并替换元素
                  const findInCatch = catchMsgList.get(msgItem.msgId);
                  if (findInCatch) {
                    log(`${msgItem.msgId} 从消息列表中找到消息记录`, findInCatch);
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
                      log(`${msgItem.msgId} 从常驻缓存中找到消息记录`, findInRecord.peerName, findInRecord.sendNickName);
                      // 下载消息内的图片并修复数据结构
                      processPic(findInRecord);
                      // 替换撤回标记
                      msgList[index] = findInRecord;
                    } else {
                      // 没有记录的消息暂时不进行操作
                      // 获取消息发送时间-在实际时间后面加1秒的原因是如果刚好处于文件切片位置，切片文件因为精度问题会大于该时间1秒以内
                      const msgRecallTime = parseInt(msgItem.recallTime) * 1000;
                      // 根据时间找到可能含有数据的历史记录切片
                      const historyFile = messageRecallFileList.find((fileName) => parseInt(fileName) >= msgRecallTime);
                      log("判断历史切片是否可能含有撤回内容", messageRecallFileList, msgItem.msgId, msgRecallTime, historyFile);
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
                          log(` ${msgItem.msgId} 从历史缓存中找到消息记录`, findInHistory);
                          // 下载消息内的图片并修复数据结构
                          processPic(findInHistory);
                          // 替换撤回标记
                          msgList[index] = findInHistory;
                        } else {
                          // 没有记录的消息暂时不进行操作
                          log(` ${msgItem.msgId} 没有记录消息内容`);
                        }
                      } else {
                        log(` ${msgItem.msgId} 没有对应时间的历史切片`);
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
    const onAddSendMsg = findEventIndex(args, "nodeIKernelMsgListener/onAddSendMsg");
    if (onAddSendMsg !== -1) {
      log("这是我发送的新消息", args[1]);
      // 阻止撤回
      if (options.message.preventMessageRecall) {
        // 不是撤回标记则记录进内存缓存中
        catchMsgList.set(args[1][onAddSendMsg].payload.msgRecord.msgId, args[1][onAddSendMsg].payload.msgRecord);
      }
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
    const onRecvMsg = findEventIndex(args, "nodeIKernelMsgListener/onRecvMsg");
    if (onRecvMsg !== -1) {
      // log("收到新消息", args[1]);
      args[1][onRecvMsg].payload.msgList.forEach((arrs) => {
        // 阻止撤回
        if (options.message.preventMessageRecall) {
          // 不是撤回标记则记录进内存缓存中
          catchMsgList.set(arrs.msgId, arrs);
        }
        // 打开发给自己的链接
        if (options.message.autoOpenURL) {
          if (arrs.msgSeq === "0" && arrs.senderUid === arrs.peerUid && arrs.chatType === 8) {
            log("来自我的手机的消息", arrs);
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
    const onMsgInfoListUpdate = findEventIndex(args, "nodeIKernelMsgListener/onMsgInfoListUpdate");
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
          globalBroadcast(listenList, "LiteLoader.lite_tools.onMessageRecall", {
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
  log("重置常用表情");
  localEmoticonsConfig.commonlyEmoticons = [];
  globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
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
  globalBroadcast(listenList, "LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  fs.writeFileSync(localEmoticonsPath, JSON.stringify(localEmoticonsConfig, null, 4));
}

module.exports = {
  onBrowserWindowCreated,
};
