import { join } from "path";
import { readdir, existsSync, mkdirSync, writeFileSync, unlink } from "fs";
import { ipcMain, dialog, BrowserWindow } from "electron";
import { config, loadConfigPath, onUpdateConfig } from "./config.js";
import { settingWindow } from "./captureWindow.js";
import { MessageRecallList } from "./MessageRecallList.js";
import { globalBroadcast } from "./globalBroadcast.js";
import { Logs } from "./logs.js";
const log = new Logs("阻止撤回模块");

/**
 * 撤回数据保存文件夹路径
 * @type {string}
 */
let recallMsgDataFolderPath;
/**
 * 最新的撤回消息本地json文件路径
 * @type {string}
 */
let recallMsgDataPath;

/**
 * 常驻内存撤回数据
 * @type {MessageRecallList} 撤回数据实例
 */
let recordMessageRecallIdList;

/**
 * 内存缓存撤回消息
 */
let tempRecordMessageRecallIdList;

/**
 * 撤回消息数量
 * @type {number}
 */
let localRecallMsgNum;

/**
 * 历史撤回消息文件列表
 */
let messageRecallFileList;

/**
 * 查看撤回数据窗口
 */
let recallViewWindow;

/**
 * 加载阻止撤回模块
 * @param {String} loadConfigPath 本地配置文件路径
 */
onUpdateConfig(() => {
  log("加载配置文件", loadConfigPath);
  recallMsgDataFolderPath = join(loadConfigPath, "messageRecall");
  recallMsgDataPath = join(recallMsgDataFolderPath, "latestRecallMessage.json");
  initLocalFile();
  recordMessageRecallIdList = new MessageRecallList(recallMsgDataPath, recallMsgDataFolderPath, 100);
  tempRecordMessageRecallIdList = new Map();
  // 监听常驻历史撤回记录实例创建新的文件切片
  recordMessageRecallIdList.onNewFile((sliceTime) => {
    messageRecallFileList.push(sliceTime);
    messageRecallFileList.sort((a, b) => a - b);
  });
  recordMessageRecallIdList.onNewRecallMsg(() => {
    localRecallMsgNum = messageRecallFileList.length * 100 + recordMessageRecallIdList.map.size;
    globalBroadcast("LiteLoader.lite_tools.updateRecallListNum", localRecallMsgNum);
  });
});

function messageRecall(args) {}

function initLocalFile() {
  // 初始化撤回消息列表文件路径
  if (!existsSync(recallMsgDataFolderPath)) {
    mkdirSync(recallMsgDataFolderPath, { recursive: true });
  }
  // 初始化当前撤回消息保存文件
  if (!existsSync(recallMsgDataPath)) {
    writeFileSync(recallMsgDataPath, JSON.stringify([], null, 4));
  }
  // 获取当前撤回消息文件列表
  readdir(recallMsgDataFolderPath, (err, dirList) => {
    if (!err) {
      messageRecallFileList = dirList
        .filter((item) => parseInt(item).toString().length === 13)
        .map((item) => parseInt(item.replace(".json", "")))
        .sort((a, b) => a - b);
      localRecallMsgNum = messageRecallFileList.length * 100;
    } else {
      log("获取历史撤回数据列表失败", err);
    }
  });
}

/**
 * 清理本地撤回数据
 */
function deleteAllLocalRecallData() {
  // 读取目录中的所有文件
  readdir(recallMsgDataFolderPath, (err, files) => {
    if (err) {
      console.error("无法读取该文件夹:", err);
      return;
    }
    // 遍历文件数组，删除历史数据
    files.forEach((file) => {
      const filePath = join(recallMsgDataFolderPath, file);
      if (file !== "latestRecallMessage.json") {
        // 删除文件
        unlink(filePath, (err) => {
          if (err) {
            console.error("删除文件失败:", err);
          } else {
            log("删除成功:", filePath);
          }
        });
      }
    });
    settingWindow.webContents.send("LiteLoader.lite_tools.onToast", {
      content: `删除成功`,
      type: "success",
      duration: "3000",
    });
  });
}

// 删除所有本地保存撤回记录
ipcMain.on("LiteLoader.lite_tools.clearLocalStorageRecallMsg", () => {
  log("尝试清除本地数据");
  const result = dialog.showMessageBoxSync(settingWindow, {
    type: "warning",
    title: "警告",
    message: "您即将清空所有撤回消息数据，是否继续？",
    buttons: ["是", "否"],
    defaultId: 0,
    cancelId: 1,
  });
  if (result === 0) {
    recordMessageRecallIdList.map = new Map();
    recordMessageRecallIdList.saveFile();
    deleteAllLocalRecallData();
    messageRecallFileList = [];
    localRecallMsgNum = 0;
    settingWindow.webContents.send("LiteLoader.lite_tools.updateRecallListNum", localRecallMsgNum);
    log("已清空本地消息记录");
  }
});

// 查看本地撤回数据
ipcMain.on("LiteLoader.lite_tools.openRecallMsgList", () => {
  if (recallViewWindow) {
    recallViewWindow.webContents.focus();
  } else {
    log("打开撤回消息查看窗口");
    recallViewWindow = new BrowserWindow({
      width: 800,
      height: 600,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(LiteLoader.plugins.lite_tools.path.plugin, "/src/preload.js"),
      },
    });
    recallViewWindow.loadFile(join(LiteLoader.plugins.lite_tools.path.plugin, `/src/html/showRecallList.html`));
    log("加载页面");
    recallViewWindow.webContents.on("before-input-event", (_, input) => {
      if (input.key == "F5" && input.type == "keyUp") {
        log("刷新页面");
        recallViewWindow.loadFile(join(LiteLoader.plugins.lite_tools.path.plugin, `/src/html/showRecallList.html`));
      }
    });
    recallViewWindow.on("closed", () => {
      log("窗口被关闭");
      recallViewWindow = null;
    });
  }
});

// 获取本地保存的撤回消息数量
ipcMain.on("LiteLoader.lite_tools.getRecallListNum", (event) => {
  event.returnValue = localRecallMsgNum;
});

// 发送所有的本地撤回数据
ipcMain.on("LiteLoader.lite_tools.getReacllMsgData", () => {
  log("开始发送所有的本地撤回数据");
  recallViewWindow.webContents.send(
    "LiteLoader.lite_tools.onReacllMsgData",
    recordMessageRecallIdList.map,
    messageRecallFileList.length - 1,
  );
  for (let i = 0; i < messageRecallFileList.length; i++) {
    const sliceTime = messageRecallFileList[i];
    const recall = new MessageRecallList(join(recallMsgDataFolderPath, `${sliceTime}.json`));
    recallViewWindow.webContents.send("LiteLoader.lite_tools.onReacllMsgData", recall.map, messageRecallFileList.length - i - 1);
    log("发送切片数据", sliceTime);
  }
  log("发送结束");
});

export { messageRecall };
