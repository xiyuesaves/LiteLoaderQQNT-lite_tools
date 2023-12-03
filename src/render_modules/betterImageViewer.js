import { options } from "./options.js";
import { doesParentHaveClass } from "./doesParentHaveClass.js";

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
      if (doesParentHaveClass(event.target, "main-area__footer", "main-container-warp") || doesParentHaveClass(event.target, "main-area__left", "main-container-warp") || doesParentHaveClass(event.target, "main-area__right", "main-container-warp")) {
        return;
      }
      console.log("关闭");
      document.querySelector(`div[aria-label="关闭"]`).click();
    }
  });
}

export { betterImageViewer };
