/**
 * @author xiyuesaves
 * @date 2023-11-03
 */

// hook VUE
import { hookVue3 } from "./render_modules/hookVue3.js";
// 初始化样式数据
import { initStyle } from "./render_modules/initStyle.js";
// 日志模块
import { logs } from "./render_modules/logs.js";
const log = new logs("主渲染进程模块").log;

function onLoad() {
  hookVue3();
  initStyle();
  /**
   * 监听页面 hash 变动
   */
  if (location.hash === "#/blank") {
    navigation.addEventListener("navigatesuccess", updateHash, { once: true });
  } else {
    updateHash();
  }

  /**
   * 根据页面 hash 决定执行函数
   */
  function updateHash() {
    let hash = location.hash;
    /**
     * 默认 hash 直接返回
     */
    if (hash === "#/blank") {
      return;
    }
    /**
     * 局部匹配
     */
    if (hash.includes("#/chat/")) {
      import("./pages/chatMessage.js");
      log("进入独立聊天窗口");
    } else if (hash.includes("#/forward")) {
      import("./pages/forward.js");
      log("进入转发窗口");
    } else if (hash.includes("#/main/message")) {
      import("./pages/mainMessage.js");
      log("进入主窗口");
    } else if (hash.includes("#/image-viewer")) {
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
