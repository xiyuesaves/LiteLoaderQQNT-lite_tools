import { options } from "./options.js";
import { messageRecall } from "./messageRecall.js";
import { first } from "./first.js";
import { logs } from "./logs.js";
import { forwardMessage } from "./QQCall.js";
const log = new logs("消息列表处理").log;

const observeConfig = {
  attributes: true,
  attributeFilter: ["style"],
  childList: true,
  subtree: false,
};

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
  // 在执行回调函数时停止监听变动
  observe.disconnect();
  // 将代码嵌套try捕获报错，避免监听失效
  try {
    realFunc();
  } catch (err) {
    log("监听消息列表出错", err);
  }

  // 恢复监听
  observe.observe(observerElement, observeConfig);
}

function realFunc() {
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
    // 插入时间气泡
    if (options.message.showMsgTime) {
      // 时间插入元素
      const timeEl = el.querySelector(".lite-tools-time");
      if (!timeEl) {
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
        const newTimeEl = document.createElement("div");
        const find = (elProps?.msgRecord?.msgTime ?? 0) * 1000;
        if (find) {
          const showTime = new Date(find).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
          newTimeEl.classList.add("lite-tools-time");
          newTimeEl.innerText = showTime;
          newTimeEl.setAttribute("time", showTime);
          newTimeEl.title = `发送于 ${new Date(find).toLocaleString("zh-CN")}`;
          if (bubbleEmbed) {
            newTimeEl.classList.add("embed");
            bubbleEmbed.appendChild(newTimeEl);
          } else if (bubbleInside) {
            // 如果目标是图片消息，则额外处理图片样式
            if (bubbleInside.classList.contains("mix-message__container--pic")) {
              const picEl = bubbleInside.querySelector(".pic-element");
              if (picEl && picEl.offsetWidth >= 100 && picEl.offsetHeight >= 50) {
                newTimeEl.classList.add("bubble-inside");
                bubbleInside.appendChild(newTimeEl);
              } else {
                newTimeEl.classList.add("bubble-outside");
                bubbleInside.parentElement.appendChild(newTimeEl);
              }
            } else {
              newTimeEl.classList.add("bubble-inside");
              bubbleInside.appendChild(newTimeEl);
            }
          } else if (bubbleOutside) {
            newTimeEl.classList.add("bubble-outside");
            bubbleOutside.appendChild(newTimeEl);
          }
        }
      }
    }
    // 后处理被撤回的消息
    if (options.message.preventMessageRecall && !isForward) {
      // 撤回插入元素
      const recallEl = el.querySelector(".lite-tools-recall");
      if (!recallEl) {
        const find = elProps?.msgRecord?.lite_tools_recall;
        if (find) {
          // 通用消息撤回处理方法
          messageRecall(el, find);
        }
      }
    }
    // 插入复读按钮
    if (options.message.switchReplace && !isForward) {
      const msgEl = el.querySelector(".message-content__wrapper");
      // +1插入元素
      const replaceEl = el.querySelector(".message-content-replace");
      if (
        msgEl &&
        el.querySelector(
          ":not(.ptt-message,.file-message--content,wallet-message__container,ark-msg-content-container).mix-message__container,.msg-content-container",
        ) &&
        !replaceEl
      ) {
        const newReplaceEl = document.createElement("div");
        const msgId = el.id;
        newReplaceEl.classList.add("message-content-replace");
        newReplaceEl.innerText = "+1";
        newReplaceEl.addEventListener("click", async () => {
          const peer = await lite_tools.getPeer();
          forwardMessage(peer, peer, [msgId]);
        });
        const showTimeEl = el.querySelector(".bubble-outside");
        // 如果已经启用显示消息时间，且这条消息的显示方法是外部气泡时，添加合并样式
        if (showTimeEl) {
          showTimeEl.classList.add("compatible-replace");
          newReplaceEl.classList.add("compatible-time");
        }
        msgEl.appendChild(newReplaceEl);
      }
    }
    // 合并消息头像
    if (options.message.avatarSticky.enabled && options.message.mergeMessage) {
      const elProps = el?.querySelector(".message")?.__VUE__?.[0]?.props;
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
          avatarEl.style.height = `${childElHeight.get(mapTag) + el.offsetHeight - 15 - 4}px`;
          childElHeight.set(mapTag, 0);
        }
      }
    }
  }
}

export { observerMessageList };
