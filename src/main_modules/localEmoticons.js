import { watch, existsSync, readdir, statSync, writeFileSync, unlinkSync } from "fs";
import { ipcMain, dialog } from "electron";
import { normalize, join, extname, basename } from "path";
import { config, updateConfig, loadConfigPath, onUpdateConfig } from "./config.js";
import { globalBroadcast } from "./globalBroadcast.js";
import { debounce } from "./debounce.js";
/**
 * 配置模板
 */
const localEmoticonsConfigTemplate = require("../config/localEmoticonsConfigTemplate.json");

import { Logs } from "./logs.js";
const log = new Logs("本地表情模块");

/**
 * 本地表情配置文件
 */
let localEmoticonsConfig;
/**
 * 本地表情配置文件路径
 */
let localEmoticonsConfigPath;
/**
 * 表情分组列表
 */
let emoticonsList = [];
/**
 * 文件监听函数信号
 * @type {AbortController[]}
 */
let signals = [];
/**
 * 加载文件夹路径
 */
let localPath = null;

/**
 * 本地表情常用表情数量
 */
let oldCommonlyNum = -1;

onUpdateConfig(async () => {
  // 初始化配置文件
  localEmoticonsConfigPath = join(loadConfigPath, "localEmoticonsConfig.json");
  if (!existsSync(localEmoticonsConfigPath)) {
    writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfigTemplate, null, 4));
  }
  localEmoticonsConfig = require(localEmoticonsConfigPath);
  log("本地表情配置文件", localPath, config.localEmoticons.localPath);
  if (config.localEmoticons.enabled && config.localEmoticons.localPath) {
    if (localPath !== config.localEmoticons.localPath) {
      if (localPath !== null) {
        resetCommonlyEmoticons();
      }
      localPath = config.localEmoticons.localPath;
      signals.forEach((signal) => {
        signal.abort();
      });
      log("功能启用，开始加载文件夹", config.localEmoticons.localPath);
      emoticonsList = await loadFolder(config.localEmoticons.localPath);
      updateEmoticonList();
    } else {
      log("路径没有变化，无需更新");
    }
  } else {
    log("功能关闭");
    localPath = null;
    emoticonsList = [];
    signals.forEach((signal) => {
      signal.abort();
    });
  }
  // 如果没有启用历史表情，或者关闭了历史表情，则清除数据
  if (!config.localEmoticons.commonlyEmoticons) {
    resetCommonlyEmoticons();
  }
  // 动态更新历史表情数量限制
  if (oldCommonlyNum === -1) {
    oldCommonlyNum = config.localEmoticons.commonlyNum;
  }
  if (config.localEmoticons.commonlyNum !== oldCommonlyNum) {
    if (config.localEmoticons.commonlyNum < oldCommonlyNum) {
      localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.splice(0, config.localEmoticons.commonlyNum);
      globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
      writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfig, null, 4));
    }
    oldCommonlyNum = config.localEmoticons.commonlyNum;
  }
});

const folderUpdate = debounce(async () => {
  log("检测到文件夹更新");
  emoticonsList = await loadFolder(config.localEmoticons.localPath);
  updateEmoticonList();
}, 100);

/**
 * 批量监听文件夹变动
 * @param {String} String 文件夹路径
 */
function addWatchFolders(path) {
  const signal = new AbortController();
  signals.push(signal);
  const watcher = watch(path, { signal: signal.signal });
  watcher.on("change", folderUpdate);
}

/**
 * 异步加载文件夹及其内容到列表中。
 *
 * @param {string} folderPath - 要加载的文件夹的路径。
 * @param {number} [itemIndex=0] - 列表中项目的起始索引。
 * @return {Promise<Array>} 一个解析为表示文件夹及其内容的对象数组的 Promise。
 */
async function loadFolder(folderPath, itemIndex = 0) {
  const list = [];
  const thisItemIndex = itemIndex;
  let nextItemIndex = itemIndex;
  if (existsSync(folderPath)) {
    addWatchFolders(folderPath);
    // 异步io操作
    const files = await new Promise((res) => {
      readdir(folderPath, (err, files) => {
        if (err) {
          res([]);
        }
        res(files);
      });
    });
    let listIndex = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = normalize(join(folderPath, file));
      const fileStat = statSync(filePath, {
        throwIfNoEntry: false,
      });
      if (fileStat) {
        if (fileStat.isFile()) {
          if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(extname(filePath).toLocaleLowerCase())) {
            continue;
          }
          const id = Buffer.from(folderPath).toString("base64");
          if (!list[0] || list[0].id !== id) {
            list.unshift({
              name: basename(folderPath),
              index: thisItemIndex,
              id,
              path: folderPath,
              list: [],
            });
          }
          list[0].list.push({
            path: filePath,
            name: basename(filePath),
            index: listIndex,
          });
          listIndex++;
        } else if (fileStat.isDirectory()) {
          nextItemIndex++;
          list.push(...(await loadFolder(filePath, nextItemIndex)));
        }
      }
    }
  }
  return list;
}

