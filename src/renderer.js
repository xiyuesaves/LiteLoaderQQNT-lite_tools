/**
 * @author xiyuesaves
 * @date 2024-01-22
 */

import { hookVue3 } from "./render_modules/hookVue3.js";
import { initStyle } from "./render_modules/initStyle.js";
import { Logs } from "./render_modules/logs.js";
const log = new Logs("主渲染进程模块");

function onLoad() {
  hookVue3();
  initStyle();
  if (location.hash === "#/blank") {
    navigation.addEventListener("navigatesuccess", updateHash, { once: true });
  } else {
    updateHash();
  }

  function updateHash() {
    let hash = location.hash;
    if (hash === "#/blank") {
      return;
    }
    if (hash.includes("#/chat")) {
      app.classList.add("lite-tools-chat");
      import("./pages/chatMessage.js");
      log("进入独立聊天窗口");
    } else if (hash.includes("#/forward")) {
      app.classList.add("lite-tools-forward");
      import("./pages/forward.js");
      log("进入转发窗口");
    } else if (hash.includes("#/main/message")) {
      app.classList.add("lite-tools-main");
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

// 设置界面函数
function onSettingWindowCreated(view) {
  log("进入配置界面");
  import("./pages/configView.js").then((module) => {
    module.onConfigView(view);
  });
}

// 这两个函数都是可选的
export { onSettingWindowCreated };
