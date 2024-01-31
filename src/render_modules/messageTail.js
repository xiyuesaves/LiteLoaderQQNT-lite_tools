// 消息后缀模块
import { Logs } from "./logs.js";
import { messageTailTips } from "./HTMLtemplate.js";
import { options, updateOptions } from "./options.js";
import { debounce } from "./debounce.js";
const log = new Logs("消息后缀");

log("模块加载");
let peer = lite_tools.getPeer();
// 增加防抖避免文本闪烁
lite_tools.updatePeer(
  debounce((_, newPeer) => {
    log("peer更新", peer?.uid);
    peer = newPeer;
    messageTail();
  }, 10),
);

updateOptions(() => {
  log("配置文件更新", options.tail);
  messageTail();
});

/**
 * 消息后缀模块
 */
function messageTail() {
  const container = document.querySelector(".chat-input-area .operation");
  document.querySelector(".lite-tools-tail-tips")?.remove();
  if (container && peer?.uid && options.tail.tips) {
    const tail = options.tail.list.find((tail) => {
      if (tail.filter.length === 1 && tail.filter[0] === "") {
        return true;
      }
      if (tail.filter.includes(peer?.uid)) {
        return true;
      }
    });
    if (tail && options.tail.enabled) {
      container.insertAdjacentHTML(
        "afterbegin",
        messageTailTips.replace("%s%", `${tail.content}`).replace("%title%", `下一条消息将附带 ${tail.content} 后缀`),
      );
    }
  }
}
export { messageTail };
