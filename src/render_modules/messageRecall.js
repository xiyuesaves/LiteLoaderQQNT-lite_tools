// 通用消息撤回方法

import { options } from "./options.js";

/**
 *
 * @param {Element} el 消息列表元素
 * @param {Object} find 被撤回消息数据
 */
function messageRecall(el, find) {
  // 气泡-嵌入（必须含有文本内容的消息,文件消息）
  const bubbleEmbed = el.querySelector(
    ":not(.mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face)>.message-content.mix-message__inner,.normal-file.file-element .file-info,.file-info-mask p:last-child,.message-content__wrapper .count,.reply-message__container .reply-message__inner",
  );
  // 气泡-内部消息（单独的图片/视频消息，自己发送的表情）
  const bubbleInside = el.querySelector(
    ".mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face,.msg-preview",
  );
  // 气泡-外部消息（兜底样式）
  const bubbleOutside = el.querySelector(".message-container .message-content__wrapper");

  // 标记为已撤回消息
  el.classList.add("lite-tools-recall-msg");

  // 创建撤回标记元素
  const messageRecallEl = document.createElement("div");
  const showTimeEl = el.querySelector(".lite-tools-time");
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
  messageRecallEl.classList.add("lite-tools-recall");
  // 如果同时开启了时间显示，则插入兼容样式
  if (showTimeEl) {
    messageRecallEl.classList.add("compatible-time");
    showTimeEl.classList.add("compatible-recall");
  }
  // 根据消息元素类型决定标记插入位置
  if (bubbleEmbed) {
    messageRecallEl.classList.add("embed");
    bubbleEmbed.appendChild(messageRecallEl);
  } else if (bubbleInside) {
    // 如果目标是图片消息，则额外处理图片样式
    if (bubbleInside.classList.contains("mix-message__container--pic")) {
      const picEl = bubbleInside.querySelector(".pic-element");
      if (picEl && picEl.offsetWidth >= 100 && picEl.offsetHeight >= 50) {
        messageRecallEl.classList.add("bubble-inside");
        bubbleInside.appendChild(messageRecallEl);
      } else {
        messageRecallEl.classList.add("bubble-outside");
        bubbleInside.parentElement.appendChild(messageRecallEl);
      }
    } else {
      messageRecallEl.classList.add("bubble-inside");
      bubbleInside.appendChild(messageRecallEl);
    }
  } else if (bubbleOutside) {
    messageRecallEl.classList.add("bubble-outside");
    bubbleOutside.appendChild(messageRecallEl);
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
