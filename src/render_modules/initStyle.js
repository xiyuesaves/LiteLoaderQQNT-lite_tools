import { options, updateOptions } from "./options.js";
import { Logs } from "./logs.js";
import { debounce } from "./debounce.js";

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

// 系统颜色变化时会自动触发N次……debounce一下
const updateAccentColor = debounce(async function (isAutoUpdate) {
  let colorStyle = document.querySelector("#liteToolsAccentColor");
  if (!colorStyle) {
    colorStyle = document.createElement("style");
    colorStyle.id = "liteToolsAccentColor";
    document.body.appendChild(colorStyle);
  }

  if (options.appearance.useSystemAccentColor) {
    let [accentColor, highlightColor] = await lite_tools.getSystemAccentColor();
    if (isAutoUpdate && document.body.highlightColor === highlightColor) {
      // 系统颜色发生变化时 highlight 更新有延迟，暂时先fallback到主色
      // 过一会儿会有另一个事件触发 highlight 更新
      highlightColor = accentColor;
    } else {
      document.body.highlightColor = highlightColor;
    }

    colorStyle.innerHTML = `
    .q-theme-tokens, .q-theme-tokens-light, .q-theme-tokens-dark {
      --brand_standard: ${accentColor}!important;
      --text_link: ${highlightColor}!important;
      --lt-link-url-color: ${highlightColor}!important;
    }`;
  } else {
    colorStyle.innerHTML = "";
    delete document.body.highlightColor;
  }
}, 100);
updateOptions(updateAccentColor);

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

  updateAccentColor(false);
  lite_tools.onSystemAccentColorChanged(() => updateAccentColor(true));

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
