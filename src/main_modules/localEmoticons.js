const fs = require("fs");
const path = require("path");
let callbackFunc = [];
let emoticonsList = [];
let folderNum = 0;
let watcher;

async function loadEmoticons(folderPath) {
  emoticonsList = [];
  folderNum = 0;
  await loadFolder(folderPath);
  dispatchUpdateFile();
  if (watcher) {
    watcher.close();
  }
  watcher = fs.watch(
    folderPath,
    { recursive: true },
    debounce(async () => {
      emoticonsList = [];
      folderNum = 0;
      await loadFolder(folderPath);
      dispatchUpdateFile();
    }, 300)
  );
}

function loadFolder(folderPath) {
  folderNum = emoticonsList.length;
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath);
    return new Promise((res, rej) => {
      fs.readdir(folderPath, async (err, files) => {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = path.join(folderPath, file);
          const fileStat = fs.statSync(filePath, {
            throwIfNoEntry: false,
          });
          if (fileStat) {
            if (fileStat.isFile()) {
              if (![".gif", ".jpg", ".png"].includes(path.extname(filePath))) {
                continue;
              }
              // 初始化对象
              if (!emoticonsList[folderNum]) {
                emoticonsList[folderNum] = {
                  name: path.basename(folderPath),
                  list: [],
                };
              }
              emoticonsList[folderNum].list.push({
                path: filePath.replace(/\\/g, "/"),
                name: path.basename(filePath),
              });
            } else if (fileStat.isDirectory()) {
              await loadFolder(filePath);
            }
          }
        }
        res();
      });
    });
  }
}

function debounce(fn, time) {
  let timer = null;
  return function (...args) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, time);
  };
}

function dispatchUpdateFile() {
  callbackFunc.forEach((func) => {
    func(emoticonsList);
  });
}

function onUpdateEmoticons(callback) {
  callbackFunc.push(callback);
}

module.exports = { loadEmoticons, onUpdateEmoticons };
