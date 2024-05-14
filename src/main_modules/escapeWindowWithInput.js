import { config } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("ESC 隐藏窗口");

/**
 * 忽略输入框内是否有内容，ESC强制关闭窗口。
 *
 * @param {BrowserWindow} window - 需要防止关闭的窗口。
 * @return {void} 此函数不返回任何内容。
 */
export function escapeWindowWithInput(window) {
  window.webContents.on("before-input-event", async (event, input) => {
    // 阻止按下 ESC 键时关闭窗口
    if (input.key == "Escape") {
        try {
            if (config.escapeWindowWithInput && !config.preventEscape) {
                window.hide();
                event.preventDefault();
            }
        } catch (err) {
            log("出现错误", err, err?.stack);
        }
    }
  });
}
