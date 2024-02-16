import { options } from "./options.js";
import { messageRecall } from "./messageRecall.js";
import { first } from "./first.js";
import { Logs } from "./logs.js";
import { forwardMessage } from "./nativeCall.js";
const log = new Logs("消息列表处理");

const observeConfig = {
  attributes: true,
  attributeFilter: ["style"],
  childList: true,
  subtree: false,
};
const filterClass = ".msg-content-container:not(.ptt-message,.file-message--content,.wallet-message__container,.ark-msg-content-container)";

let lastMessageNodeList = [];
let childElHeight = new Map();
let observe, msgItemEl, isForward, observerElement;
/**
 * 通用监听消息列表方法
 * @param {String} msgListEl 消息列表元素类名
 * @param {String} msgItemEl 消息元素类名
 * @param {Boolean} isForward 转发界面判断
 */
async function observerMessageList(msgListEl, msgItemEl_, isForward_ = false) {
  msgItemEl = msgItemEl_;
  isForward = isForward_;
  observerElement = document.querySelector(msgListEl);
  if (!observe) {
    observe = new MutationObserver(processMessageElement);
  }
  if (observerElement && first(`chatMessage${msgListEl}`)) {
    log("已捕获目标元素", msgListEl);
    processMessageElement();
    observe.observe(observerElement, observeConfig);
  }
}

/**
 * 消息列表元素处理函数
 */
