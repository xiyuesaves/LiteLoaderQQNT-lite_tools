import { options } from "./options.js";
import { messageRecall } from "./messageRecall.js";
import { forwardMessage } from "./nativeCall.js";
import { debounce } from "./debounce.js";
import { Logs } from "./logs.js";
const log = new Logs("消息列表处理");

// 过滤消息类型
const chatTypes = [1, 2, 100];

/**
 * 过滤消息元素
 */
const filterClass = ".msg-content-container:not(.ptt-message,.file-message--content,.wallet-message__container,.ark-msg-content-container)";

/**
 * 历史消息合并状态
 */
const msgElMergeType = new Map();

const mergeMessage = async () => {
  const curMsgs = app.__vue_app__.config.globalProperties.$store.state.aio_chatMsgArea.msgListRef.curMsgs;
  const childElHeight = new Map();
  for (let index = 0; index < curMsgs.length; index++) {
    const el = curMsgs[index];
    const msgRecord = curMsgs[index].data;
    if (msgRecord?.elements?.[0]?.grayTipElement === null) {
      const curMsgs = app.__vue_app__.config.globalProperties.$store.state.aio_chatMsgArea.msgListRef.curMsgs;
      const senderUid = msgRecord?.senderUid;
      const sendNickName = msgRecord?.anonymousExtInfo?.anonymousNick ?? msgRecord?.sendNickName;
      const mapTag = senderUid + sendNickName;
      const nextMsgRecord = curMsgs[index + 1]?.data;
      const prevElUid = nextMsgRecord?.senderUid;
      const prevNickName = nextMsgRecord?.anonymousExtInfo?.anonymousNick ?? nextMsgRecord?.sendNickName;
      const hasShowTimestamp = options.message.mergeMessageKeepTime ? msgRecord?.showTimestamp : false;
      const prevTag = prevElUid + prevNickName;
      const messageEl = document.querySelector(`[id="${el.id}"] .message`);
      if (messageEl) {
        if (!hasShowTimestamp && nextMsgRecord?.elements?.[0]?.grayTipElement === null && mapTag === prevTag) {
          messageEl.classList.remove("merge-main");
          messageEl.classList.add("merge", "merge-child");
          curMsgs[index].height = messageEl.offsetHeight;
          childElHeight.set(mapTag, (childElHeight.get(mapTag) ?? 0) + messageEl.offsetHeight);
          msgElMergeType.set(curMsgs[index].id, "merge-child");
        } else {
          messageEl.classList.remove("merge-child");
          messageEl.classList.add("merge", "merge-main");
          const avatarEl = messageEl.querySelector(".avatar-span");
          avatarEl.style.height = `${childElHeight.get(mapTag) + messageEl.querySelector(".message-container").offsetHeight - 4}px`;
          childElHeight.delete(mapTag);
          msgElMergeType.set(curMsgs[index].id, "merge-main");
        }
      }
    }
  }
};
const debounceMsgMerge = debounce(mergeMessage);

window.__VUE_MOUNT__.push((component) => {
  messageProcessing(component?.vnode?.el, component?.props?.msgRecord);
});

