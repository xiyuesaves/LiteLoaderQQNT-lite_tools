import { updateWallpaper } from "../render_modules/updateWallpaper.js";
import { observerMessageList } from "../render_modules/observerMessageList.js";
// 右键菜单相关操作
import { addEventqContextMenu } from "../render_modules/qContextMenu.js";
import { Logs } from "../render_modules/logs.js";
const log = new Logs("转发界面");

document.querySelector("#app").classList.add("forward");
updateWallpaper();
addEventqContextMenu();
const observe = new MutationObserver(forward);
observe.observe(document.body, {
  childList: true,
  subtree: true,
});

function forward() {
  observerMessageList(".list .q-scroll-view", ".list .q-scroll-view > div", true);
}

log("模块加载完成");
