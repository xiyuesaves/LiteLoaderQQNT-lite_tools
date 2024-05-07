import { Logs } from "./logs.js";
const log = new Logs("链接预览");
import { webPreview } from "./HTMLtemplate.js";
const urlMatch = /https?:\/\/[\w\-_]+\.[\w]{1,10}[\S]+/i;
import { options, updateOptions } from "./options.js";

/**
 * 超过这个尺寸的图片将被放到消息下方展示
 * @type {number}
 */
const MAX_IMG_WIDTH = 800;

/**
 * 缓存200条预览数据
 * @type {Map}
 */
let cacheMap = new Map();
const MAX_CACHE_SIZE = 200;

/**
 * 是否加载图片
 */
let dontLoadPic = options.message.previreUrl.dontLoadPic;

/**
 * 监听配置更新
 */
updateOptions((newOptions) => {
  // 如果 dontLoadPic 配置变化则清空缓存
  if (dontLoadPic !== newOptions.message.previreUrl.dontLoadPic) {
    cacheMap = new Map();
    dontLoadPic = newOptions.message.previreUrl.dontLoadPic;
  }
});

/**
 * 监听预览数据
 */
lite_tools.onWebPreviewData((_, msgId, previewData) => {
  const msgContainer = document.querySelector(`[id="${msgId}"] .message .msg-content-container`);
  if (!msgContainer) {
    // 预览数据不存在
    return;
  }
  if (!previewData.success) {
    // 获取预览数据失败
    return;
  }
  if (!previewData.data.description) {
    // 没有数据
    return;
  }
  log("获取到预览数据", previewData.data.url, previewData);
  // 缓存预览数据
  cacheMap.set(previewData.data.url, previewData);
  // 超出阈值则移除10%最早的数据
  if (cacheMap.size > MAX_CACHE_SIZE) {
    const array = Array.from(cacheMap);
    const arrayLength = array.length;
    cacheMap = new Map(array.splice(0, arrayLength - arrayLength * 0.1));
  }
  setPreviewData(msgContainer, previewData);
});

/**
 * 获取页面预览数据
 * @param {String} context 含有链接的文本
 * @param {Element} element 目标消息元素
 */
export function showWebPreview(context, element, msgId) {
  const msgContainer = element.querySelector(".msg-content-container");
  if (!context || !element || element.classList.contains("lite-tools-web-preview-added") || !msgContainer) {
    return;
  }
  element.classList.add("lite-tools-web-preview-added");
  const findUrl = context.match(urlMatch);
  if (!findUrl) {
    return;
  }
  const url = findUrl[0];
  const findCache = cacheMap.get(url);
  if (findCache) {
    setPreviewData(msgContainer, findCache);
    cacheMap.delete(url);
    cacheMap.set(url, findCache);
  } else {
    lite_tools.getWebPrevew(msgId, url);
  }
}

/**
 * 设置预览数据
 * @param {Element} msgContainer 目标消息元素
 * @param {Object} previewData 预览数据
 */
function setPreviewData(msgContainer, previewData) {
  const injectHTML = webPreview.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    switch (name) {
      case "alt":
        return previewData.data.alt || "";
      case "title":
        return previewData.data.title || "";
      case "desc":
        return previewData.data.description || "";
      case "siteName":
        return previewData.data.site_name || "";
      default:
        return name;
    }
  });
  msgContainer.insertAdjacentHTML("beforeend", injectHTML);
  if (previewData.data.image) {
    const img = document.createElement("img");
    if (previewData.data.showMaxImg !== undefined) {
      const chosenImg = msgContainer.querySelector(`.lite-tools-web-preview-img${previewData.data.showMaxImg ? ".max-img" : ".small-img"}`);
      chosenImg.appendChild(img);
      chosenImg.classList.remove("LT-disabled");
    } else {
      img.addEventListener("load", () => {
        const showMaxImg = img.width > MAX_IMG_WIDTH;
        const chosenImg = msgContainer.querySelector(`.lite-tools-web-preview-img${showMaxImg ? ".max-img" : ".small-img"}`);
        chosenImg.appendChild(img);
        chosenImg.classList.remove("LT-disabled");
        const findCache = cacheMap.get(previewData.data.url);
        if (findCache) {
          findCache.data.showMaxImg = showMaxImg;
        }
      });
    }
    img.src = previewData.data.image;
  }
  let hasMove = 0;
  const webPreviewCard = msgContainer.querySelector(`.lite-tools-web-preview`);
  webPreviewCard.addEventListener("pointerdown", (event) => {
    if (event.buttons === 1) {
      hasMove = 0;
    } else {
      hasMove = 3;
    }
  });
  webPreviewCard.addEventListener("pointermove", (event) => {
    if (event.buttons === 1) {
      hasMove += Math.abs(event.movementX) + Math.abs(event.movementY);
    }
  });
  webPreviewCard.addEventListener("pointerup", () => {
    if (hasMove <= 2) {
      lite_tools.openWeb(previewData.data.url);
      hasMove = 3;
    }
  });
  webPreviewCard.addEventListener("pointerout", () => {
    hasMove = 3;
  });
  const embedSolt = msgContainer.querySelector(".lite-tools-slot.embed-slot");
  if (embedSolt) {
    embedSolt.classList.add("outside-embed");
    msgContainer.appendChild(embedSolt);
  }
}
