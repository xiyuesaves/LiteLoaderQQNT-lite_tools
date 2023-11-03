// 刷新背景样式
let styleText = "";
import { options } from "./options.js";
import { first } from "./first.js";
import { logs } from "./logs.js";
const log = new logs("背景模块").log;
/**
 * 更新背景元素
 */
async function updateWallpaper() {
  const backgroundStyle = document.querySelector(".background-style");
  if (options.background.enabled) {
    const backgroundUrl = `llqqnt://local-file/${options.background.url}`;
    if (!styleText) {
      styleText = await lite_tools.getStyle();
    }
    // 如果url指向图片类型则直接插入css中
    let backgroundImage = "";
    if (/\.(jpg|png|gif|JPG|PNG|GIF)$/.test(options.background.url)) {
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundImage = `:root{--background-wallpaper:url("${backgroundUrl}")}`;
    } else if (/\.(mp4|MP4)$/.test(options.background.url)) {
      let videoEl = document.querySelector(".background-wallpaper-video");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.setAttribute("loop", "");
        videoEl.setAttribute("src", backgroundUrl);
        videoEl.classList.add("background-wallpaper-video");
        videoEl.volume = 0;
        if (document.querySelector(".tab-container")) {
          document.querySelector(".tab-container").appendChild(videoEl);
        } else if (document.querySelector(".container")) {
          document.querySelector(".container").appendChild(videoEl);
        } else if (document.querySelector("#app.forward")) {
          document.querySelector("#app.forward").appendChild(videoEl);
        } else {
          console.error("自定义视频挂载失败");
        }
      } else {
        if (videoEl.getAttribute("src") !== backgroundUrl) {
          videoEl.setAttribute("src", backgroundUrl);
        }
      }
    } else {
      document.querySelector(".background-wallpaper-video")?.remove();
    }
    backgroundStyle.textContent = backgroundImage + styleText;
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
  if (first("wallpaper")) {
    log("模块已加载");
  } else {
    log("更新背景");
  }
}

export { updateWallpaper };
