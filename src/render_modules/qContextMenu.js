import { options } from "./options.js";
import { localEmoticonsIcon, searchIcon, copyIcon, imageIcon } from "./svg.js";
import { subMenuIconEl } from "./HTMLtemplate.js";
import { emoticonsList } from "./localEmoticons.js";
import { getPicUrl } from "./getPicUrl.js";
import "./wrapText.js";
import { getMembersAvatar } from "./nativeCall.js";
import { showToast } from "./toast.js";
import { Logs } from "./logs.js";
const log = new Logs("右键菜单");

/**
 * 右键菜单插入功能方法
 * @param {Element} qContextMenu - 右键菜单元素
 * @param {String} icon - SVG字符串
 * @param {String} title - 选项显示名称
 * @param {Function | [Array, Function]} args - 回调函数或子菜单数组和回调函数的组合
 */
function addQContextMenu(qContextMenu, icon, title, ...args) {
  let callback;
  let subMenu;
  if (args[0] instanceof Function) {
    callback = args[0];
  }
  if (args[0] instanceof Array) {
    subMenu = args[0];
  }
  if (args[1] instanceof Function) {
    callback = args[1];
  }
  if (
    !document.querySelector(`.q-context-menu>:not(.menu-stickers-wrapper,[disabled="true"])`) &&
    !document.querySelector(`.q-context-menu-item:not([disabled="true"])`)
  ) {
    return;
  }
  /**
   * @type {Element}
   */
  const contextItem =
    document.querySelector(`.q-context-menu>:not(.menu-stickers-wrapper,[disabled="true"])`)?.cloneNode(true) ??
    document.querySelector(`.q-context-menu-item:not([disabled="true"])`)?.cloneNode(true);
  if (!contextItem) {
    log("克隆右键菜单选项失败");
    return;
  }
  log("创建右键菜单项");
  if (subMenu && subMenu.length && contextItem.querySelector(".q-context-menu-item__text")) {
    contextItem.insertAdjacentHTML("beforeend", subMenuIconEl);
    const subMenuEl = document.createElement("div");
    const scrollEl = document.createElement("div");
    let closeSubMenuTimeout;
    scrollEl.classList.add("lite-tools-scroll-box");
    subMenuEl.appendChild(scrollEl);
    subMenuEl.classList.add("lite-tools-sub-context-menu");
    subMenuEl.addEventListener("mouseenter", () => {
      clearTimeout(closeSubMenuTimeout);
      subMenuEl.classList.add("show");
    });
    subMenuEl.addEventListener("mouseleave", () => {
      closeSubMenuTimeout = setTimeout(() => {
        subMenuEl.classList.remove("show");
      }, 300);
    });
    subMenuEl.addEventListener("click", (event) => {
      callback(event, event.target.menuData);
    });
    subMenuEl.addEventListener("wheel", (event) => {
      const maxTop = scrollEl.offsetHeight - subMenuEl.offsetHeight + 8;
      if (maxTop < 10) {
        return;
      }
      let addValue = 30;
      if (event.deltaY > 0) {
        addValue = -30;
      }
      let offsetY = (parseFloat(scrollEl.style.transform.split("translateY(")[1]) || 0) + addValue;
      if (offsetY > 0) {
        offsetY = 0;
      }
      if (offsetY < -maxTop) {
        offsetY = -maxTop;
      }
      scrollEl.style.transform = `translateY(${offsetY}px)`;
    });
    subMenu.forEach((menuData) => {
      const subMenuItemEl = document.createElement("div");
      subMenuItemEl.classList.add("sub-context-menu-item");
      subMenuItemEl.innerText = menuData.name;
      subMenuItemEl.menuData = menuData;
      scrollEl.appendChild(subMenuItemEl);
    });
    contextItem.addEventListener("mouseenter", (event) => {
      clearTimeout(closeSubMenuTimeout);
      const rect = event.target.getBoundingClientRect();
      subMenuEl.classList.add("show");
      subMenuEl.style.setProperty("--top", `calc(${rect.y}px - 0vh)`);
      subMenuEl.style.setProperty("--left", `calc(${rect.x + rect.width}px - 0vh)`);
      subMenuEl.style.setProperty("--height", `${subMenuEl.offsetHeight}px`);
      subMenuEl.style.setProperty("--width", `${subMenuEl.offsetWidth}px`);
    });
    contextItem.addEventListener("mouseleave", () => {
      closeSubMenuTimeout = setTimeout(() => {
        subMenuEl.classList.remove("show");
      }, 300);
    });
    document.body.appendChild(subMenuEl);
  }
  if (contextItem.querySelector(".q-icon")) {
    contextItem.querySelector(".q-icon").innerHTML = icon;
  }
  if (contextItem.classList.contains("q-context-menu-item__text")) {
    contextItem.innerText = title;
  } else {
    contextItem.querySelector(".q-context-menu-item__text").innerText = title;
  }
  // 有子菜单时不添加主菜单的点击事件
  if (callback && !subMenu) {
    contextItem.addEventListener("click", () => {
      callback();
      qContextMenu.remove();
    });
  }
  qContextMenu.appendChild(contextItem);
}

