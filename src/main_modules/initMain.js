import { config, onUpdateConfig } from "./config.js";
import { Logs, webLog } from "./logs.js";
const log = new Logs("initMain");

function initMain() {
  log("初始化主进程", config);
}

export { initMain };
