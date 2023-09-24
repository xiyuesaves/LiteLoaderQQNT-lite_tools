// 运行在 Electron 渲染进程 下的页面脚本
let options,
  styleText,
  log = console.log,
  initLog = () => {}; // console.log;

// 首次执行检测，只有第一次执行时返回true
const first = (() => {
  const set = new Set();
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
})();

// 防抖函数
function debounce(fn, time) {
  let timer = null;
  return function (...args) {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, time);
  };
}

// 通用初始化函数
function initFunction(func) {
  // 窗口启动的1分钟之内每隔10ms应用一次配置信息
  let timeout = new Date().getTime() + 30 * 1000;
  loop();
  function loop() {
    if (timeout > new Date().getTime()) {
      setTimeout(loop, 10);
      func();
    }
  }
}

// 通用样式加载函数
async function updateWallpaper() {
  const backgroundStyle = document.querySelector(".background-style");
  if (options.background.enabled) {
    if (!styleText) {
      styleText = await lite_tools.getStyle();
    }
    // 如果url指向图片类型则直接插入css中
    let backgroundImage = "";
    if (/\.(jpg|png|gif|JPG|PNG|GIF)$/.test(options.background.url)) {
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundImage = `:root{--background-wallpaper:url("llqqnt://local-file/${options.background.url}")}`;
    } else if (/\.(mp4|MP4)$/.test(options.background.url)) {
      let videoEl = document.querySelector(".background-wallpaper-video");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.setAttribute("loop", "");
        videoEl.setAttribute("src", options.background.url);
        videoEl.classList.add("background-wallpaper-video");
        videoEl.volume = 0;
        if (document.querySelector(".tab-container")) {
          document.querySelector(".tab-container").appendChild(videoEl);
        } else if (document.querySelector(".container")) {
          document.querySelector(".container").appendChild(videoEl);
        } else if (document.querySelector("#app.forward")) {
          document.querySelector("#app.forward").appendChild(videoEl);
        } else {
          log("自定义视频挂载失败");
        }
      } else {
        if (videoEl.getAttribute("src") !== options.background.url) {
          videoEl.setAttribute("src", options.background.url);
        }
      }
    } else {
      document.querySelector(".background-wallpaper-video")?.remove();
    }
    backgroundStyle.textContent = backgroundImage + styleText;
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
}

