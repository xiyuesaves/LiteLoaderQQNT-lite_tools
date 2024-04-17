import { Logs } from "./logs.js";
const log = new Logs("链接预览");
import { webPreview } from "./HTMLtemplate.js";
const urlMatch = /https?:\/\/[\w\-_]+\.[\w]{1,10}[\S]+/i;
// 超过这个尺寸的图片将被放到消息下方展示
const MAX_IMG_WIDTH = 800;
/**
 * 获取页面预览数据
 * @param {String} context 含有链接的文本
 * @param {Element} element 目标消息元素
 */
export async function showWebPreview(context, element) {
  const msgContainer = element.querySelector(".msg-content-container");
  if (!context || !element || element.classList.contains("lite-tools-web-preview-added") || !msgContainer) {
    return;
  }
  element.classList.add("lite-tools-web-preview-added");
  const findUrl = context.match(urlMatch);
  if (!findUrl) {
    return;
  }
  log("获取到链接", findUrl[0]);
  const previewData = await lite_tools.getWebPrevew(findUrl[0]);
  if (!previewData.success) {
    log("获取预览数据失败", findUrl[0], previewData);
    return;
  }
  if (!previewData.data.description) {
    log("数据不足", findUrl[0], previewData);
    return;
  }
  log("获取到预览数据", findUrl[0], previewData);
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
  let hasMove = 0;
  msgContainer.querySelector(`.lite-tools-web-preview`).addEventListener("pointerdown", (event) => {
    if (event.buttons === 1) {
      hasMove = 0;
    } else {
      hasMove = 3;
    }
  });
  msgContainer.querySelector(`.lite-tools-web-preview`).addEventListener("pointermove", (event) => {
    if (event.buttons === 1) {
      hasMove += Math.abs(event.movementX) + Math.abs(event.movementY);
    }
  });
  msgContainer.querySelector(`.lite-tools-web-preview`).addEventListener("pointerup", () => {
    if (hasMove <= 2) {
      lite_tools.openWeb(findUrl[0]);
      hasMove = 3;
    }
  });
  msgContainer.querySelector(`.lite-tools-web-preview`).addEventListener("pointerout", () => {
    hasMove = 3;
  });
  if (previewData.data.image) {
    const img = document.createElement("img");
    img.addEventListener("error", () => {
      log("图片加载失败", findUrl[0], img);
    });
    img.addEventListener("load", () => {
      const showMaxImg = img.width > MAX_IMG_WIDTH;
      msgContainer.querySelector(`.lite-tools-web-preview-img${showMaxImg ? ".max-img" : ".small-img"}`).appendChild(img);
      msgContainer.querySelector(`.lite-tools-web-preview-img${showMaxImg ? ".max-img" : ".small-img"}`).classList.remove("LT-disabled");
    });
    img.src = previewData.data.image.replace(/^(http:\/\/|https:\/\/|\/\/)?/, "https://");
  }
  const embedSolt = element.querySelector(".lite-tools-slot.embed-slot");
  if (embedSolt) {
    embedSolt.classList.add("outside-embed");
    msgContainer.appendChild(embedSolt);
  }
}