function processMessageElement() {
  // 循环元素列表
  const currentItemList = Array.from(document.querySelectorAll(msgItemEl));
  const validItemList = currentItemList;
  validItemList.unshift(lastMessageNodeList.pop());
  lastMessageNodeList = currentItemList;
  // 所有功能使用同一个循环执行
  // log("---新循环---", currentItemList.length);
  for (let index = 0; index < validItemList.length; index++) {
    const el = validItemList[index];
    const elProps = el?.querySelector(".message")?.__VUE__?.[0]?.props;
    // 跳过不存在vue实例的元素
    if (!elProps) {
      continue;
    }
    // 跳过除了群聊和私聊之外的聊天类型
    if (elProps?.msgRecord?.chatType > 2) {
      continue;
    }
    // 消息靠左
    if (options.message.selfMsgToLeft) {
      el.querySelector(".message-container")?.classList?.remove("message-container--self");
      el.querySelector(".message-container")?.classList?.remove("message-container--align-right");
      el.querySelector(".user-name")?.classList?.remove("user-name--selfRole");
    }
    // 开启背景时优化小图展示
    if (options.background.enabled) {
      // 过小尺寸的图片移除气泡效果
      const mixPicEl = el.querySelector(".mix-message__container--pic");
      if (mixPicEl) {
        const picEl = mixPicEl.querySelector(".pic-element");
        if (picEl && !picEl.classList.contains("hidden-background") && !(picEl.offsetWidth >= 80 && picEl.offsetHeight >= 50)) {
          mixPicEl.classList.add("hidden-background");
        }
      }
    }
    // 消息添加插槽
    let slotEl = null;
    if (!el.querySelector(".lite-tools-slot")) {
      // 插槽元素
      slotEl = document.createElement("div");
      slotEl.classList.add("lite-tools-slot");
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
      // 插入插槽
      if (bubbleEmbed) {
        slotEl.classList.add("embed-slot");
        bubbleEmbed.appendChild(slotEl);
      } else if (bubbleInside) {
        // 如果是图片则额外判断一次
        if (bubbleInside.classList.contains("mix-message__container--pic")) {
          const picEl = bubbleInside.querySelector(".pic-element");
          if (picEl && picEl.offsetWidth >= 120 && picEl.offsetHeight >= 50) {
            slotEl.classList.add("inside-slot");
            bubbleInside.appendChild(slotEl);
          } else {
            slotEl.classList.add("outside-slot");
            if (el.querySelector(".message-container--self")) {
              bubbleOutside.insertBefore(slotEl, bubbleOutside.firstChild);
            } else {
              bubbleOutside.appendChild(slotEl);
            }
          }
        } else {
          slotEl.classList.add("inside-slot");
          bubbleInside.appendChild(slotEl);
        }
      } else if (bubbleOutside) {
        slotEl.classList.add("outside-slot");
        if (el.querySelector(".message-container--self")) {
          bubbleOutside.insertBefore(slotEl, bubbleOutside.firstChild);
        } else {
          bubbleOutside.appendChild(slotEl);
        }
      } else {
        slotEl = null;
      }
    }
    // 插入消息时间
    if (slotEl && options.message.showMsgTime) {
      if (!el.querySelector(".lite-tools-time")) {
        const find = (elProps?.msgRecord?.msgTime ?? 0) * 1000;
        if (find) {
          const newTimeEl = document.createElement("div");
          const showTime = new Date(find).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const fullTime = new Date(find).toLocaleTimeString("zh-CN", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          if (options.message.showMsgTimeFullDate) {
            newTimeEl.innerText = fullTime;
            newTimeEl.setAttribute("time", fullTime);
          } else {
            newTimeEl.innerText = showTime;
            newTimeEl.title = `发送于 ${fullTime}`;
            newTimeEl.setAttribute("time", showTime);
          }
          newTimeEl.classList.add("lite-tools-time");
          /**
           * @type {Element}
           */
          const senderNameEl = el.querySelector(".user-name");
          if (options.message.showMsgTimeToSenderName && senderNameEl) {
            if (el.querySelector(".message-container--self")) {
              if (el.querySelector(".q-tag")) {
                newTimeEl.classList.add("self-and-tag");
                senderNameEl.insertAdjacentElement("beforeend", newTimeEl);
              } else {
                senderNameEl.insertAdjacentElement("afterbegin", newTimeEl);
              }
            } else {
              senderNameEl.insertAdjacentElement("beforeend", newTimeEl);
            }
          } else {
            slotEl.appendChild(newTimeEl);
          }
        }
      }
    }
    // 插入撤回提示
    if (slotEl && !isForward && options.preventMessageRecall.enabled) {
      // 撤回插入元素
      if (!el.querySelector(".lite-tools-recall")) {
        const find = elProps?.msgRecord?.lite_tools_recall;
        if (find) {
          // 通用消息撤回处理方法
          messageRecall(el, find);
        }
      }
    }
    // 插入+1按钮
    if (slotEl && !isForward && options.message.replaceBtn) {
      // +1插入元素
      if (el.querySelector(filterClass) && !el.querySelector(".message-content-replace")) {
        const msgEl = el.querySelector(".message-content__wrapper");
        const newReplaceEl = document.createElement("div");
        const msgId = el.id;
        let doubleClick = false;
        newReplaceEl.classList.add("message-content-replace");
        newReplaceEl.innerText = "+1";
        newReplaceEl.addEventListener("click", () => {
          if (options.message.doubleClickReplace) {
            setTimeout(() => {
              doubleClick = false;
            }, 500);
            if (doubleClick) {
              const peer = lite_tools.getPeer();
              forwardMessage(peer, peer, [msgId]);
              doubleClick = false;
            }
            doubleClick = true;
          } else {
            const peer = lite_tools.getPeer();
            forwardMessage(peer, peer, [msgId]);
          }
        });
        if (slotEl.classList.contains("outside-slot")) {
          if (el.querySelector(".message-container--self")) {
            if (slotEl.querySelector(".lite-tools-time")) {
              slotEl.classList.add("fix-padding-right");
            }
            slotEl.insertBefore(newReplaceEl, slotEl.firstChild);
          } else {
            if (slotEl.querySelector(".lite-tools-time")) {
              slotEl.classList.add("fix-padding-left");
            }
            slotEl.appendChild(newReplaceEl);
          }
        } else {
          newReplaceEl.classList.add("single");
          if (el.querySelector(".message-container--self")) {
            msgEl.insertBefore(newReplaceEl, msgEl.firstChild);
          } else {
            msgEl.appendChild(newReplaceEl);
          }
        }
      }
    }
    // 连续消息合并
    if (!isForward && options.message.avatarSticky.enabled && options.message.mergeMessage) {
      if (elProps?.msgRecord?.elements?.[0]?.grayTipElement === null) {
        const senderUid = elProps?.msgRecord?.senderUid;
        const sendNickName = elProps?.msgRecord?.anonymousExtInfo?.anonymousNick ?? elProps?.msgRecord?.sendNickName;
        const mapTag = senderUid + sendNickName;
        const prevProps = el.nextElementSibling?.querySelector(".message")?.__VUE__?.[0]?.props;
        const prevElUid = prevProps?.msgRecord?.senderUid;
        const prevNickName = prevProps?.msgRecord?.anonymousExtInfo?.anonymousNick ?? prevProps?.msgRecord?.sendNickName;
        const prevTag = prevElUid + prevNickName;
        if (prevProps?.msgRecord?.elements?.[0]?.grayTipElement === null && mapTag === prevTag) {
          el.classList.remove("merge-main");
          el.classList.add("merge", "merge-child");
          childElHeight.set(mapTag, (childElHeight.get(mapTag) ?? 0) + el.offsetHeight);
        } else {
          el.classList.remove("merge-child");
          el.classList.add("merge", "merge-main");
          const avatarEl = el.querySelector(".avatar-span");
          avatarEl.style.height = `${childElHeight.get(mapTag) + el.querySelector(".message-container").offsetHeight - 4}px`;
          childElHeight.set(mapTag, 0);
        }
      }
    }
  }
}

export { observerMessageList, processMessageElement };
