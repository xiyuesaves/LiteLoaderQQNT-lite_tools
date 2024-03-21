// 消息后缀模块
import { Logs } from "./logs.js";
import { messageTailTips } from "./HTMLtemplate.js";
import { options, updateOptions } from "./options.js";
import { debounce } from "./debounce.js";
const log = new Logs("消息后缀");

log("模块加载", options);
let peer = lite_tools.getPeer();
let tail, tailIndex;

const debounceSetOptions = debounce(() => {
  lite_tools.setOptions(options);
}, 10);

// 增加防抖避免文本闪烁
const debounceUpdatePeer = debounce((_, newPeer) => {
  // log("peer更新");
  peer = newPeer;
  messageTail();
}, 10);
lite_tools.updatePeer(debounceUpdatePeer);

updateOptions(() => {
  // log("配置文件更新", options.tail);
  messageTail();
});

/**
 * 消息后缀模块
 */
function messageTail() {
  const container = document.querySelector(".chat-input-area .operation");
  let tailTipsEl = document.querySelector(".lite-tools-tail-tips");
  if (container && peer?.uid && options.tail.tips) {
    tailIndex = options.tail.list.findIndex((tail) => {
      if (tail.filter.length === 1 && tail.filter[0] === "") {
        return true;
      }
      if (tail.filter.includes(peer?.uid)) {
        return true;
      }
    });
    tail = options.tail.list[tailIndex];
    if (tail && options.tail.enabled) {
      if (!tailTipsEl) {
        container.insertAdjacentHTML(
          "afterbegin",
          messageTailTips
            .replace("%s%", `${tail.content}`)
            .replace(
              "%title%",
              tail.disabled ? "当前已禁用后缀，点击启用" : `发送将附带 ${tail.newLine ? "换行" : ""} ${tail.content} 后缀，点击禁用`,
            ),
        );
        tailTipsEl = document.querySelector(".lite-tools-tail-tips");
        tailTipsEl.addEventListener("click", updateTail);
      }
      tailTipsEl.classList.toggle("disabled-tail", tail.disabled);
      tailTipsEl.innerText = tail.content;
      tailTipsEl.title = tail.disabled
        ? "当前已禁用后缀，点击启用"
        : `发送将附带 ${tail.newLine ? "换行" : ""} ${tail.content} 后缀，点击禁用`;
    } else {
      document.querySelector(".lite-tools-tail-tips")?.remove();
    }
  }
}
function updateTail() {
  if (tail && options.tail.enabled && tailIndex >= 0) {
    tail.disabled = !tail.disabled;
    options.tail.list[tailIndex] = tail;
    debounceSetOptions();
  }
}
export { messageTail };
