// 媒体预览增强
async function betterImageViewer() {
  const { options } = await import("./options.js");
  // 修复弹窗字体模糊
  document.body.classList.add("image-viewer");
  // 针对图片的单击关闭图片
  const appEl = document.querySelector("#app");
  const option = { attributes: false, childList: true, subtree: true };
  const callback = (mutationsList, observer) => {
    const img = document.querySelector(".main-area__image");
    const video = document.querySelector("embed");
    if (img && options.imageViewer.quickClose) {
      observer.disconnect();
      let isMove = false;
      img.addEventListener("mousedown", (event) => {
        if (event.button === 0) {
          isMove = false;
        }
      });
      img.addEventListener("mousemove", (event) => {
        if (event.button === 0) {
          isMove = true;
        }
      });
      img.addEventListener("mouseup", (event) => {
        let rightMenu = document.querySelector("#qContextMenu");
        if (!isMove && event.button === 0 && !rightMenu) {
          document.querySelector(`div[aria-label="关闭"]`).click();
        }
      });
    } else if (video) {
      // 判断打开的是视频
      observer.disconnect();
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(appEl, option);
}

export { betterImageViewer };
