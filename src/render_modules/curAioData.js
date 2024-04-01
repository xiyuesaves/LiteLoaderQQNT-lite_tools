let curAioData = null;
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
      eventList.forEach((func) => {
        func(newVal);
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
  return {
    chatType: curAioData?.chatType === 1 ? "friend" : "group",
    guildId: "",
    uid: curAioData?.header?.uid,
  };
}

export { getPeer, addEventPeerChange, initCurAioData };
