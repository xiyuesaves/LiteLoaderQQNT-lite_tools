/**
 * 注入全局样式
 */
async function initStyle() {
  const { options } = await import("./options.js");
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
        backgroundImage = `:root{--background-wallpaper:url("llqqnt://local-file/${options.background.url}")}`;
      }
      element.textContent = backgroundImage + message;
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
}
export { initStyle };
