import { config, onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("proxyOn");

/**
 * 窗口 resized 函数
 */
let resizeFunc;

onUpdateConfig(() => {
  if (resizeFunc) {
    log("配置更新调用一次");
    resizeFunc();
  }
});

/**
 * 代理window on对象
 * @param {BrowserWindow} window
 */
function proxyOn(window) {
  try {
    const rawOn = window.on;
    const proxtOn = new Proxy(rawOn, {
      apply(target, thisArg, args) {
        try {
          if (args[0] === "resized") {
            resizeFunc = args[1];
            args[1] = (...args) => {
              if (!config.message.unlockMainMinSize) {
                log("通过-pass", args);
                resizeFunc(...args);
              } else {
                log("拦截");
              }
            };
          }
          return target.apply(thisArg, args);
        } catch (err) {
          log("内部出现错误", err);
        }
      },
    });
    window.on = proxtOn;
  } catch (err) {
    log("出现错误", err);
  }
}

export { proxyOn };
