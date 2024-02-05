import { options } from "./options.js";
import { searchIcon, copyIcon, imageIcon } from "./svg.js";
import "./wrapText.js";
import { getMembersAvatar } from "./nativeCall.js";
import { isMac } from "./isMac.js";
import { Logs } from "./logs.js";
const log = new Logs("右键菜单");
/**
 * 右键菜单插入功能方法
 * @param {Element} qContextMenu 右键菜单元素
 * @param {String} icon SVG字符串
 * @param {String} title 选项显示名称
 * @param {Function} callback 回调函数
 */
function addQContextMenu(qContextMenu, icon, title, callback) {
  if (!document.querySelector(`.q-context-menu :not([disabled="true"])`)) {
    return;
  }
  const tempEl = document.createElement("div");
  tempEl.innerHTML = document.querySelector(`.q-context-menu :not([disabled="true"])`)?.outerHTML?.replace(/<!---->/g, "");
  const item = tempEl.firstChild;
  item.id = "web-search";
  if (item.querySelector(".q-icon")) {
    item.querySelector(".q-icon").innerHTML = icon;
  }
  if (item.classList.contains("q-context-menu-item__text")) {
    item.innerText = title;
  } else {
    item.querySelector(".q-context-menu-item__text").innerText = title;
  }
  item.addEventListener("click", () => {
    callback();
    qContextMenu.remove();
  });
  qContextMenu.appendChild(item);
}

/**
 * 右键菜单监听
 */
function addEventqContextMenu() {
  let selectText = "";
  let isRightClick = false;
  let imagePath = "";
  let eventName = "mouseup";
  let uid = "";
  let msgSticker = null;
  if (isMac) {
    eventName = "mousedown";
  }
  document.addEventListener(eventName, async (event) => {
    if (event.button === 2) {
      isRightClick = true;
      selectText = window.getSelection().toString();
      let imgEl = event.target;
      uid = event.target.querySelector(".avatar.vue-component")?.__VUE__?.[0]?.props?.uid;
      if (!uid?.startsWith("u_")) {
        uid = "";
      }
      if (imgEl.classList.contains("image-content") && imgEl?.src?.startsWith("appimg://")) {
        imagePath = imgEl?.src?.replace("appimg://", "");
      } else {
        imagePath = "";
      }
      const messageEl = getParentElement(event.target, "message");
      if (messageEl) {
        log(messageEl?.__VUE__?.[0]?.props);
        const msgRecord = messageEl?.__VUE__?.[0]?.props?.msgRecord;
        const elements = msgRecord?.elements;
        const userNameEl = messageEl.querySelector(".user-name .text-ellipsis");
        if (elements.length === 1 && elements[0].textElement && userNameEl) {
          const content = elements[0].textElement.content;
          const userName = msgRecord?.sendMemberName || msgRecord?.sendNickName;
          const userUid = msgRecord?.senderUid;
          const fontFamily = getComputedStyle(userNameEl).getPropertyValue("font-family");
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
          log("符合生成条件", msgSticker);
        }
      }
    } else {
      isRightClick = false;
      selectText = "";
      imagePath = "";
      uid = "";
      msgSticker = null;
    }
  });
  new MutationObserver(() => {
    const qContextMenu = document.querySelector(".q-context-menu");
    log("右键菜单", document.querySelectorAll(".q-context-menu"));
    // 在网页搜索
    if (qContextMenu && isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      addQContextMenu(qContextMenu, searchIcon, "搜索", () => {
        lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
      });
    }
    // 搜索图片
    if (qContextMenu && imagePath && options.imageSearch.enabled) {
      let localPath = decodeURIComponent(imagePath);
      addQContextMenu(qContextMenu, searchIcon, "搜索图片", () => {
        const filePathArr = localPath.split("/");
        const fileName = filePathArr[filePathArr.length - 1].split(".")[0].toUpperCase().replace("_0", "");
        const picSrc = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${fileName}/0`;
        const openUrl = options.imageSearch.searchUrl.replace("%search%", picSrc);
        lite_tools.openWeb(openUrl);
      });
    }
    // 复制uid
    if (uid) {
      const _uid = uid;
      addQContextMenu(qContextMenu, copyIcon, "复制Uid", async () => {
        await navigator.clipboard.writeText(_uid);
      });
    }
    // 消息转图片
    if (options.messageToImage.enabled && msgSticker) {
      const _msgSticker = msgSticker;
      addQContextMenu(qContextMenu, imageIcon, "转图片", () => {
        createSticker(_msgSticker);
      });
    }
  }).observe(document.querySelector("body"), { childList: true });
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
  ctx.fillStyle = "#999999";
  ctx.fillText(config.userName, 42 * zoom, 14 * zoom);
  ctx.restore();
  // 绘制气泡框
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(42 * zoom, 20 * zoom, (config.width + 20) * zoom, (config.height + 16) * zoom, 8 * zoom);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  // 绘制文本
  ctx.save();
  ctx.font = 14 * zoom + "px " + config.fontFamily;
  ctx.fillStyle = "#333333";
  ctx.wrapText(config.content, 52 * zoom, 41 * zoom, (config.width + 2) * zoom, 22 * zoom);
  ctx.restore();
  const base64 = canvasEl.toDataURL("image/png", 1);
  lite_tools.saveBase64ToFile(`${new Date().getTime()}.png`, base64);
}

export { addEventqContextMenu };