// 通用消息撤回方法
function messageRecall(el, find) {
  // log("该消息为撤回内容", el);

  // 气泡-嵌入（必须含有文本内容的消息,文件消息）
  const bubbleEmbed = el.querySelector(
    ":not(.mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face)>.message-content.mix-message__inner,.normal-file.file-element .file-info,.file-info-mask p:last-child,.message-content__wrapper .count,.reply-message__container .reply-message__inner"
  );
  // 气泡-内部消息（单独的图片/视频消息，自己发送的表情）
  const bubbleInside = el.querySelector(".mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face,.msg-preview");
  // 气泡-外部消息（兜底样式）
  const bubbleOutside = el.querySelector(".message-container .message-content__wrapper");

  // 标记为已撤回消息
  el.classList.add("lite-tools-recall-msg");

  // 创建撤回标记元素
  const messageRecallEl = document.createElement("div");
  const showTimeEl = el.querySelector(".lite-tools-time");
  messageRecallEl.innerText = "已撤回";
  messageRecallEl.setAttribute("data-recall", "已撤回");
  messageRecallEl.title = `消息于 ${new Date(find.recallTime * 1000).toLocaleString()} 被 ${find.operatorNick} 撤回`;
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

// 通用监听消息列表方法
function observerMessageList(msgListEl, msgItemEl, isForward = false) {
  let lastMessageNodeList = [];
  let childElHeight = new Map();
  new MutationObserver(async (mutations, observe) => {
    // 循环元素列表
    const currentItemList = Array.from(document.querySelectorAll(msgItemEl));
    const validItemList = currentItemList; //.filter((current) => !lastMessageNodeList.includes(current));
    validItemList.unshift(lastMessageNodeList.pop());
    lastMessageNodeList = currentItemList;
    // 所有功能使用同一个循环执行
    log("---新循环---");
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
            ":not(.mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face)>.message-content.mix-message__inner,.normal-file.file-element .file-info,.file-info-mask p:last-child,.message-content__wrapper .count,.reply-message__container .reply-message__inner"
          );
          // 气泡-内部消息（单独的图片/视频消息，自己发送的表情）
          const bubbleInside = el.querySelector(".mix-message__container--pic,.mix-message__container--market-face,.mix-message__container--lottie-face,.msg-preview");
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
        if (msgEl && el.querySelector(":not(.ptt-message,.file-message--content,wallet-message__container,ark-msg-content-container).mix-message__container") && !replaceEl) {
          const newReplaceEl = document.createElement("div");
          const msgId = el.id;
          newReplaceEl.classList.add("message-content-replace");
          newReplaceEl.innerText = "+1";
          newReplaceEl.addEventListener("click", async () => {
            const peer = await lite_tools.getPeer();
            log("点击了复读按钮", peer, msgId);
            lite_tools.forwardMessage(peer, peer, [msgId]);
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
  }).observe(document.querySelector(msgListEl), {
    attributes: true,
    attributeFilter: ["style"],
    childList: true,
    subtree: false,
  });
}

// 通用监听输入框编辑事件
function observeChatBox() {
  const ckeditorInstance = document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance;
  let isReply = false;

  const originalApplyOperation = ckeditorInstance.editing.model.applyOperation;
  const patchedApplyOperation = function (...args) {
    // 在检测到插入回复节点后，在10ms内阻止插入At节点和空格消息
    if (options.message.removeReplyAt) {
      if (args[0]?.nodes?._nodes[0]?.name === "msg-reply" && !isReply) {
        isReply = true;
        setTimeout(() => {
          isReply = false;
        });
      }
      if (args[0]?.nodes?._nodes[0]?.name === "msg-at" && isReply) {
        args[0].nodes._nodes = [];
      }
      if (args[0]?.nodes?._nodes[0]?._data === " " && isReply) {
        args[0].nodes._nodes = [];
        isReply = false;
      }
    }
    return originalApplyOperation.call(ckeditorInstance.editing.model, ...args);
  };
  ckeditorInstance.editing.model.applyOperation = patchedApplyOperation;

  // addMethodListener(ckeditorInstance);
  // // 调试函数
  // function addMethodListener(obj, parent = "", deep = 0, maxDeep = 10) {
  //   for (const prop in obj) {
  //     if (typeof obj[prop] === "function") {
  //       const originalMethod = obj[prop];
  //       obj[prop] = function (...args) {
  //         console.log(`方法 "${parent}${parent ? "." : ""}${prop}" 被调用，参数：`, args);
  //         return originalMethod.call(obj, ...args);
  //       };
  //     } else if (maxDeep > deep && typeof obj[prop] === "object") {
  //       addMethodListener(obj[prop], `${parent}${parent ? "." : ""}${prop}`, deep);
  //     }
  //   }
  // }
}

// 新的撤回事件触发该方法
function newMessageRecall() {
  lite_tools.onMessageRecall((_, message) => {
    log("触发撤回事件", message);
    const el = document.querySelector(`[id="${message.msgId}"]`);
    if (!el.querySelector(".lite-tools-recall")) {
      messageRecall(el, message.recallData);
    }
  });
}

// 阻止拖拽多选消息
function touchMoveSelectin(className) {
  let interception;
  document.querySelector("#app").addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      interception = interception =
        !(event.target.classList.contains("message-content__wrapper") || doesParentHaveClass(event.target, "message-content__wrapper")) &&
        (event.target.classList.contains(className) || doesParentHaveClass(event.target, className));
    }
  });
  document.querySelector(`.${className}`).addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      if (document.querySelector("#qContextMenu")) {
        document.querySelector("#qContextMenu").remove();
      }
    }
  });
  document.querySelector("#app").addEventListener("mousemove", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      if (interception) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}

