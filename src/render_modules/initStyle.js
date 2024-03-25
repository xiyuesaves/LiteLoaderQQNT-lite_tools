import { options, updateOptions } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("全局样式");
updateOptions(updateFont);
function updateFont() {
  document.body.style.fontFamily = options.message.overrideFont;
}
/**
 * 注入全局样式
 */
function initStyle() {
  // 加载通用样式
  const globalStyle = document.createElement("link");
  globalStyle.id = "liteToolsGlobalStyle";
  globalStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/global.css?r=${new Date().getTime()}`);
  globalStyle.setAttribute("rel", "stylesheet");
  document.body.append(globalStyle);

  // 插入自定义样式style容器
  const backgroundStyle = document.createElement("link");
  backgroundStyle.id = "liteToolsBackgroundStyle";
  if (options.background.enabled) {
    backgroundStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/style.css?r=${new Date().getTime()}`);
  }
  backgroundStyle.setAttribute("rel", "stylesheet");
  document.body.appendChild(backgroundStyle);

  // 调试用-styleCss刷新
  lite_tools.updateStyle(() => {
    log("更新styleCss");
    if (options.background.enabled) {
      backgroundStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/style.css?r=${new Date().getTime()}`);
    }
  });

  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle(() => {
    log("更新globalCss");
    globalStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/global.css?r=${new Date().getTime()}`);
  });

  updateFont();
  log("模块已加载");
}
initStyle();
