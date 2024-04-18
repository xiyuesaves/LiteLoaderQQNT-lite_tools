import { options } from "./options.js";
import { messageRecall } from "./messageRecall.js";
import { forwardMessage } from "./nativeCall.js";
import { debounce } from "./debounce.js";
import { getPeer } from "./curAioData.js";
import { createHtmlCard } from "./createHtmlCard.js";
import { showWebPreview } from "./showWebPreview.js";
import { Logs } from "./logs.js";
const log = new Logs("消息列表处理");

// 过滤消息类型
const chatTypes = [1, 2, 100];

// 最大缓存10w条消息合并对应关系
const MAX_CACHE_SIZE = 100000;

/**
 * 过滤消息元素
 */
const filterClass = ".msg-content-container:not(.ptt-message,.file-message--content,.wallet-message__container,.ark-msg-content-container)";

/**
 * 历史消息合并状态
 */
let msgElMergeType = new Map();

/**
 * 匹配链接正则
 */
const urlMatch = /https?:\/\/[\w\-_]+\.[\w]{1,10}[\S]+/i;

/**
 * 处理当前可见的消息列表
 */
function processingMsgList() {
  const curMsgs = app.__vue_app__.config.globalProperties.$store.state.aio_chatMsgArea.msgListRef.curMsgs;
  const childElHeight = new Map();
  const curMsgsLength = curMsgs.length;
  for (let index = 0; index < curMsgsLength; index++) {
    const el = curMsgs[index];
    const messageEl = document.querySelector(`[id="${el.id}"] .message`);
    const msgRecord = curMsgs[index].data;
    // 额外处理下历史撤回数据
    if (messageEl && msgRecord?.lite_tools_recall) {
      messageRecall(messageEl, msgRecord?.lite_tools_recall);
    }
    // 消息合并逻辑
    if (msgRecord?.elements?.[0]?.grayTipElement === null && options.message.avatarSticky.enabled && options.message.mergeMessage) {
      // 发送者uid
      const senderUid = msgRecord?.senderUid;
      // 用户显示昵称
      const anonymousNick = msgRecord?.anonymousExtInfo?.anonymousNick ?? "";
      // 记录消息高度tag
      const mapTag = senderUid + anonymousNick;
      // 下一条消息元素
      const nextMsgRecord = curMsgs[index + 1]?.data;
      if (messageEl) {
        if (isChildMessage(msgRecord, nextMsgRecord)) {
          messageEl.classList.remove("merge-main");
          messageEl.classList.add("merge", "merge-child");
          curMsgs[index].height = messageEl.offsetHeight;
          childElHeight.set(mapTag, (childElHeight.get(mapTag) ?? 0) + messageEl.querySelector(".message-container").offsetHeight);
          msgElMergeType.set(curMsgs[index].id, "merge-child");
        } else {
          messageEl.classList.remove("merge-child");
          messageEl.classList.add("merge", "merge-main");
          const avatarEl = messageEl.querySelector(".avatar-span");
          if (avatarEl) {
            avatarEl.style.height = `${
              (childElHeight.get(mapTag) ?? 0) + messageEl.querySelector(".message-container").offsetHeight - 4
            }px`;
          }
          childElHeight.delete(mapTag);
          msgElMergeType.set(curMsgs[index].id, "merge-main");
        }
        // 如果缓存消息大于100000，则移除10%最早的数据
        if (msgElMergeType.size >= MAX_CACHE_SIZE) {
          const array = Array.from(msgElMergeType);
          const arrayLength = array.length;
          msgElMergeType = new Map(array.splice(0, arrayLength - arrayLength * 0.1));
        }
      }
    }
  }
}

/**
 * 防抖批量处理当前可见的消息列表
 */
const debounceProcessingMsgList = debounce(processingMsgList);

/**
 * 元素尺寸变化监听器
 */
const resizeObserver = new ResizeObserver(debounceProcessingMsgList);

/**
 * 向 hookVue3 模块添加功能
 */
window?.__VUE_MOUNT__?.push((component) => {
  try {
    // 兼容模式直接返回
    if (options.compatibleLLAPI) {
      return;
    }
    messageToleft(component);
    singleMessageProcessing(component?.vnode?.el, component?.props?.msgRecord);
  } catch (err) {
    log("出现错误", err);
  }
});

/**
 * 单条消息处理流程
 * @param {Element} target 目标消息元素
 * @param {Object} msgRecord 目标消息对象
 */
