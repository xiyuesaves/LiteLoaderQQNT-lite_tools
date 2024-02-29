const fs = require("fs");
const path = require("path");
const debounce = require("./debounce");
const logs = require("./logs");
const log = logs("本地表情模块");

let callbackFunc = new Set();
let emoticonsList = [];
let folderNum = 0;
let watchSignals = [];
let folderPath;

/**
 * 防抖函数
 */
const folderUpdate = debounce(async () => {
  const beforeEmoticonsList = emoticonsList;
  emoticonsList = [];
  folderNum = 0;
  closeAllFileWatcher();
  addWatchFolders([folderPath]);
  await loadFolder(folderPath);
  if (!arraysAreEqual(beforeEmoticonsList, emoticonsList)) {
    log("触发监听");
    dispatchUpdateFile();
  }
  log("触发文件修改事件", watchSignals.length);
}, 100);

/**
 * 清空所有文件夹监听事件
 */
function closeAllFileWatcher() {
  if (watchSignals.length) {
    watchSignals.forEach((ac) => ac.abort());
    watchSignals = [];
  }
}

/**
 * 批量监听文件夹变动
 * @param {Array} paths 文件夹路径数组
 */
function addWatchFolders(paths) {
  paths.forEach((path) => {
    const ac = new AbortController();
    watchSignals.push(ac);
    const watcher = fs.watch(path, { signal: ac.signal });
    watcher.on("change", folderUpdate);
  });
}

/**
 * 加载本地表情文件夹
 * @param {String} folderPath 表情文件夹路径
 */
async function loadEmoticons(_folderPath) {
  folderPath = _folderPath;
  emoticonsList = [];
  folderNum = 0;
  closeAllFileWatcher();
  addWatchFolders([folderPath]);
  await loadFolder(folderPath);
  dispatchUpdateFile();
}

/**
 * 递归加载文件夹
 * @param {String} folderPath 文件夹路径
 * @returns
 */
function loadFolder(folderPath) {
  folderNum = emoticonsList.length;
  if (fs.existsSync(folderPath)) {
    return new Promise((res, rej) => {
      let index = 0;
      fs.readdir(folderPath, async (err, files) => {
        const deepFolder = []; // 下一层文件夹
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = path.normalize(path.join(folderPath, file));
          const fileStat = fs.statSync(filePath, {
            throwIfNoEntry: false,
          });
          if (fileStat) {
            if (fileStat.isFile()) {
              if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(path.extname(filePath).toLocaleLowerCase())) {
                continue;
              }
              // 初始化表情文件夹
              if (!emoticonsList[folderNum]) {
                emoticonsList[folderNum] = {
                  name: path.basename(folderPath),
                  index: folderNum,
                  id: Buffer.from(folderPath).toString("base64"),
                  path: folderPath,
                  list: [],
                };
              }
              // 向文件夹内添加表情图片
              emoticonsList[folderNum].list.push({
                path: filePath,
                name: path.basename(filePath),
                index,
              });
              index++;
            } else if (fileStat.isDirectory()) {
              // 如果目标是文件夹，则加入文件夹路径数组中等待读取文件结束后统一读取下一级目录
              deepFolder.push(filePath);
            }
          }
        }
        // 单独处理递归文件夹
        for (let i = 0; i < deepFolder.length; i++) {
          const filePath = deepFolder[i];
          await loadFolder(filePath);
        }
        addWatchFolders(deepFolder);
        res();
      });
    });
  }
}

/**
 * 对比两个数组是否一致
 * @param {Array} arr1 原始数组
 * @param {Array} arr2 新数组
 * @returns {Boolean}
 */
function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].name !== arr2[i].name || JSON.stringify(arr1[i].list) !== JSON.stringify(arr2[i].list)) {
      return false;
    }
  }
  return true;
}

/**
 * 触发更新回调
 */
function dispatchUpdateFile() {
  callbackFunc.forEach((func) => func(emoticonsList));
}

/**
 * 注册回调方法
 * @param {Function} callback 回调函数
 */
function onUpdateEmoticons(callback) {
  callbackFunc.add(callback);
}

module.exports = { loadEmoticons, onUpdateEmoticons };