/**
 * 右键菜单监听
 */
function addEventqContextMenu() {
  /**
   * 划词搜索
   */
  let selectText = "";
  /**
   * 图片路径 - 搜索用
   */
  let searchImagePath = "";
  /**
   * 图片，表情包路径
   */
  let imagePath = "";
  /**
   * 鼠标左键是否抬起 防止左键没松开就按右键搜索 导致搜索的内容为上一次的内容
   */
  let isLeftUp = true;
  /**
   * 判断按下的是不是右键
   */
  let isRightClick = false;
  /**
   * 监听事件名称
   */
  let eventName = "mouseup";
  /**
   * 用于生成消息表情的数据
   */
  let msgSticker = null;
  /**
   * 裁切字符串到指定长度
   * @param {String} str 选中字符串
   * @param {Number} len 裁切长度
   * @returns String
   */
  const strTruncate = function (str, len) {
    if (str.length > len) {
      return str.slice(0, len) + "...";
    }
    return str;
  };

  // 使用原生系统判断
  if (LiteLoader.os.platform !== "win32") {
    eventName = "mousedown";
  }

  document.addEventListener("mouseup", async (event) => {
    if (event.button === 0) {
      //  鼠标左键抬起就代表文字选好了
      selectText = window.getSelection().toString();
      isLeftUp = true;
    }
  });
  document.addEventListener("mousedown", async (event) => {
    if (event.button === 0) {
      isLeftUp = false;
    } else if (event.button === 2 && !isLeftUp) {
      selectText = window.getSelection().toString(); //  鼠标左键未抬起时按右键 就需要更新选中内容
    }
  });

  document.addEventListener(eventName, async (event) => {
    if (event.button === 2) {
      imagePath = "";
      searchImagePath = "";
      msgSticker = null;
      isRightClick = true;
      const messageEl = getParentElement(event.target, "message");
      if (messageEl) {
        const msgRecord = messageEl?.__VUE__?.[0]?.props?.msgRecord;
        const elements = msgRecord?.elements;
        // 生成表情逻辑
        if (elements.length === 1 && elements[0].textElement) {
          if (app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Aio?.curAioData?.chatType === 1) {
            const header = app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Aio?.curAioData?.header;
            const content = elements[0].textElement.content;
            const userName = header?.peerName || header?.memberName || header?.remark;
            const userUid = header?.uid;
            const fontFamily = getComputedStyle(messageEl).getPropertyValue("font-family");
            const msgEl = messageEl.querySelector(".message-content__wrapper .text-element");
            const width = msgEl.offsetWidth;
            const height = msgEl.offsetHeight;
            msgSticker = {
              userName,
              userUid,
              content,
              fontFamily,
              width,
              height,
            };
            log("符合生成条件-好友", msgSticker);
          } else if (app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Aio?.curAioData?.chatType === 2) {
            const content = elements[0].textElement.content;
            const userName = msgRecord?.sendMemberName || msgRecord?.sendNickName;
            const userUid = msgRecord?.senderUid;
            const fontFamily = getComputedStyle(messageEl).getPropertyValue("font-family");
            const msgEl = messageEl.querySelector(".message-content__wrapper .text-element");
            const width = msgEl.offsetWidth;
            const height = msgEl.offsetHeight;
            msgSticker = {
              userName,
              userUid,
              content,
              fontFamily,
              width,
              height,
            };
            log("符合生成条件-群组", msgSticker);
          }
        }
        // 发送图片检测
        if (event.target.classList.contains("image-content") && elements.some((ele) => ele.picElement)) {
          imagePath = decodeURI(event.target.src.replace(/^appimg:\/\//, ""));
          event.target.parentElement.__VUE__.forEach((el) => {
            if (el?.ctx?.picData) {
              searchImagePath = encodeURIComponent(getPicUrl(el.ctx.picData));
            }
          });
          log(decodeURIComponent(searchImagePath));
        }
        // 发送表情包检测
        if (elements.some((ele) => ele.marketFaceElement)) {
          imagePath = "qqface:" + elements.find((ele) => ele.marketFaceElement)?.marketFaceElement?.dynamicFacePath;
        }
      }
    } else {
      imagePath = "";
      searchImagePath = "";
      msgSticker = null;
    }
  });
  // 菜单监听
  new MutationObserver((_, observer) => {
    const qContextMenu = document.querySelector(".q-context-menu:not(.lite-toos-context-menu)");
    if (!qContextMenu) {
      if (!document.querySelector(".q-context-menu")) {
        document.querySelectorAll(".lite-tools-sub-context-menu").forEach((el) => el.remove());
      }
      return;
    }
    qContextMenu.classList.add("lite-toos-context-menu");
    log("右键菜单", document.querySelector(".q-context-menu").outerHTML);

    if (options.message.HighlightReplies) {
      const targetElements = qContextMenu.querySelectorAll("span.q-context-menu-item__text");
      targetElements.forEach((element) => {
        if (element.textContent === "回复") {
          element.parentNode.style.color = "green";
        }
        if (element.textContent === "引用") {
          element.parentNode.style.color = "green";
        }
        if (element.textContent === "撤回") {
          element.parentNode.style.color = "red";
        }
        if (element.textContent === "删除") {
          element.parentNode.style.color = "red";
        }
      });
    }

    // 在网页搜索
    if (isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      addQContextMenu(qContextMenu, searchIcon, "搜索: " + strTruncate(selectText, 4), () => {
        lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
      });
    }
    // 搜索图片
    if (searchImagePath && options.imageSearch.enabled) {
      const _searchImagePath = searchImagePath;
      addQContextMenu(qContextMenu, searchIcon, "搜索图片", () => {
        const openUrl = options.imageSearch.searchUrl.replace("%search%", _searchImagePath);
        lite_tools.openWeb(openUrl);
      });
    }
    // 保存到本地表情文件夹
    log("图片地址", imagePath);
    if (imagePath && options.localEmoticons.enabled && options.localEmoticons.copyFileTolocalEmoticons) {
      const _imagePath = imagePath;
      const subMenuList = emoticonsList.map(({ name, path }) => ({ name, path }));
      addQContextMenu(qContextMenu, localEmoticonsIcon, "保存到本地表情", subMenuList, async (event, data) => {
        const filePathArr = _imagePath.replace(/\\/g, "/").split("/");
        const filePath = `${data.path}\\${filePathArr[filePathArr.length - 1]}`.replace("\\", "/");
        if (_imagePath.startsWith("qqface:")) {
          const rawPath = _imagePath.split("qqface:")[1];
          if (await lite_tools.copyFile(rawPath + "_aio.png", filePath + "_aio.png")) {
            showToast("保存成功", "success", 3000);
          } else if (await lite_tools.copyFile(rawPath + "_thu.png", filePath + "_thu.png")) {
            showToast("保存成功", "success", 3000);
          } else if (!(await lite_tools.copyFile(rawPath, filePath + ".png"))) {
            showToast("保存失败", "error", 3000);
          }
        } else if (await lite_tools.copyFile(_imagePath, filePath)) {
          showToast("保存成功", "success", 3000);
        } else {
          showToast("保存失败", "error", 3000);
        }
      });
    }
    // 消息转图片
    if (options.messageToImage.enabled && msgSticker) {
      const _msgSticker = msgSticker;
      addQContextMenu(qContextMenu, imageIcon, "转图片", () => {
        createSticker(_msgSticker);
      });
    }
  }).observe(document.body, { childList: true });
}

/**
 * 获取父级匹配类名的元素
 * @param {Element} element 目标元素
 * @param {String} className 类名
 */
function getParentElement(element, className) {
  const parentElement = element?.parentElement;
  if (parentElement && parentElement !== document.body) {
    if (parentElement.classList.contains(className)) {
      return parentElement;
    } else {
      return getParentElement(parentElement, className);
    }
  } else {
    return null;
  }
}

/**
 * 生成表情
 * @param {Object} config 表情配置
 */
async function createSticker(config) {
  let zoom = 1;
  const userAvatarMap = await getMembersAvatar([config.userUid]);
  const userAvatar = userAvatarMap.get(config.userUid);
  const canvasEl = document.createElement("canvas");
  const ctx = canvasEl.getContext("2d");
  const img = await new Promise((res) => {
    const image = new Image();
    image.onload = () => res(image);
    image.onerror = () => log("出错");
    image.src = "local:///" + userAvatar;
  });
  // 高清化
  if (options.messageToImage.highResolution) {
    zoom = 2;
  }

  let userNameColor = "#999999";
  let msgBoxColor = "#ffffff";
  let contextColor = "#333333";
  if (app.__vue_app__.config.globalProperties.$store.state.common_AppearanceModeSetting.isDark) {
    userNameColor = "#808080";
    msgBoxColor = "#262626";
    contextColor = "#f2f2f2";
  }

  // 测量用户id长度
  ctx.save();
  ctx.font = 12 + "px " + config.fontFamily;
  const textMetrics = ctx.measureText(config.userName);
  const userNameWidth = textMetrics.width + 42 + 4;
  ctx.restore();
  let canWidth = 4 + 32 + 10 + config.width + 20;
  if (userNameWidth > canWidth) {
    canWidth = userNameWidth;
  }
  log("宽度", userNameWidth, canWidth);
  // 设置画布大小
  canvasEl.width = canWidth * zoom;
  canvasEl.height = (4 + config.height + 16 + 20) * zoom;
  // 绘制圆形头像
  ctx.save();
  ctx.beginPath();
  ctx.arc(20 * zoom, 20 * zoom, 16 * zoom, 0, Math.PI * 2, false);
  ctx.clip(); //剪切路径
  ctx.drawImage(img, 4 * zoom, 4 * zoom, 32 * zoom, 32 * zoom);
  ctx.restore();
  // 绘制用户名
  ctx.save();
  ctx.font = 12 * zoom + "px " + config.fontFamily;
  ctx.fillStyle = userNameColor;
  ctx.fillText(config.userName, 42 * zoom, 14 * zoom);
  ctx.restore();
  // 绘制气泡框
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(42 * zoom, 20 * zoom, (config.width + 20) * zoom, (config.height + 16) * zoom, 8 * zoom);
  ctx.fillStyle = msgBoxColor;
  ctx.fill();
  ctx.restore();
  // 绘制文本
  ctx.save();
  ctx.font = 14 * zoom + "px " + config.fontFamily;
  ctx.fillStyle = contextColor;
  ctx.wrapText(config.content, 52 * zoom, 41 * zoom, (config.width + 2) * zoom, 22 * zoom);
  ctx.restore();
  const base64 = canvasEl.toDataURL("image/png", 1);
  lite_tools.saveBase64ToFile(`${new Date().getTime()}.png`, base64);
  showToast("生成成功", "success", 3000);
}

export { addEventqContextMenu };
