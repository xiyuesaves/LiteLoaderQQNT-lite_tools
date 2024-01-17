const path = require("path");
const fs = require("fs");
const logs = require("./logs");
const log = new logs("撤回管理").log;

// 撤回消息切片管理
class MessageRecallList {
  constructor(messageRecallJson, messageRecallPath = false, limit = 0) {
    log(`新的历史记录实例，目标文件 ${path.basename(messageRecallJson)} 实例状态 ${messageRecallPath ? "读写" : "只读"} 切片大小 ${limit}`);
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
module.exports = MessageRecallList;
