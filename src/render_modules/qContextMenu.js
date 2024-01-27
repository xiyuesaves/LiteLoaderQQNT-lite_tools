import { options } from "./options.js";
import { searchIcon } from "./svg.js";
import { logs } from "./logs.js";
const log = new logs("右键菜单").log;
/**
 * 右键菜单插入功能方法
 * @param {Element} qContextMenu 右键菜单元素
 * @param {String} icon SVG字符串
 * @param {String} title 选项显示名称
 * @param {Function} callback 回调函数
 */
function addQContextMenu(qContextMenu, icon, title, callback) {
  const tempEl = document.createElement("div");
  tempEl.innerHTML = document.querySelector(`.q-context-menu :not([disabled="true"])`).outerHTML.replace(/<!---->/g, "");
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
  const isMac = /macintosh|mac os x/i.test(navigator.userAgent);
  if (isMac) {
    eventName = "mousedown";
  }
  document.addEventListener(eventName, (event) => {
    if (event.button === 2) {
      isRightClick = true;
      selectText = window.getSelection().toString();
      let imgEl = event.target;
      if (imgEl.classList.contains("image-content") && imgEl?.src?.startsWith("appimg://")) {
        imagePath = imgEl?.src?.replace("appimg://", "");
      } else {
        imagePath = "";
      }
    } else {
      isRightClick = false;
      selectText = "";
      imagePath = "";
    }
  });
  new MutationObserver(() => {
    // log(document.querySelector(".q-context-menu").innerHTML);

    const qContextMenu = document.querySelector(".q-context-menu");
    // 在网页搜索
    if (qContextMenu && isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      addQContextMenu(qContextMenu, searchIcon, "搜索", () => {
        lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
      });
    }
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
  }).observe(document.querySelector("body"), { childList: true });
}

export { addEventqContextMenu };
