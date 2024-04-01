/**
 * @author xiyuesaves
 * @date 2024-01-22
 */

import "./render_modules/hookVue3.js";
import "./render_modules/initStyle.js";
import { initCurAioData } from "./render_modules/curAioData.js";
import { Logs } from "./render_modules/logs.js";
const log = new Logs("主渲染进程模块");

/**
 * 根据页面哈希决定加载页面模块
 * @return {void}
 */
function onLoad() {
  if (location.hash === "#/blank") {
    navigation.addEventListener("navigatesuccess", updateHash, { once: true });
  } else {
    updateHash();
  }

  /**
   * 根据页面哈希值决定加载页面模块
   * @returns {void}
   */
  function updateHash() {
    let hash = location.hash;
    if (hash === "#/blank") {
      return;
    }
    if (hash.includes("#/chat")) {
      app.classList.add("lite-tools-chat");
      initCurAioData();
      import("./pages/chatMessage.js");
      log("进入独立聊天窗口");
    } else if (hash.includes("#/forward")) {
      app.classList.add("lite-tools-forward");
      import("./pages/forward.js");
      log("进入转发窗口");
    } else if (hash.includes("#/main/message")) {
      app.classList.add("lite-tools-main");
      initCurAioData();
      import("./pages/mainMessage.js");
      log("进入主窗口");
    } else if (hash.includes("#/image-viewer")) {
      app.classList.add("lite-tools-image-viewer");
      import("./pages/imageViewer.js");
      log("进入媒体预览窗口");
    }
  }
}
onLoad();

/**
 * 设置页面入口
 * @param {Element} view 设置页面容器
 */
function onSettingWindowCreated(view) {
  log("进入配置界面");
  import("./pages/configView.js").then((module) => {
    module.onConfigView(view);
  });
}

export { onSettingWindowCreated };
