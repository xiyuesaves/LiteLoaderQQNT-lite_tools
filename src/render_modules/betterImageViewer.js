import { options } from "./options.js";

/**
 * 媒体预览增强
 */
function betterImageViewer() {
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  let isMove = false;
  document.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      isMove = false;
    }
  });
  document.addEventListener("mousemove", (event) => {
    if (event.button === 0) {
      isMove = true;
    }
  });
  document.addEventListener("mouseup", (event) => {
    const rightMenu = document.querySelector("#qContextMenu");
    const video = document.querySelector("embed");
    if (!isMove && event.button === 0 && !rightMenu && !video && options.imageViewer.quickClose) {
      if (
        event.target.closest(".main-area__footer") ||
        event.target.closest(".main-area__left") ||
        event.target.closest(".main-area__right") ||
        event.target.closest(".window-control-area")
      ) {
        return;
      }
      console.log("关闭");
      document.querySelector(`div[aria-label="关闭"]`).click();
    }
  });
}

export { betterImageViewer };
