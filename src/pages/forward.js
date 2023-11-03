import { updateWallpaper } from "../render_modules/updateWallpaper.js";
import { observerMessageList } from "../render_modules/observerMessageList.js";
import { logs } from "../render_modules/logs.js";
const log = new logs("转发界面").log;

log("进入模块");
document.querySelector("#app").classList.add("forward");
updateWallpaper();

const observe = new MutationObserver(forward);
observe.observe(document.body, {
  childList: true,
  subtree: true,
});

function forward() {
  observerMessageList(".list .q-scroll-view", ".list .q-scroll-view > div", true);
}

log("模块加载完成");
