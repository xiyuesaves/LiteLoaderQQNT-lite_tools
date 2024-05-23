import { config } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("proxyOn");

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
            const resizeFunc = args[1];
            args[1] = (...args) => {
              if (!config.message.unlockMainMinSize) {
                resizeFunc(...args);
              }
            };
          }
          return target.apply(thisArg, args);
        } catch (err) {
          log("函数调用出现错误", err);
        }
      },
    });
    window.on = proxtOn;
  } catch (err) {
    log("代理on方法出现错误", err);
  }
}

export { proxyOn };
