// 通用消息撤回方法

import { options } from "./options.js";

/**
 *
 * @param {Element} el 消息列表元素
 * @param {Object} find 被撤回消息数据
 */
function messageRecall(el, find) {
  // 标记为已撤回消息
  el.classList.add("lite-tools-recall-msg");
  /**
   * @type {Element}
   */
  const slot = el.querySelector(".lite-tools-slot");
  if (slot) {
    const messageRecallEl = document.createElement("div");
    messageRecallEl.innerText = "已撤回";
    messageRecallEl.setAttribute("data-recall", "已撤回");
    messageRecallEl.title = `消息于 ${new Date(find.recallTime * 1000).toLocaleString()} 被 ${
      find.operatorMemRemark || find.operatorRemark || find.operatorNick
    } 撤回`;
    // 添加自定义样式
    if (options.preventMessageRecall.customColor) {
      messageRecallEl.classList.add("custom-color");
      messageRecallEl.style.color = options.preventMessageRecall.textColor;
    }
    // 计算偏移量
    messageRecallEl.classList.add("lite-tools-recall");
    const offsetRight = slot.offsetWidth;
    messageRecallEl.style["--offsetRight"] = `${offsetRight}px`
    slot.classList.add("recall-tag");
    slot.insertBefore(messageRecallEl, slot.firstChild);
  }
}

/**
 * 新的撤回事件触发该方法
 */
function newMessageRecall() {
  lite_tools.onMessageRecall((_, message) => {
    const el = document.querySelector(`[id="${message.msgId}"]`);
    if (!el.querySelector(".lite-tools-recall")) {
      messageRecall(el, message.recallData);
    }
  });
}

export { messageRecall, newMessageRecall };
