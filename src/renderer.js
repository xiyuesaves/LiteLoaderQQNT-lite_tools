/**
 * @author xiyuesaves
 * @date 2023-11-03
 */
function onLoad() {
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
    } else if (hash.includes("#/forward")) {
      import("./pages/forward.js");
    }
    /**
     * 路径匹配
     */
    switch (hash) {
      case "#/imageViewer":
        import("./pages/imageViewer.js");
        break;
      case "#/main/message":
        import("./pages/mainMessage.js");
        break;
    }
  }
}

// 设置界面函数
import { onConfigView } from "./pages/configView.js";

// 这两个函数都是可选的
export { onLoad, onConfigView };
