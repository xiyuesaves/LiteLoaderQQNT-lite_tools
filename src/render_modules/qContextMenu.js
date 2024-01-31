import { options } from "./options.js";
import { searchIcon, copyIcon } from "./svg.js";
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
  if (isMac) {
    eventName = "mousedown";
  }
  document.addEventListener(eventName, (event) => {
    if (event.button === 2) {
      isRightClick = true;
      selectText = window.getSelection().toString();
      let imgEl = event.target;
      uid = event.target.querySelector(".avatar.lite-tools-vue-component")?.__VUE__?.[0]?.props?.uid;
      if (!uid?.startsWith("u_")) {
        uid = "";
      }
      if (imgEl.classList.contains("image-content") && imgEl?.src?.startsWith("appimg://")) {
        imagePath = imgEl?.src?.replace("appimg://", "");
      } else {
        imagePath = "";
      }
    } else {
      isRightClick = false;
      selectText = "";
      imagePath = "";
      uid = "";
    }
  });
  new MutationObserver(() => {
    const qContextMenu = document.querySelector(".q-context-menu");
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
  }).observe(document.querySelector("body"), { childList: true });
}

export { addEventqContextMenu };
