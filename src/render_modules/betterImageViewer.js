import { options } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("快速关闭图片");
/**
 * 媒体预览增强
 */
function betterImageViewer() {
  log("模块加载");
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  let offset = 0;
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.buttons === 1) {
        offset = 0;
      } else {
        offset = 3;
      }
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.buttons === 1) {
        offset += Math.abs(event.movementX) + Math.abs(event.movementY);
      }
    },
    true,
  );
  document.addEventListener(
    "pointerup",
    (event) => {
      const rightMenu = document.querySelector(".q-context-menu");
      const video = document.querySelector("embed");
      if (options.imageViewer.quickClose && offset < 2 && event.buttons === 0 && !rightMenu && !video) {
        if (event.target.closest(".main-area__content")) {
          document.querySelector(`div[aria-label="关闭"]`).click();
        }
      }
    },
    true,
  );
}

export { betterImageViewer };
