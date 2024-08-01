import { options, updateOptions } from "./options.js";
import { Logs } from "./logs.js";

const log = new Logs("全局样式");
const qqntEmojiFont = `"Color Emoji",`;

updateOptions(updateFont);
function updateFont() {
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
async function updateAccentColor(...args) {
  log("更新主题色", ...args);
  let colorStyle = document.querySelector("#liteToolsAccentColor");
  if (!colorStyle) {
    colorStyle = document.createElement("style");
    colorStyle.id = "liteToolsAccentColor";
    document.body.appendChild(colorStyle);
  }

  if (options.appearance.useSystemAccentColor) {
    const systemAccentColor = await lite_tools.getSystemAccentColor();
    const accentColor = systemAccentColor;
    const [hotlightColor, menuHighlightColor, highlightColor] = generateColors(accentColor);

    console.log(
      `获取到系统色\n%c${accentColor}\n%c${hotlightColor}\n%c${menuHighlightColor}\n%c${highlightColor}`,
      `background-color:${accentColor};`,
      `background-color:${hotlightColor};`,
      `background-color:${menuHighlightColor};`,
      `background-color:${highlightColor};`,
    );

    colorStyle.innerHTML = `
    .q-theme-tokens, .q-theme-tokens-light, .q-theme-tokens-dark {
      /* 系统颜色变量 */
      --system_accent_color: ${accentColor} !important;
      --system_hotlight_color: ${hotlightColor} !important;
      --system_menu_highlight_color: ${menuHighlightColor} !important;
      --system_highlight_color: ${highlightColor} !important;

      /* 与主题色相同的变量 */
      --brand_standard: var(--system_accent_color);
      --overlay_active_brand: var(--system_accent_color);
      --brand_text: var(--system_accent_color);

      /* 与链接颜色相同的变量 */
      --text_link: var(--system_highlight_color);
      --text-link: var(--system_highlight_color); /* 咋还有横线版本的？ */
      --lt-link-url-color: var(--system_highlight_color);

      /* hover & active */
      --nt_brand_standard_2_overlay_hover_brand_2_mix: var(--system_menu_highlight_color);
      --nt_brand_standard_2_overlay_pressed_brand_2_mix: var(--system_hotlight_color);
    }`;
  } else {
    colorStyle.innerHTML = "";
  }
}

/**
 * 将 hex 转为 hsl
 * @param {String} hex 十六进制颜色
 * @returns {String} hsl
 */
function hexToHsl(hex) {
  hex = hex.replace(/^#/, "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * 将 hsl 转为 hex
 * @param {*} h
 * @param {*} s
 * @param {*} l
 * @returns hex
 */
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 根据主题色生成三个配色
 * @param {String} baseColor 主题色
 * @returns {String[]} 三个配色
 */
function generateColors(baseColor) {
  /**
   * h 色相
   * s 饱和
   * l 亮度
   */
  const [h, s, l] = hexToHsl(baseColor);
  const color1 = hslToHex(h, Math.min(100, s + 20), l);
  const color2 = hslToHex(h, s, Math.min(100, l + 20));
  const color3 = hslToHex(h, Math.min(100, s + 10), l);
  return [color1, color2, color3];
}

/**
 * 初始化自定义右键菜单颜色样式
 */
function initCustomContextMenuColor() {
  let customContextMenuColorStyleElement = document.querySelector("#customContextMenuColorStyle");
  if (!customContextMenuColorStyleElement) {
    log("初始化自定义右键菜单颜色样式");
    customContextMenuColorStyleElement = document.createElement("style");
    customContextMenuColorStyleElement.id = "customContextMenuColorStyle";
    document.body.append(customContextMenuColorStyleElement);
  }
  customContextMenuColorStyleElement.innerHTML = `:root{
  --lt-q-light-context-copy-color: ${options.qContextMenu.customHighlightReplies.light.copy};
--lt-q-light-context-forward-color: ${options.qContextMenu.customHighlightReplies.light.forward};
--lt-q-light-context-collect-color: ${options.qContextMenu.customHighlightReplies.light.collect};
--lt-q-light-context-multiple-color: ${options.qContextMenu.customHighlightReplies.light.multiple};
--lt-q-light-context-quote-color: ${options.qContextMenu.customHighlightReplies.light.quote};
--lt-q-light-context-essence-color: ${options.qContextMenu.customHighlightReplies.light.essence};
--lt-q-light-context-revoke-color: ${options.qContextMenu.customHighlightReplies.light.revoke};
--lt-q-light-context-delete-color: ${options.qContextMenu.customHighlightReplies.light.delete};
--lt-q-dark-context-copy-color: ${options.qContextMenu.customHighlightReplies.dark.copy};
--lt-q-dark-context-forward-color: ${options.qContextMenu.customHighlightReplies.dark.forward};
--lt-q-dark-context-collect-color: ${options.qContextMenu.customHighlightReplies.dark.collect};
--lt-q-dark-context-multiple-color: ${options.qContextMenu.customHighlightReplies.dark.multiple};
--lt-q-dark-context-quote-color: ${options.qContextMenu.customHighlightReplies.dark.quote};
--lt-q-dark-context-essence-color: ${options.qContextMenu.customHighlightReplies.dark.essence};
--lt-q-dark-context-revoke-color: ${options.qContextMenu.customHighlightReplies.dark.revoke};
--lt-q-dark-context-delete-color: ${options.qContextMenu.customHighlightReplies.dark.delete};
}`;
}

updateOptions(updateAccentColor);
updateOptions(initCustomContextMenuColor);
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
  initCustomContextMenuColor();
  updateAccentColor();
  lite_tools.onSystemAccentColorChanged(updateAccentColor);
  log("模块已加载");
}
initStyle();
