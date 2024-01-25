import { options } from "./options.js";
import { logs } from "./logs.js";
const log = new logs("快速关闭图片").log;
/**
 * 媒体预览增强
 */
function betterImageViewer() {
  log("模块加载");
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  let offset = 0;
  document.addEventListener("mousedown", (event) => {
    if (event.buttons === 1) {
      offset = 0;
    } else {
      offset = 3;
    }
  });
  document.addEventListener("mousemove", (event) => {
    if (event.buttons === 1) {
      offset += Math.abs(event.movementX) + Math.abs(event.movementY);
    }
  });
  document.addEventListener("mouseup", (event) => {
    const rightMenu = document.querySelector(".q-context-menu");
    const video = document.querySelector("embed");
    if (offset < 2 && event.buttons === 0 && !rightMenu && !video && options.imageViewer.quickClose) {
      if (event.target.closest(".main-area__content")) {
        document.querySelector(`div[aria-label="关闭"]`).click();
      }
    }
  });
}

export { betterImageViewer };
