import { options } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("全局样式");

/**
 * 注入全局样式
 */
async function initStyle() {
  // 插入自定义样式style容器
  const backgroundStyle = document.createElement("style");
  backgroundStyle.classList.add("background-style");
  document.body.appendChild(backgroundStyle);

  // 全局加载通用样式
  const globalStyle = document.createElement("style");
  globalStyle.textContent = await lite_tools.getGlobalStyle();
  globalStyle.classList.add("global-style");
  document.body.append(globalStyle);

  // 调试用-styleCss刷新
  lite_tools.updateStyle((event, message) => {
    const element = document.querySelector(".background-style");
    if (element) {
      let backgroundImage = "";
      if (/\.(jpg|png|gif|JPG|PNG|GIF)/.test(options.background.url)) {
        backgroundImage = `:root{--background-wallpaper:url("local:///${options.background.url.replace(/\\/g, "//")}")}`;
      }
      element.textContent = message + "\n" + backgroundImage;
    }
  });

  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle((event, message) => {
    const element = document.querySelector(".global-style");
    element.removeAttribute("href");
    if (element) {
      element.textContent = message;
    }
  });
  log("模块已加载");
}
export { initStyle };
