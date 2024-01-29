// 刷新背景样式
let styleText = "";
import { options, updateOptions } from "./options.js";
import { first } from "./first.js";
import { Logs } from "./logs.js";
const log = new Logs("背景模块");

updateOptions(updateWallpaper);

/**
 * 更新背景元素
 */
async function updateWallpaper() {
  const backgroundStyle = document.querySelector(".background-style");
  if (options.background.enabled) {
    const backgroundUrl = `local:///${options.background.url.replace(/\\/g, "//")}`;
    if (!styleText) {
      styleText = await lite_tools.getStyle();
    }
    // 如果url指向图片类型则直接插入css中
    let backgroundImage = "";
    // 链接被判断为图片类型
    if (/\.(jpg|png|gif|JPG|PNG|GIF)$/.test(options.background.url)) {
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundImage = `:root{--background-wallpaper:url("${backgroundUrl}")}`;
      backgroundStyle.textContent = styleText + "\n" + backgroundImage;
      // 链接被判断为视频类型
    } else if (/\.(mp4|MP4)$/.test(options.background.url)) {
      // 视频背景需要先清除之前的图片背景
      backgroundStyle.textContent = styleText;
      let videoEl = document.querySelector(".background-wallpaper-video");
      // 如果已经有video元素了，那么直接替换资源路径
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
      // 链接被判断为无效
    } else {
      backgroundStyle.textContent = styleText;
      document.querySelector(".background-wallpaper-video")?.remove();
    }
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
  if (first("wallpaper")) {
    log("模块已加载");
  } else {
    log("重载背景");
  }
}

export { updateWallpaper };
