import { options } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("快速关闭图片");
/**
 * 媒体预览增强
 */
function betterImageViewer() {
  // 判断图片是否超过窗口大小
  let overflow = false;
  let mainImageWrap = null;
  let outerEl = null;
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
        if (options.imageViewer.touchMove && !overflow && !document.querySelector("embed") && !document.querySelector("canvas")) {
          window.moveBy(event.movementX, event.movementY);
          event.preventDefault();
          event.stopPropagation();
        }
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
  function addEventImageContainer() {
    outerEl = document.querySelector(".main-area__image-rotate-wrap");
    mainImageWrap = document.querySelector(".main-area__image-wrap");
    if (mainImageWrap && outerEl) {
      mainImageWrap.addEventListener("transitionend", () => {
        if (mainImageWrap) {
          const rect = mainImageWrap.getBoundingClientRect();
          overflow = rect.width > outerEl.offsetWidth || rect.height > outerEl.offsetHeight;
        }
      });
    } else {
      setTimeout(addEventImageContainer, 10);
    }
  }
  addEventImageContainer();
}

export { betterImageViewer };