function singleMessageProcessing(target, msgRecord) {
  // 处理消息列表
  if (target?.classList && target?.classList?.contains("message") && msgRecord) {
    const messageEl = target;
    if (messageEl) {
      if (chatTypes.includes(msgRecord?.chatType)) {
        // 尺寸监听器
        resizeObserver.observe(messageEl);

        // 重写卡片消息
        if (options.background.enabled && options.background.redrawCard) {
          const findArkMsg = msgRecord?.elements?.find((element) => element?.arkElement);
          if (findArkMsg) {
            try {
              const arkData = JSON.parse(findArkMsg.arkElement.bytesData);
              const htmlCard = createHtmlCard(arkData);
              if (htmlCard) {
                log("重写卡片");
                const arkMsgContentContainer = messageEl.querySelector(
                  ".message-content__wrapper .ark-msg-content-container:not(.lite-tools-cover-canvas)",
                );
                if (arkMsgContentContainer) {
                  arkMsgContentContainer.classList.add("lite-tools-cover-canvas");
                  arkMsgContentContainer.insertAdjacentHTML("beforeend", htmlCard);
                }
              } else {
                log("没有对应卡片");
              }
            } catch (err) {
              log("重写卡片出错", err);
            }
          }
        }

        // 消息靠左
        if (options.message.selfMsgToLeft) {
          messageEl.querySelector(".message-container")?.classList?.remove("message-container--self");
          messageEl.querySelector(".message-container")?.classList?.remove("message-container--align-right");
          messageEl.querySelector(".user-name")?.classList?.remove("user-name--selfRole");
          messageEl.querySelector(".user-name")?.classList?.remove("user-name--selfReverse");
        }

        // 图片自适应宽度
        if (options.message.imageAutoWidth) {
          const findImageElement = msgRecord?.elements?.find((element) => element?.picElement && element?.picElement?.picSubType === 0);
          if (findImageElement) {
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
            // 如果是图片或表情则额外判断一次
            const classList = ["mix-message__container--pic", "mix-message__container--market-face"];
            if (classList.some((className) => bubbleInside.classList.contains(className))) {
              const elements = msgRecord?.elements;
              const minWidth =
                options.message.showMsgTime && options.message.showMsgTimeFullDate && !options.message.showMsgTimeToSenderName ? 200 : 120;
              if (
                elements.length === 1 &&
                ((elements[0]?.marketFaceElement ? 150 : 0) >= minWidth || elements[0]?.picElement?.picWidth >= minWidth)
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
                newTimeEl.title = `${fullTime}`;
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

        // 插入+1按钮
        if (slotEl && options.message.replaceBtn && !msgRecord?.lite_tools_recall) {
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
                  const peer = getPeer();
                  log("复读消息", peer);
                  forwardMessage(peer, peer, [msgId]);
                  doubleClick = false;
                }
                doubleClick = true;
              } else {
                const peer = getPeer();
                log("复读消息", peer);
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

        // 插入撤回提示
        if (slotEl && options.preventMessageRecall.enabled) {
          // 撤回插入元素
          if (msgRecord?.lite_tools_recall) {
            // 通用消息撤回处理方法
            messageRecall(messageEl, msgRecord?.lite_tools_recall);
          }
        }

        // 连续消息合并
        if (options.message.avatarSticky.enabled && options.message.mergeMessage) {
          const oldType = msgElMergeType.get(msgRecord?.msgId);
          if (oldType) {
            messageEl.classList.add("merge", oldType);
          }
        }

        // 添加url预览信息
        if (options.message.previreUrl) {
          const findURL = msgRecord?.elements?.find((element) => urlMatch.test(element?.textElement?.content));
          showWebPreview(findURL?.textElement?.content, messageEl);
        }

        // 传统处理流传
        debounceProcessingMsgList();
      }
    }
  }
}

/**
 * 消息靠右额外处理函数
 * @param {Object} component 目标消息对象
 */
function messageToleft(component) {
  if (options.message.selfMsgToLeft && component?.vnode?.el?.classList?.contains("message-container")) {
    Object.defineProperty(component.proxy, "isSelfAlignRight", {
      enumerable: true,
      configurable: true,
      get() {
        return false;
      },
      set() {},
    });
  }
}

/**
 * 初始化当前已加载的消息元素
 * @param {Boolean} recursion 是否递归检测
 */
const initMessageList = (recursion = true) => {
  const curMsgs = app.__vue_app__.config.globalProperties.$store.state.aio_chatMsgArea.msgListRef.curMsgs;
  const curMsgsLength = curMsgs.length;
  // 没有找到消息列表数组且兼容选项未启用时，调用自身防抖函数并直接退出
  if (!curMsgs.length && recursion) {
    debounceInitMessageList();
    return;
  }
  for (let index = 0; index < curMsgsLength; index++) {
    const el = curMsgs[index];
    const msgItemEl = document.querySelector(`[id="${el.id}"]`);
    const messageEl = msgItemEl.querySelector(".message");
    if (messageEl) {
      log("处理可见消息数据");
      singleMessageProcessing(messageEl, el.data);
    } else if (!msgItemEl && recursion) {
      log("消息元素不存在，重新检测可见消息数据", el.id);
      // 如果指定id的消息还没有被渲染出来，则调用自身防抖函数重新处理
      debounceInitMessageList();
    }
  }
};

/**
 * 防抖处理已加载的消息元素
 */
const debounceInitMessageList = debounce(initMessageList);
initMessageList();

/**
 * 判断当前消息是不是子消息
 * @return {Boolean}
 */
function isChildMessage(msgRecord, nextMsgRecord) {
  // 如果其中一个参数为空则直接返回false
  if (!(msgRecord && nextMsgRecord)) {
    return false;
  }
  // uni是否一致
  const uniEqual = msgRecord?.senderUid === nextMsgRecord?.senderUid;
  // 匿名昵称是否一致
  const anonymousEqual = msgRecord?.anonymousExtInfo?.anonymousNick === nextMsgRecord?.anonymousExtInfo?.anonymousNick;
  // 下一条消息不是灰色提示
  const notGrayTip = nextMsgRecord?.elements?.[0]?.grayTipElement === null;
  // 当前消息没有显示时间
  const notShowTime = options.message.mergeMessageKeepTime ? !msgRecord?.showTimestamp : true;
  // 返回是不是子消息
  return uniEqual && anonymousEqual && notGrayTip && notShowTime;
}

/**
 * 初始化监听器
 */
function initObserver() {
  const mlList = document.querySelector(".ml-area.v-list-area .virtual-scroll-area .ml-list.list");
  if (mlList) {
    new MutationObserver(() => {
      if (options.compatibleLLAPI) {
        log("兼容模式更新");
        debounceInitMessageList(false);
      }
      // 在消息列表发生变化时触发更新消息列表更新逻辑
      debounceProcessingMsgList();
    }).observe(mlList, {
      childList: true,
      subtree: true,
    });
  } else {
    setTimeout(initObserver, 500);
  }
}
initObserver();
