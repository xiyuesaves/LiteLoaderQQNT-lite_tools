import { Logs } from "./logs.js";
const log = new Logs("链接预览");
import { webPreview } from "./HTMLtemplate.js";
const urlMatch = /https?:\/\/[\w\-_]+\.[\w]{1,10}[\S]+/i;

/**
 * 超过这个尺寸的图片将被放到消息下方展示
 * @type {number}
 */
const MAX_IMG_WIDTH = 800;

/**
 * 等待预览数据列表
 * @type {Map}
 */
const awaitList = new Map();

lite_tools.onWebPreviewData((_, uuid, previewData) => {
  const msgContainer = awaitList.get(uuid);
  awaitList.delete(uuid);
  log("获取到预览数据", uuid, previewData);
  log("当前等待url预览列表长度", awaitList.size);
  if (!msgContainer) {
    log("目标消息不存在", msgContainer);
    return;
  }
  if (!previewData.success) {
    log("获取预览数据失败", previewData);
    return;
  }
  if (!previewData.data.description) {
    log("数据不足", previewData);
    return;
  }
  log("获取到预览数据", previewData);
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
  if (previewData.data.image) {
    const img = document.createElement("img");
    img.addEventListener("load", () => {
      const showMaxImg = img.width > MAX_IMG_WIDTH;
      const chosenImg = msgContainer.querySelector(`.lite-tools-web-preview-img${showMaxImg ? ".max-img" : ".small-img"}`);
      chosenImg.appendChild(img);
      chosenImg.classList.remove("LT-disabled");
    });
    img.src = previewData.data.image;
  }
  const embedSolt = msgContainer.querySelector(".lite-tools-slot.embed-slot");
  if (embedSolt) {
    embedSolt.classList.add("outside-embed");
    msgContainer.appendChild(embedSolt);
    log("移动插槽位置");
  }
});

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
  const uuid = crypto.randomUUID();
  awaitList.set(uuid, msgContainer);
  lite_tools.getWebPrevew(uuid, findUrl[0]);
}
