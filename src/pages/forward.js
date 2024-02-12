import "../render_modules/wallpaper.js";
import { observerMessageList, processMessageElement } from "../render_modules/observerMessageList.js";
// 右键菜单相关操作
import { addEventqContextMenu } from "../render_modules/qContextMenu.js";
import { Logs } from "../render_modules/logs.js";
const log = new Logs("转发界面");

document.querySelector("#app").classList.add("forward");
addEventqContextMenu();

function forward() {
  observerMessageList(".list .q-scroll-view", ".list .q-scroll-view > div", true);
  processMessageElement();
  setTimeout(processMessageElement, 500);
}
forward();

log("模块加载完成");
