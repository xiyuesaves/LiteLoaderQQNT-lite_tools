import { options, updateOptions } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("全局样式");
updateOptions(updateFont);
async function updateFont() {
  if (!options.message.overrideFont.fullName) {
    document.body.style.fontFamily = "";
    document.body.style.fontStyle = "";
    return;
  }
  if (options.message.overrideFont.fullName.includes(",")) {
    document.body.style.fontFamily = "";
    options.message.overrideFont.fullName.split(",").forEach((fontName, index) => {
      document.body.style.fontFamily += `${index === 0 ? "" : ","}"${fontName.trim()}"`;
    });
  } else {
    document.body.style.fontFamily = `"${options.message.overrideFont.fullName}"`;
  }
  if (options.message.overrideFont.family) {
    document.body.style.fontFamily += `, "${options.message.overrideFont.family}"`;
  }
  document.body.style.fontStyle = options.message.overrideFont.style;
}
/**
 * 注入全局样式
 */
function initStyle() {
  // 加载通用样式
  const globalStyle = document.createElement("link");
  globalStyle.id = "liteToolsGlobalStyle";
  globalStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/css/global.css?r=${new Date().getTime()}`);
  globalStyle.setAttribute("rel", "stylesheet");
  document.body.append(globalStyle);

  // 插入自定义样式style容器
  const backgroundStyle = document.createElement("link");
  backgroundStyle.id = "liteToolsBackgroundStyle";
  if (options.background.enabled) {
    backgroundStyle.setAttribute(
      "href",
      `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/css/style.css?r=${new Date().getTime()}`,
    );
  }
  backgroundStyle.setAttribute("rel", "stylesheet");
  document.body.appendChild(backgroundStyle);

  // 调试用-styleCss刷新
  lite_tools.updateStyle(() => {
    log("更新styleCss");
    if (options.background.enabled) {
      backgroundStyle.setAttribute(
        "href",
        `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/css/style.css?r=${new Date().getTime()}`,
      );
    }
  });

  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle(() => {
    log("更新globalCss");
    globalStyle.setAttribute("href", `local:///${LiteLoader.plugins.lite_tools.path.plugin}/src/css/global.css?r=${new Date().getTime()}`);
  });

  updateFont();
  log("模块已加载");
}
initStyle();
