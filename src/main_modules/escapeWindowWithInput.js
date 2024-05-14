import { config } from "./config.js";

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
        if (config.escapeWindowWithInput && !config.preventEscape) {
          window.hide();
        }
    }
  });
}
