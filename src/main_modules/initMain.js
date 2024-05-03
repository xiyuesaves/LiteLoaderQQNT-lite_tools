import { config, onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
import "./wallpaper.js";
import "./initStyle.js";
import "./getFonts.js";
const log = new Logs("initMain");

function initMain() {
  log("初始化主进程", config);
}

export { initMain };