function updateEmoticonList() {
  log("广播本地表情列表更新");
  try {
    // 将所有的图片路径放入Set
    const newPaths = new Set(
      emoticonsList.flatMap((emoticons) => {
        return emoticons.list.map((item) => item.path);
      }),
    );
    // 如果没有启用历史表情
    localEmoticonsConfig.commonlyEmoticons = localEmoticonsConfig.commonlyEmoticons.filter((path) => newPaths.has(path));
    globalBroadcast("LiteLoader.lite_tools.updateEmoticons", emoticonsList);
    globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
    writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfig, null, 4));
    log("广播本地表情列表更新-完成");
  } catch (err) {
    log("广播本地表情列表失败", err);
  }
}

/**
 * 重置常用表情列表
 */
function resetCommonlyEmoticons() {
  log("重置常用表情列表");
  localEmoticonsConfig.commonlyEmoticons = [];
  globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfig, null, 4));
}

// 返回本地表情包数据
ipcMain.handle("LiteLoader.lite_tools.getLocalEmoticonsList", (_) => {
  log("返回本地表情包数据");
  return emoticonsList;
});

// 返回常用表情包数据
ipcMain.handle("LiteLoader.lite_tools.getLocalEmoticonsConfig", (_) => {
  log("返回本地表情包配置");
  return localEmoticonsConfig;
});

// 更新常用表情列表
ipcMain.on("LiteLoader.lite_tools.addCommonlyEmoticons", (_, src) => {
  if (!config.localEmoticons.commonlyEmoticons) {
    return;
  }
  log("更新常用表情", localEmoticonsConfigPath, config.localEmoticons.commonlyNum);
  const newSet = new Set(localEmoticonsConfig.commonlyEmoticons);
  // 如果已经有这个表情了，则更新位置
  newSet.delete(src);
  localEmoticonsConfig.commonlyEmoticons = Array.from(newSet);
  localEmoticonsConfig.commonlyEmoticons.unshift(src);
  // 删除多余的值
  if (localEmoticonsConfig.commonlyEmoticons.length > config.localEmoticons.commonlyNum) {
    localEmoticonsConfig.commonlyEmoticons.pop();
  }
  log("历史表情列表", localEmoticonsConfig);
  globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfig, null, 4));
});

// 从历史记录中移除指定文件
ipcMain.on("LiteLoader.lite_tools.deleteCommonlyEmoticons", (_, localPath) => {
  const newSet = new Set(localEmoticonsConfig.commonlyEmoticons);
  // 如果已经有这个表情了，则更新位置
  newSet.delete(localPath);
  localEmoticonsConfig.commonlyEmoticons = Array.from(newSet);
  globalBroadcast("LiteLoader.lite_tools.updateLocalEmoticonsConfig", localEmoticonsConfig);
  writeFileSync(localEmoticonsConfigPath, JSON.stringify(localEmoticonsConfig, null, 4));
});

// 删除指定文件
ipcMain.handle("LiteLoader.lite_tools.deleteEmoticonsFile", (_, path) => {
  log("删除表情文件", path);
  if (existsSync(path)) {
    // 验证要删除的文件目录是否在本地表情指定目录中
    if (path.startsWith(config.localEmoticons.localPath)) {
      try {
        unlinkSync(path);
        return {
          success: true,
          msg: "删除成功",
        };
      } catch (err) {
        return {
          success: false,
          msg: "没有权限",
        };
      }
    } else {
      return {
        success: false,
        msg: "路径错误",
      };
    }
  } else {
    return {
      success: false,
      msg: "文件不存在",
    };
  }
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
        const newPath = join(result.filePaths[0]);
        config.localEmoticons.localPath = newPath;
        updateConfig(config);
      }
    })
    .catch((err) => {
      log("无效操作", err);
    });
});
