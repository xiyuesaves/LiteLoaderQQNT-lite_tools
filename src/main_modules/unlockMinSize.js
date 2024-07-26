import { BrowserWindow } from "electron";
import { config, onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("unlockMinSize");

const rawMinSize = new Map();
let unlockMainMinSize;

// 配置文件更新时执行
onUpdateConfig(() => {
  if (config.unlockMainMinSize !== unlockMainMinSize) {
    unlockMainMinSize = config.unlockMainMinSize;
    const allWindows = BrowserWindow.getAllWindows();
    log("配置更新", allWindows.length);
    allWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        if (unlockMainMinSize) {
          const minSize = window.getMinimumSize();
          rawMinSize.set(window.id, minSize);
          window.setMinimumSize(0, 0);
        } else {
          const minSize = rawMinSize.get(window.id);
          if (minSize?.length) {
            const size = window.getSize();
            // 如果窗口尺寸小于最小尺寸，调整窗口尺寸
            if (size[0] < minSize[0] || size[1] < minSize[1]) {
              const restSize = [size[0] > minSize[0] ? size[0] : minSize[0], size[1] > minSize[1] ? size[1] : minSize[1]];
              window.setSize(...restSize);
            }
            window.setMinimumSize(...minSize);
          }
        }
      }
    });
  }
});

// 新建窗口解锁最小尺寸
const windowUnlockMinSize = (window, maxTryNum = 1000) => {
  if (!window.isDestroyed()) {
    if (config?.unlockMainMinSize) {
      const minSize = window.getMinimumSize();
      if (minSize[0] > 0 && minSize[1] > 0) {
        log("窗口初始化完成", window.id, minSize);
        rawMinSize.set(window.id, minSize);
        window.setMinimumSize(0, 0);
      } else if (!rawMinSize.get(window.id) && maxTryNum > 0) {
        setTimeout(() => {
          log("窗口还未初始化完成", window.id, minSize);
          windowUnlockMinSize(window, --maxTryNum);
        }, 100);
      } else {
        log("窗口没有最小尺寸限制", window.id, minSize);
      }
    }
  }
};

export { windowUnlockMinSize };
