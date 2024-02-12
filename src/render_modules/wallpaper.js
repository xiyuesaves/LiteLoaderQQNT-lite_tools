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
      log("更新背景为图片");
      const videoEl = document.querySelector(".background-wallpaper-video");
      if (videoEl) {
        log("移除视频元素");
        videoEl.remove();
      }
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
        videoEl.setAttribute("loop", "true");
        videoEl.setAttribute("src", backgroundUrl);
        videoEl.addEventListener("ended", restartVideo);
        videoEl.classList.add("background-wallpaper-video");
        videoEl.volume = 0;
        if (document.querySelector(".tab-container")) {
          document.querySelector(".tab-container").appendChild(videoEl);
          log("成功挂载视频");
        } else if (document.querySelector(".container")) {
          document.querySelector(".container").appendChild(videoEl);
          log("成功挂载视频");
        } else if (document.querySelector("#app.forward")) {
          document.querySelector("#app.forward").appendChild(videoEl);
          log("成功挂载视频");
        } else {
          log("挂载背景视频失败");
        }
      } else {
        if (videoEl.getAttribute("src") !== backgroundUrl) {
          log("修改视频背景地址");
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

function restartVideo(event) {
  log("从头播放");
  event.target.currentTime = 0.1; //setting to zero breaks iOS 3.2, the value won't update, values smaller than 0.1 was causing bug as well.
  event.target.play();
}

export { updateWallpaper };
