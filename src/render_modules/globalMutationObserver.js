const eventList = {};

/**
 * 监听 body 上的变化
 */
new MutationObserver((mutationsList) => {
  let runFunc = new Map();
  mutationsList.forEach((mutations) => {
    if (eventList[mutations.type] instanceof Map) {
      eventList[mutations.type]?.forEach((callbackMap, className) => {
        if (mutations.target.classList.contains(className)) {
          runFunc = new Map([...callbackMap, ...runFunc]);
        }
      });
    }
  });
  runFunc.forEach((config, callback) => {
    if (config.once) {
      offMutationObserver(config.type, config.className, callback);
    }
    callback();
  });
}).observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
});

/**
 * @typedef {'attributes' | 'characterData' | 'childList'} typeString
 */

/**
 * 移除注册的监听事件
 *
 * @param {typeString} type - 要关闭的事件类型
 * @param {string} className - 与事件相关联的类名
 * @param {function} fun - 要关闭的函数
 */
function offMutationObserver(type, className, fun) {
  if (eventList[type]?.get(className) instanceof Map) {
    eventList[type]?.get(className)?.delete(fun);
    if (eventList[type]?.get(className)?.size === 0) {
      eventList[type]?.delete(className);
    }
    if (eventList[type]?.size === 0) {
      delete eventList[type];
    }
  }
}

/**
 * 处理变动观察器事件的函数。
 *
 * @param {typeString} type - 要观察的事件类型。
 * @param {string} className - 要触发事件的类名。
 * @param {function} fun - 当事件发生时要执行的函数。
 * @param {boolean} [once=false] - 指示事件是否只触发一次的标志。
 */
function onMutationObserver(type, className, fun, once = false) {
  if (!(eventList[type] instanceof Map)) {
    eventList[type] = new Map();
  }
  if (!(eventList[type].get(className) instanceof Map)) {
    eventList[type].set(className, new Map());
  }
  eventList[type].get(className).set(fun, {
    type,
    className,
    once,
  });
}

export { onMutationObserver, offMutationObserver };
