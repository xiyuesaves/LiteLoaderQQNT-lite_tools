const fs = require("fs");
const path = require("path");
let callbackFunc = [];
let emoticonsList = [];
let watcher;

async function loadEmoticons(folderPath) {
  emoticonsList = [];
  await loadFolder(folderPath);
  dispatchUpdateFile();
  if (watcher) {
    watcher.close();
  }
  watcher = fs.watch(folderPath, { recursive: true }, async (event, fileName) => {
    if (event === "change") {
      return;
    }
    emoticonsList = [];
    await loadFolder(folderPath);
    dispatchUpdateFile();
  });
}

function loadFolder(folderPath, index = 0) {
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
              if (!emoticonsList[index]) {
                emoticonsList[index] = {
                  name: path.basename(folderPath),
                  list: [],
                };
              }
              emoticonsList[index].list.push({
                path: filePath.replace(/\\/g, "/"),
                name: path.basename(filePath),
              });
            } else if (fileStat.isDirectory()) {
              await loadFolder(filePath, index++);
            }
          }
        }
        res();
      });
    });
  }
}

function dispatchUpdateFile() {
  console.log(emoticonsList, emoticonsList.length);
  callbackFunc.forEach((func) => {
    func(emoticonsList);
  });
}

function onUpdateEmoticons(callback) {
  callbackFunc.push(callback);
}

module.exports = { loadEmoticons, onUpdateEmoticons };
