import { config } from "./config.js";

export function preventEscape(window) {
  window.webContents.on("before-input-event", async (event, input) => {
    // 阻止按下 ESC 键时关闭窗口
    if (input.key == "Escape" && config.preventEscape) {
      event.preventDefault();
    }
  });
}
