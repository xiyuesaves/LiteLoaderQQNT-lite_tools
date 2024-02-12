// 刷新背景样式
let styleText = "";
let timeout;
import { Logs } from "./logs.js";
const log = new Logs("背景模块");

/**
 * 更新背景元素
 */
async function updateWallpaper(enabled, wallpaperData) {
  const { href, type } = wallpaperData;
  const backgroundStyle = document.querySelector(".background-style");
  // 初始化背景样式
  if (!styleText) {
    styleText = await lite_tools.getStyle();
  }
  // 循环直到匹配到对应元素为止
  if (!document.querySelector(".tab-container,.container,#app.forward")) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      log("没有找到元素，等待中");
      updateWallpaper(enabled, wallpaperData);
    }, 100);
  }
  if (enabled) {
    log("更新背景");
    backgroundStyle.textContent = styleText;
    if (type === "video") {
      let videoEl = document.querySelector(".background-wallpaper-video");
      // 如果已经有video元素了，那么直接替换资源路径
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.setAttribute("loop", "true");
        videoEl.setAttribute("src", href);
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
        if (videoEl.getAttribute("src") !== href) {
          log("修改视频背景地址");
          videoEl.setAttribute("src", href);
        }
      }
    } else {
      log("更新背景为图片");
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundStyle.textContent += `\n:root{--background-wallpaper:url("${href}")}`;
    }
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
}
log("模块已加载");
lite_tools.onUpdateWallpaper((...data) => {
  log("被动监听", data);
  updateWallpaper(data[1], data[2]);
});
lite_tools.getWallpaper().then((data) => updateWallpaper(...data));
