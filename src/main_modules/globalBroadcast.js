// 向所有未销毁页面发送广播
function globalBroadcast(listenList, channel, data) {
  listenList.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  });
}
exports.globalBroadcast = globalBroadcast;
