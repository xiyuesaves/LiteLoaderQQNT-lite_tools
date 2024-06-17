import { ipcMain, shell, dialog, BrowserWindow } from "electron";
import { normalize, join } from "path";
import { config, updateConfig } from "./config.js";
import { copyFile, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { fetch } from "undici";
import { getRkey } from "./getRkey.js";
import { Logs } from "./logs.js";
const log = new Logs("initMain");
import { EventEmitter } from "events";
const mainEvent = new EventEmitter();
// 重置函数this指向
ipcMain.emit = ipcMain.emit.bind(ipcMain);

function initMain() {
  log("初始化主进程", config);
}

function sendIpc(args) {
  mainEvent.emit("send", ...args);
}

// 通用ipc事件处理

// 打开网址
ipcMain.on("LiteLoader.lite_tools.openWeb", (_, url) => {
  shell.openExternal(url);
});

// 复制文件
ipcMain.handle("LiteLoader.lite_tools.copyFile", async (_, from, to) => {
  return new Promise((res) => {
    copyFile(from, to, (err) => {
      if (err) {
        res(false);
      } else {
        res(true);
      }
    });
  });
});

// 返回窗口id
ipcMain.on("LiteLoader.lite_tools.getWebContentId", (event) => {
  log("获取窗口id", event.sender.id.toString());
  event.returnValue = event.sender.id.toString();
});

// 更新侧边栏功能列表
ipcMain.on("LiteLoader.lite_tools.sendSidebar", (_, list) => {
  // 改为增量更新，不移除已被添加的选项
  const topSet = new Set(config.sidebar.top.map((el) => el.name));
  const bottomSet = new Set(config.sidebar.bottom.map((el) => el.name));
  const addTop = list.top.filter((item) => !topSet.has(item.name));
  const addBottom = list.bottom.filter((item) => !bottomSet.has(item.name));
  config.sidebar.top = config.sidebar.top.concat(addTop);
  config.sidebar.bottom = config.sidebar.bottom.concat(addBottom);
  updateConfig(config);
});

// 更新输入框上方功能列表
ipcMain.on("LiteLoader.lite_tools.sendTextAreaList", (_, list) => {
  list.forEach((item) => {
    const find = config.textAreaFuncList.find((el) => el.id === item.id);
    if (find) {
      find.name === item.name;
    }
    if (!find) {
      config.textAreaFuncList.push(item);
    }
  });
  updateConfig(config);
});

// 更新聊天框上方功能列表
ipcMain.on("LiteLoader.lite_tools.sendChatTopList", (_, list) => {
  list.forEach((item) => {
    const find = config.chatAreaFuncList.find((el) => el.id === item.id);
    if (find) {
      find.name = item.name;
    }
    if (!find) {
      config.chatAreaFuncList.push(item);
    }
  });
  updateConfig(config);
});

// 打开文件夹
ipcMain.on("LiteLoader.lite_tools.openFolder", (_, localPath) => {
  const openPath = normalize(localPath);
  shell.showItemInFolder(openPath);
});

// 打开文件
ipcMain.on("LiteLoader.lite_tools.openFile", (_, localPath) => {
  const openPath = normalize(localPath);
  shell.openPath(openPath);
});

// 获取用户信息事件
ipcMain.handle("LiteLoader.lite_tools.getUserInfo", async (_, uid) => {
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
    ipcMain.emit("IPC_UP_2", {}, { type: "request", callbackId: randomUUID(), eventName: "ns-ntApi-2" }, [
      "nodeIKernelProfileService/getUserDetailInfo",
      { uid: uid },
      null,
    ]);
  });
  return userInfo;
});

// 跳转到指定聊天窗口的对应消息
ipcMain.on("LiteLoader.lite_tools.sendToMsg", (_, sceneData) => {
  ipcMain.emit(
    "IPC_UP_2",
    {
      sender: {
        send: () => {},
      },
    },
    { type: "request", callbackId: randomUUID(), eventName: "ns-WindowApi-2" },
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

// 设置窗口图标
ipcMain.on("LiteLoader.lite_tools.setWindowIcon", (_, path, webContentId) => {
  try {
    const webContent = BrowserWindow.fromId(parseInt(webContentId));
    webContent.setIcon(path);
  } catch (err) {
    log("设置窗口图标失败", err.message);
  }
});
// 调试用代码

// 保存图片消息到本地
ipcMain.on("LiteLoader.lite_tools.saveBase64ToFile", async (_, fileName, base64) => {
  log("接收到保存为文件事件");
  const buffer = Buffer.from(base64.split(",")[1], "base64");
  if (config.messageToImage.path && existsSync(config.messageToImage.path)) {
    const savePath = join(config.messageToImage.path, fileName);
    log("默认文件路径", savePath);
    writeFileSync(savePath, buffer, { encoding: null });
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
          writeFileSync(result.filePath, buffer, { encoding: null });
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
        const newPath = join(result.filePaths[0]);
        config.messageToImage.path = newPath;
        updateConfig(config);
      }
    })
    .catch((err) => {
      log("无效操作", err);
    });
});

// 获取rkey
ipcMain.handle("LiteLoader.lite_tools.getRkey", async (_, chatType) => {
  const chatTypeStr = chatType === 2 ? "group_rkey" : "private_rkey";
  return await getRkey(chatTypeStr);
});

// 获取插件更新
ipcMain.handle("LiteLoader.lite_tools.checkUpdate", async () => {
  return (await fetch(config.global.updateUrl)).json();
});

export { initMain, sendIpc };