// 判断父元素是否包含指定类名
function doesParentHaveClass(element, className) {
  let parentElement = element.parentElement;
  while (parentElement !== null) {
    if (parentElement.classList.contains(className)) {
      return true;
    }
    parentElement = parentElement.parentElement;
  }
  return false;
}

// 媒体预览增强
function imageViewer() {
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  // 针对图片的单击关闭图片
  const appEl = document.querySelector("#app");
  const option = { attributes: false, childList: true, subtree: true };
  const callback = (mutationsList, observer) => {
    const img = document.querySelector(".main-area__image");
    const video = document.querySelector("embed");
    if (img && options.imageViewer.quickClose) {
      observer.disconnect();
      let isMove = false;
      img.addEventListener("mousedown", (event) => {
        if (event.button === 0) {
          isMove = false;
        }
      });
      img.addEventListener("mousemove", (event) => {
        if (event.button === 0) {
          isMove = true;
        }
      });
      img.addEventListener("mouseup", (event) => {
        let rightMenu = document.querySelector("#qContextMenu");
        if (!isMove && event.button === 0 && !rightMenu) {
          document.querySelector(`div[aria-label="关闭"]`).click();
        }
      });
    } else if (video) {
      // 判断打开的是视频
      observer.disconnect();
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(appEl, option);
}

// 首页处理
async function mainMessage() {
  // 初始化页面
  initFunction(updatePage);

  // 监听输入框上方功能
  function observerChatArea() {
    new MutationObserver((mutations, observe) => {
      document.querySelectorAll(".chat-input-area .chat-func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.textAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新输入框上方功能列表
      const textAreaList = Array.from(document.querySelectorAll(".chat-func-bar .bar-icon"))
        .map((el) => {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            id: el.querySelector(".icon-item").id,
            disabled: el.classList.contains(".disabled"),
          };
        })
        .filter((el) => !options.textAreaFuncList.find((_el) => _el.name === el.name));
      if (textAreaList.length) {
        log("发送输入框上方功能列表");
        lite_tools.sendTextAreaList(textAreaList);
      }
    }).observe(document.querySelector(".chat-input-area"), {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  // 监听聊天框上方功能
  function observeChatTopFunc() {
    new MutationObserver((mutations, observe) => {
      document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.chatAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新聊天框上方功能列表
      const textAreaList = Array.from(document.querySelectorAll(".panel-header__action .func-bar .bar-icon"))
        .map((el) => {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            id: el.querySelector(".icon-item").id,
            disabled: el.classList.contains(".disabled"),
          };
        })
        .filter((el) => !options.chatAreaFuncList.find((_el) => _el.name === el.name));
      if (textAreaList.length) {
        log("发送聊天框上方功能列表");
        lite_tools.sendChatTopList(textAreaList);
      }
    }).observe(document.querySelector(".panel-header__action"), {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  // 刷新页面配置
  async function updatePage() {
    // 初始化推荐表情
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
    } else {
      document.querySelector(".sticker-bar")?.classList.remove("disabled");
    }
    // 初始化顶部侧边栏
    document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
      const find = options.sidebar.top.find((opt) => opt.index == index);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 初始化底部侧边栏
    document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item").forEach((el, index) => {
      const find = options.sidebar.bottom.find((opt) => opt.index == index);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 禁用GIF热图
    if (options.message.disabledHotGIF) {
      document.body.classList.add("disabled-sticker-hot-gif");
    } else {
      document.body.classList.remove("disabled-sticker-hot-gif");
    }
    // 禁用小红点
    if (options.message.disabledBadge) {
      document.body.classList.add("disabled-badge");
    } else {
      document.body.classList.remove("disabled-badge");
    }
    // 初始化输入框上方功能
    if (document.querySelector(".chat-input-area") && first("chat-input-area")) {
      observerChatArea();
    }
    // 初始化聊天框上方功能
    if (document.querySelector(".panel-header__action") && first("chat-message-area")) {
      observeChatTopFunc();
    }
    // 消息列表监听器
    if (document.querySelector(".ml-list.list") && first("msgList")) {
      observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
    }
    // 禁用滑动多选消息
    if (document.querySelector(".chat-msg-area") && first("disabledSlideMultipleSelection")) {
      touchMoveSelectin("chat-msg-area");
    }
    // 绑定输入框
    if (document.querySelector(".ck.ck-content.ck-editor__editable") && first(".ck.ck-content.ck-editor__editable")) {
      observeChatBox();
    }
    // 处理输入框上方功能列表
    document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.textAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 处理消息列表上方功能列表
    document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.chatAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 更新自定义样式
    if (first("init-wallpaper")) {
      updateWallpaper();
    }
  }

  // 配置文件更新
  lite_tools.updateOptions(() => {
    log("首页配置更新");
    updateWallpaper();
    updatePage();
  });

  // 设置页面获取侧边栏项目
  lite_tools.optionsOpen((event, message) => {
    let top = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
      if (el.getAttribute("aria-label")) {
        if (el.getAttribute("aria-label").includes("消息")) {
          return {
            name: "消息",
            index,
            disabled: el.classList.contains("disabled"),
          };
        } else {
          return {
            name: el.getAttribute("aria-label"),
            index,
            disabled: el.classList.contains("disabled"),
          };
        }
      } else if (el.querySelector(".game-center-item")) {
        return {
          name: "游戏中心",
          index,
          disabled: el.classList.contains("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.classList.contains("disabled"),
        };
      }
    });
    let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
      if (el.querySelector(".icon-item").getAttribute("aria-label")) {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          index,
          disabled: el.classList.contains("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.classList.contains("disabled"),
        };
      }
    });
    lite_tools.sendSidebar({
      top,
      bottom,
    });
  });
}

// 独立聊天窗口
function chatMessage() {
  updatePage();
  initFunction(updatePage);
  async function updatePage() {
    // 禁用贴纸
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
    } else {
      document.querySelector(".sticker-bar")?.classList.remove("disabled");
    }
    // 禁用GIF热图
    if (options.message.disabledHotGIF) {
      document.body.classList.add("disabled-sticker-hot-gif");
    } else {
      document.body.classList.remove("disabled-sticker-hot-gif");
    }
    // 禁用滑动多选消息
    if (document.querySelector(".chat-msg-area") && first("disabledSlideMultipleSelection")) {
      touchMoveSelectin("chat-msg-area");
    }
    // 绑定输入框
    if (document.querySelector(".ck.ck-content.ck-editor__editable") && first(".ck.ck-content.ck-editor__editable")) {
      observeChatBox();
    }
    // 禁用输入框上方功能
    document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.textAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 禁用聊天框上方功能
    document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.chatAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 更新自定义样式
    if (first("init-wallpaper")) {
      updateWallpaper();
    }
  }
  // 配置更新
  lite_tools.updateOptions(() => {
    console.log("独立聊天配置更新");
    updateWallpaper();
    updatePage();
  });
  // 附加消息发送时间
  observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
}

// 转发消息界面
function forwardMessage() {
  document.querySelector("#app").classList.add("forward");
  updateWallpaper();
  observerMessageList(".list .q-scroll-view", ".list .q-scroll-view > div", true);
  lite_tools.updateOptions(() => {
    log("转发页面配置更新");
    updateWallpaper();
  });
}

// 页面加载完成时触发
async function onLoad() {
  // 输出logo
  initLog("%c轻量工具箱已加载", "border-radius: 8px;padding:10px 20px;font-size:18px;background:linear-gradient(to right, #3f7fe8, #03ddf2);color:#fff;");

  // 加载模块
  // 防抖函数
  // const debounce = await import("./modules/debounce.js");
  const { opt } = await import("./modules/options.js");
  const { hookVue3 } = await import("./modules/hookVue3.js");
  const { addEventqContextMenu } = await import("./modules/qContextMenu.js");

  addEventqContextMenu(opt);

  hookVue3();
  // 获取最新的配置信息
  options = opt;
  initLog("已获取最新配置文件", options);

  // 判断是否输出日志
  if (!options.debug) {
    log = () => {};
  } else {
    log("已开启debug");
  }

  // 插入自定义样式style容器
  const backgroundStyle = document.createElement("style");
  backgroundStyle.classList.add("background-style");
  document.body.appendChild(backgroundStyle);
  initLog("插入自定义样式style容器");

  // 全局加载通用样式
  const globalStyle = document.createElement("style");
  globalStyle.textContent = await lite_tools.getGlobalStyle();
  globalStyle.classList.add("global-style");
  document.body.append(globalStyle);
  initLog("插入全局通用样式");

  // 调试用-styleCss刷新
  lite_tools.updateStyle((event, message) => {
    const element = document.querySelector(".background-style");
    if (element) {
      log("更新背景样式");
      let backgroundImage = "";
      if (/\.(jpg|png|gif|JPG|PNG|GIF)/.test(options.background.url)) {
        backgroundImage = `:root{--background-wallpaper:url("llqqnt://local-file/${options.background.url}")}`;
      }
      element.textContent = backgroundImage + message;
    }
  });
  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle((event, message) => {
    const element = document.querySelector(".global-style");
    element.removeAttribute("href");
    if (element) {
      log("更新全局通用样式");
      element.textContent = message;
    }
  });

  // 全局注册撤回事件监听
  newMessageRecall(".ml-list.list .ml-item");

  // 全局加载监听选中文本事件
  // qContextMenu();

  // 所有页面都需要执行的更新操作
  updatePage();
  lite_tools.updateOptions(() => {
    log("全局设置更新");
    updatePage();
  });

  function updatePage() {
    // 是否开启日志输出
    if (options.debug) {
      log = console.log;
    } else {
      log = () => {};
    }
    // 判断是否开启头像黏贴效果
    if (options.message.avatarSticky.enabled) {
      document.body.classList.add("avatar-sticky");
      if (options.message.avatarSticky.toBottom) {
        document.body.classList.add("avatar-end");
      } else {
        document.body.classList.remove("avatar-end");
      }
    } else {
      document.body.classList.remove("avatar-sticky", "avatar-end");
    }
    // 是否开启消息合并
    if (options.message.avatarSticky.enabled && options.message.mergeMessage) {
      document.body.classList.add("merge-message");
    } else {
      document.body.classList.remove("merge-message");
      document.querySelectorAll(".avatar-span").forEach((el) => {
        el.style.height = "unset";
      });
    }
  }
  initLog("初始化已完成，等待监听导航跳转");

  // 监听导航跳转
  navigation.addEventListener("navigatesuccess", navigateChange);
  function navigateChange() {
    initLog("监听到导航跳转");
    updateHash();
  }

  // 如果因为加载过久导致hash已经变动，这是备用触发方式
  updateHash();
  function updateHash() {
    let hash = location.hash;
    if (hash.includes("#/chat/")) {
      hash = "#/chat/message";
    } else if (hash.includes("#/forward")) {
      hash = "#/forward";
    }
    // 没有捕获到正确hash，直接退出
    if (hash === "#/blank") {
      return;
    }
    navigation.removeEventListener("navigatesuccess", navigateChange);
    initLog(`页面参数 ${hash}`);
    switch (hash) {
      case "#/imageViewer":
        if (first("is-active")) {
          initLog("加载图片预览窗口函数");
          imageViewer();
        }
        break;
      case "#/main/message":
        if (first("is-active")) {
          initLog("加载主窗口函数");
          mainMessage();
        }
        break;
      case "#/chat/message":
        if (first("is-active")) {
          initLog("加载独立聊天窗口函数");
          chatMessage();
        }
        break;
      case "#/forward":
        if (first("is-active")) {
          initLog("加载转发消息窗口函数");
          forwardMessage();
        }
        break;
    }
  }
}

// 打开设置界面时触发
async function onConfigView(view) {
  // await new Promise((res) => setTimeout(res, 5000));

  // 更新配置信息
  const { opt } = await import("./modules/options.js");
  options = opt;

  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.css`;
  const html_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.html`;

  // 引入更新模块;
  const { checkUpdate } = await import(`llqqnt://local-file/${plugin_path}/src/modules/checkUpdate.js`);

  // 检查更新
  checkUpdate(view);

  // CSS
  const link_element = document.createElement("link");
  link_element.rel = "stylesheet";
  link_element.href = css_file_path;
  document.head.appendChild(link_element);

  // HTMl
  const html_text = await (await fetch(html_file_path)).text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html_text, "text/html");
  doc.querySelectorAll("section").forEach((node) => view.appendChild(node));

  // 调试模式动态更新样式
  lite_tools.updateSettingStyle((event, message) => {
    link_element.href = css_file_path + `?r=${new Date().getTime()}`;
  });

  // 显示插件版本信息
  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools");
  });

  // 向设置界面插入动态选项
  function addOptionLi(list, element, objKey, key) {
    list.forEach((el, index) => {
      const hr = document.createElement("hr");
      hr.classList.add("horizontal-dividing-line");
      const li = document.createElement("li");
      li.classList.add("vertical-list-item");
      const switchEl = document.createElement("div");
      switchEl.classList.add("q-switch");
      if (!el[key]) {
        switchEl.classList.add("is-active");
      }
      switchEl.setAttribute("index", index);
      switchEl.addEventListener("click", function () {
        Function("options", `options.${objKey}[${index}].${key} = ${this.classList.contains("is-active")}`)(options);
        this.classList.toggle("is-active");
        lite_tools.setOptions(options);
      });
      const span = document.createElement("span");
      span.classList.add("q-switch__handle");
      switchEl.appendChild(span);
      const title = document.createElement("h2");
      title.innerText = el.name;
      li.append(title, switchEl);
      element.append(hr, li);
    });
  }

  // 获取侧边栏按钮列表
  options.sidebar = await lite_tools.getSidebar({ type: "get" });
  const sidebar = view.querySelector(".sidebar ul");
  addOptionLi(options.sidebar.top, sidebar, "sidebar.top", "disabled");
  addOptionLi(options.sidebar.bottom, sidebar, "sidebar.bottom", "disabled");

  // 添加输入框上方功能列表
  addOptionLi(options.textAreaFuncList, view.querySelector(".textArea ul"), "textAreaFuncList", "disabled");

  // 添加聊天框上方功能列表
  addOptionLi(options.chatAreaFuncList, view.querySelector(".chatArea ul"), "chatAreaFuncList", "disabled");

  // 列表展开功能
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
  });

  // 划词搜索
  addSwitchEventlistener("wordSearch.enabled", ".switchSelectSearch", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-search-url").classList.remove("hidden");
    } else {
      view.querySelector(".select-search-url").classList.add("hidden");
    }
    if (first("init-world-search-option")) {
      const searchEl = view.querySelector(".search-url");
      searchEl.value = options.wordSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.wordSearch.searchUrl = searchEl.value;
          log("更新搜索url", searchEl.value);
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 图片搜索
  addSwitchEventlistener("imageSearch.enabled", ".switchImageSearch", (_, enabled) => {
    if (enabled) {
      view.querySelector(".image-select-search-url").classList.remove("hidden");
    } else {
      view.querySelector(".image-select-search-url").classList.add("hidden");
    }
    if (first("init-image-search-option")) {
      const searchEl = view.querySelector(".img-search-url");
      searchEl.value = options.imageSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.imageSearch.searchUrl = searchEl.value;
          log("更新搜索url", searchEl.value);
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 头像黏贴消息框效果
  addSwitchEventlistener("message.avatarSticky.enabled", ".avatarSticky", (_, enabled) => {
    if (enabled) {
      view.querySelector(".avatar-bottom-li").classList.remove("hidden");
    } else {
      view.querySelector(".avatar-bottom-li").classList.add("hidden");
    }
  });

  // 合并消息
  addSwitchEventlistener("message.mergeMessage", ".mergeMessage");

  // 头像置底
  addSwitchEventlistener("message.avatarSticky.toBottom", ".avatar-bottom");

  // 移除回复时的@标记
  addSwitchEventlistener("message.removeReplyAt", ".removeReplyAt");

  // 阻止撤回
  addSwitchEventlistener("message.preventMessageRecall", ".preventMessageRecall");

  // 快速关闭图片
  addSwitchEventlistener("imageViewer.quickClose", ".switchQuickCloseImage");

  // 复读机
  addSwitchEventlistener("message.switchReplace", ".switchReplace");

  // 禁用推荐表情
  addSwitchEventlistener("message.disabledSticker", ".switchSticker");

  // 禁用表情GIF热图
  addSwitchEventlistener("message.disabledHotGIF", ".switchHotGIF");

  // 禁用红点
  addSwitchEventlistener("message.disabledBadge", ".disabledBadge");

  // 将哔哩哔哩小程序替换为url卡片
  addSwitchEventlistener("message.convertMiniPrgmArk", ".switchDisabledMiniPrgm");

  // 自动打开来自手机的链接或者卡片消息
  addSwitchEventlistener("message.autoOpenURL", ".switchAutoOpenURL");

  // debug开关
  addSwitchEventlistener("debug", ".switchDebug");

  // 显示每条消息发送时间
  addSwitchEventlistener("message.showMsgTime", ".showMsgTime");

  // 禁用滑动多选消息
  addSwitchEventlistener("message.disabledSlideMultipleSelection", ".switchDisabledSlideMultipleSelection");

  // 添加消息后缀
  addSwitchEventlistener("tail.enabled", ".msg-tail", (_, enabled) => {
    if (enabled) {
      view.querySelector(".message-tail").classList.remove("hidden");
    } else {
      view.querySelector(".message-tail").classList.add("hidden");
    }
    if (first("init-tail-option")) {
      const tailEl = view.querySelector(".tail-content");
      tailEl.value = options.tail.content;
      tailEl.addEventListener(
        "input",
        debounce(() => {
          options.tail.content = tailEl.value;
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 后缀是否换行
  addSwitchEventlistener("tail.newLine", ".msg-tail-newline");

  // 自定义背景
  addSwitchEventlistener("background.enabled", ".switchBackgroundImage", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-path").classList.remove("hidden");
    } else {
      view.querySelector(".select-path").classList.add("hidden");
    }
    if (first("init-background-option")) {
      view.querySelector(".select-path input").value = options.background.url;
      view.querySelectorAll(".select-file").forEach((el) => {
        el.addEventListener("click", () => {
          lite_tools.openSelectBackground();
        });
      });
    }
  });

  // 初始化设置界面
  function addSwitchEventlistener(optionKey, switchClass, callback) {
    const option = Function("options", `return options.${optionKey}`)(options);
    if (option) {
      view.querySelector(switchClass).classList.add("is-active");
    } else {
      view.querySelector(switchClass).classList.remove("is-active");
    }
    // 初始化时执行一次callback方法
    if (callback) {
      callback(null, option);
    }
    view.querySelector(switchClass).addEventListener("click", function (event) {
      this.classList.toggle("is-active");
      let newOptions = Object.assign(options, Function("options", `options.${optionKey} = ${this.classList.contains("is-active")}; return options`)(options));
      lite_tools.setOptions(newOptions);
      if (callback) {
        callback(event, this.classList.contains("is-active"));
      }
    });
  }

  // 监听设置文件变动
  lite_tools.updateOptions(() => {
    console.log("设置界面配置更新");
    view.querySelector(".select-path input").value = options.background.url;
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };

// 输入框方法
// document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance.data
