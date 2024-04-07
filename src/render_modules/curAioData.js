let curAioData = null;
let peer = null;
const eventList = [];

/**
 * 监听聊天对象变动
 * @returns {void}
 */
function initCurAioData() {
  if (!app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Aio?.curAioData) {
    setTimeout(initCurAioData, 500);
    return;
  }
  curAioData = app.__vue_app__.config.globalProperties.$store.state.common_Aio.curAioData;
  Object.defineProperty(app.__vue_app__.config.globalProperties.$store.state.common_Aio, "curAioData", {
    enumerable: true,
    configurable: true,
    get() {
      return curAioData;
    },
    set(newVal) {
      curAioData = newVal;
      // 打个标记，这个模块的返回内容被改了
      peer = {
        chatType: newVal.chatType,
        peerUid: newVal?.header?.uid,
        guildId: "",
      };
      eventList.forEach((func) => {
        func(peer);
      });
    },
  });
}

/**
 * 添加peer监听函数
 * @param {Function} func 监听函数
 */
function addEventPeerChange(func) {
  eventList.push(func);
}
/**
 * 获取Peer
 * @returns {Object}
 */
function getPeer() {
  return peer;
}

export { getPeer, addEventPeerChange, initCurAioData };