function messageProcessing(target, msgRecord) {
  // 处理消息列表
  if (target?.classList && target?.classList?.contains("message") && msgRecord) {
    const messageEl = target;
    if (messageEl) {
      if (chatTypes.includes(msgRecord?.chatType)) {
        // 消息靠左
        if (options.message.selfMsgToLeft) {
          messageEl.querySelector(".message-container")?.classList?.remove("message-container--self");
          messageEl.querySelector(".message-container")?.classList?.remove("message-container--align-right");
          messageEl.querySelector(".user-name")?.classList?.remove("user-name--selfRole");
        }
        // 图片自适应宽度
        const findImageElement = msgRecord?.elements?.find((element) => element?.picElement && element?.picElement?.picSubType === 0);
        if (options.message.imageAutoWidth && findImageElement) {
          messageEl.classList.add("image-auto-width");
          messageEl
            .querySelector(".msg-content-container")
            .style.setProperty("--img-max-width-2", `${findImageElement.picElement.picWidth}px`);
          messageEl.querySelectorAll(".image.pic-element").forEach((imgEl) => {
            if (imgEl?.__VUE__?.[0]?.props?.picSubType === 0) {
              imgEl.classList.add("max-width");
            }
          });
        }
        // 开启背景时优化小图展示
        if (options.background.enabled) {
          // 过小尺寸的图片移除气泡效果
          const mixPicEl = messageEl.querySelector(".mix-message__container--pic");
          if (mixPicEl) {
            const picEl = mixPicEl.querySelector(".pic-element");
            if (picEl && !picEl.classList.contains("hidden-background") && !(picEl.offsetWidth >= 80 && picEl.offsetHeight >= 50)) {
              mixPicEl.classList.add("hidden-background");
            }
          }
        }
        // 消息添加插槽
        let slotEl = null;
        if (!messageEl.querySelector(".lite-tools-slot")) {
          // 插槽元素
          slotEl = document.createElement("div");
          slotEl.classList.add("lite-tools-slot");
          // 气泡-嵌入（必须含有文本内容的消息,文件消息）
          const bubbleEmbed = messageEl.querySelector(
            ":not(.mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face)>.message-content.mix-message__inner,.normal-file.file-element .file-info,.file-info-mask p:last-child,.message-content__wrapper .count,.reply-message__container .reply-message__inner",
          );
          // 气泡-内部消息（单独的图片/视频消息，自己发送的表情）
          const bubbleInside = messageEl.querySelector(
            ".mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face,.msg-preview",
          );
          // 气泡-外部消息（兜底样式）
          const bubbleOutside = messageEl.querySelector(".message-container .message-content__wrapper");
          // 插入插槽
          if (bubbleEmbed) {
            slotEl.classList.add("embed-slot");
            bubbleEmbed.appendChild(slotEl);
          } else if (bubbleInside) {
            // 如果是图片则额外判断一次
            if (bubbleInside.classList.contains("mix-message__container--pic")) {
              const elements = msgRecord?.elements;
              if (
                elements.length === 1 &&
                elements[0].picElement &&
                elements[0].picElement.picHeight >= 50 &&
                elements[0].picElement.picWidth >= 120
              ) {
                slotEl.classList.add("inside-slot");
                bubbleInside.appendChild(slotEl);
              } else {
                slotEl.classList.add("outside-slot");
                if (messageEl.querySelector(".message-container--self")) {
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
            if (messageEl.querySelector(".message-container--self")) {
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
          if (!messageEl.querySelector(".lite-tools-time")) {
            const find = (msgRecord?.msgTime ?? 0) * 1000;
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
              const senderNameEl = messageEl.querySelector(".user-name");
              if (options.message.showMsgTimeToSenderName && senderNameEl) {
                if (messageEl.querySelector(".message-container--self")) {
                  if (messageEl.querySelector(".q-tag")) {
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
        if (slotEl && options.preventMessageRecall.enabled) {
          // 撤回插入元素
          if (!messageEl.querySelector(".lite-tools-recall")) {
            const find = msgRecord?.lite_tools_recall;
            if (find) {
              // 通用消息撤回处理方法
              messageRecall(messageEl, find);
            }
          }
        }
        // 插入+1按钮
        if (slotEl && options.message.replaceBtn) {
          // +1插入元素
          if (messageEl.querySelector(filterClass) && !messageEl.querySelector(".message-content-replace")) {
            const msgEl = messageEl.querySelector(".message-content__wrapper");
            const newReplaceEl = document.createElement("div");
            const msgId = msgRecord?.msgId;
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
              if (messageEl.querySelector(".message-container--self")) {
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
              if (messageEl.querySelector(".message-container--self")) {
                msgEl.insertBefore(newReplaceEl, msgEl.firstChild);
              } else {
                msgEl.appendChild(newReplaceEl);
              }
            }
          }
        }
        // 连续消息合并
        if (options.message.avatarSticky.enabled && options.message.mergeMessage) {
          const oldType = msgElMergeType.get(msgRecord?.msgId);
          if (oldType) {
            messageEl.classList.add("merge", oldType);
          }
          debounceMsgMerge();
        }
      }
    }
  }
}

function initMessageList() {
  const msgList = app.__vue_app__.config.globalProperties.$store.state.aio_chatMsgArea.msgListRef.curMsgs;
  for (let index = 0; index < msgList.length; index++) {
    const el = msgList[index];
    messageProcessing(document.querySelector(`[id="${el.id}"]`), el.data);
  }
  if (!msgList.length) {
    setTimeout(initMessageList, 1000);
  }
}
// 避免异步数据没有加载
initMessageList();
setTimeout(initMessageList, 500);
setTimeout(initMessageList, 1000);
