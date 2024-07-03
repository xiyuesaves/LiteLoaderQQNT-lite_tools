import { options, updateOptions } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("全局样式");
const qqntEmojiFont = `"Color Emoji",`;
updateOptions(updateFont);
async function updateFont() {
  if (!options.message.overrideFont.fullName) {
    document.body.style.fontFamily = "";
    document.body.style.fontStyle = "";
    if (options.message.overrideEmoji) {
      // 如果没有自定义字体，但是盖默认emoji，就把默认字体集中的emoji去掉来使用系统自带的emoji
      document.body.style.fontFamily = getComputedStyle(document.body).fontFamily.replace(qqntEmojiFont, "");
    }
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
  if (!options.message.overrideEmoji && document.body.style.fontFamily) { 
    // 如果设置了自定义字体，但是不覆盖默认emoji，就添加默认emoji字体
    document.body.style.fontFamily = qqntEmojiFont + document.body.style.fontFamily;
  }
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
