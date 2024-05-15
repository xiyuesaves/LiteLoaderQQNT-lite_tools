// 防抖函数
import { debounce } from "../render_modules/debounce.js";
// 检查更新;
import { checkUpdate } from "../render_modules/checkUpdate.js";
// 向设置界面插入动态选项
import { addOptionLi } from "../render_modules/addOptionLi.js";
// 初始化设置界面监听方法
import { SwitchEventlistener } from "../render_modules/addSwitchEventlistener.js";
// 加载配置信息
import { options, updateOptions } from "../render_modules/options.js";
// 后缀类
import { TailList } from "../render_modules/tailList.js";
// 引入图标
import { pluginIcon } from "../render_modules/svg.js";
// 简单markdown转html
import { simpleMarkdownToHTML } from "../render_modules/simpleMarkdownToHTML.js";
// 更新日志弹窗
import { openChangeLog } from "../render_modules/openChangeLog.js";
// 获取当前登录账号信息
import { getAuthData } from "../render_modules/nativeCall.js";
// 配置界面日志
import { Logs } from "../render_modules/logs.js";
import { showToast, clearToast } from "../render_modules/toast.js";
const log = new Logs("配置界面");

/**
 * 打开设置界面时触发
 * @param {Element} view 设置页面容器
 */
async function onConfigView(view) {
  // 调试用，等待5秒后再执行
  // await new Promise((res) => setTimeout(res, 3000));

  document.querySelectorAll(".nav-item.liteloader,.nav-bar.liteloader .nav-item").forEach((node) => {
    if (node.textContent === "轻量工具箱") {
      node.querySelector(".q-icon").innerHTML = pluginIcon;
    }
  });
  // 返回通用监听方法
  const addSwitchEventlistener = SwitchEventlistener(view);
  log("开始初始化");
  // 初始化常量
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `local:///${plugin_path}/src/css/view.css`;
  const html_file_path = `local:///${plugin_path}/src/html/view.html`;
  log("css_file_path", css_file_path);
  log("html_file_path", html_file_path);

  // CSS
  const link_element = document.createElement("link");
  link_element.rel = "stylesheet";
  link_element.href = css_file_path;
  document.head.appendChild(link_element);
  log("插入css");

  // HTMl
  const html_text = await (await fetch(html_file_path)).text();
  view.insertAdjacentHTML("afterbegin", html_text);
  log("dom加载完成");

  // 防抖更新配置方法
  const debounceSetOptions = debounce(() => {
    lite_tools.setOptions(options);
  }, 100);

  // 从仓库检查更新
  checkUpdate(view);
  // 调试模式动态更新样式
  lite_tools.updateSettingStyle((event, message) => {
    link_element.href = css_file_path + `?r=${new Date().getTime()}`;
  });
  // 显示插件版本信息
  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;

  const sidebar = view.querySelector(".sidebar ul");
  const textArea = view.querySelector(".textArea ul");
  const chatArea = view.querySelector(".chatArea ul");

  log("开始添加功能");

  // 异步初始化自定义字体功能
  initFontList();
  async function initFontList() {
    /**
     * 获取系统字体列表 改用浏览器接口
     * @type {FontData[]}
     */
    const localFonts = await window.queryLocalFonts();
    const newFont = new Set();
    // 由于目前不支持字体样式，所以每个字体家族只保留第一个即可
    const systemFonts = localFonts.filter((FontData) => !newFont.has(FontData.family) && newFont.add(FontData.family));
    const fontListEl = view.querySelector(".font-list");
    const fontInputEl = view.querySelector(".font-input");
    fontInputEl.value = options.message.overrideFont.fullName;
    fontInputEl.addEventListener("focus", updateFilterFontList);
    fontInputEl.addEventListener("input", updateFilterFontList);
    fontInputEl.addEventListener("blur", () => {
      fontListEl.classList.remove("show");
    });
    fontListEl.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("font-item")) {
        const selectFont = event.target.getAttribute("data-value");
        const findFontData = systemFonts.find((FontData) => FontData.postscriptName === selectFont);
        log("选择了", selectFont, findFontData);
        options.message.overrideFont = {
          family: findFontData.family,
          style: findFontData.style,
          fullName: findFontData.fullName,
          postscriptName: findFontData.postscriptName,
        };
        fontInputEl.value = findFontData.fullName;
        debounceSetOptions();
      }
    });
    log("初始化字体列表完成");
    function updateFilterFontList(event) {
      if (event.type === "focus") {
        event.target.select();
      }
      fontListEl.classList.add("show");
      if (event.target.value.length && event.type === "input") {
        const filterFontList = systemFonts.filter((FontData) => {
          return (
            FontData.fullName.toLocaleLowerCase().includes(event.target.value.toLocaleLowerCase()) ||
            FontData.family.toLocaleLowerCase().includes(event.target.value.toLocaleLowerCase()) ||
            FontData.postscriptName.toLocaleLowerCase().includes(event.target.value.toLocaleLowerCase())
          );
        });
        updateFontList(filterFontList);
      } else {
        updateFontList(systemFonts);
      }
      if (event.type === "input") {
        options.message.overrideFont = {
          family: "",
          style: "",
          fullName: event.target.value,
          postscriptName: "",
        };
        debounceSetOptions();
      }
    }
    function updateFontList(fontList) {
      fontListEl.innerHTML = "";
      if (!fontList.length) {
        const settingOptionEl = document.createElement("span");
        settingOptionEl.setAttribute("title", "没有匹配字体");
        settingOptionEl.classList.add("font-item");
        settingOptionEl.classList.add("poe-none");
        settingOptionEl.innerText = "没有匹配字体";
        fontListEl.appendChild(settingOptionEl);
      }
      fontList.forEach((FontData) => {
        const settingOptionEl = document.createElement("span");
        settingOptionEl.setAttribute("data-value", FontData.postscriptName);
        settingOptionEl.setAttribute("title", FontData.fullName);
        settingOptionEl.style.fontFamily = FontData.family;
        settingOptionEl.style.fontStyle = FontData.style;
        settingOptionEl.classList.add("font-item");
        settingOptionEl.innerText = FontData.fullName;
        fontListEl.appendChild(settingOptionEl);
      });
    }
  }

  addOptionLi(options.sidebar.top, sidebar, "sidebar.top", "disabled");
  addOptionLi(options.sidebar.bottom, sidebar, "sidebar.bottom", "disabled");

  // 添加输入框上方功能列表
  addOptionLi(options.textAreaFuncList, textArea, "textAreaFuncList", "disabled");

  // 添加聊天框上方功能列表
  addOptionLi(options.chatAreaFuncList, chatArea, "chatAreaFuncList", "disabled");

  log("精简功能添加完成");

  // 列表展开功能
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
  });

  log("页面功能初始化完成");

  // 批量添加事件
  view.querySelectorAll(".q-switch").forEach((el) => {
    const configPath = el.getAttribute("data-config");
    if (configPath) {
      addSwitchEventlistener(configPath, el);
    }
  });

  // 划词搜索
  addSwitchEventlistener("wordSearch.enabled", ".switchSelectSearch", (_, enabled) => {
    view.querySelector(".select-search-url").classList.toggle("disabled-input", !enabled);
  });
  const searchEl = view.querySelector(".search-url");
  searchEl.value = options.wordSearch.searchUrl;
  searchEl.addEventListener("input", (e) => {
    options.wordSearch.searchUrl = e.target.value;
    debounceSetOptions();
  });

  // 图片搜索
  addSwitchEventlistener("imageSearch.enabled", ".switchImageSearch", (_, enabled) => {
    view.querySelector(".image-select-search-url").classList.toggle("disabled-input", !enabled);
  });
  const imgSearchEl = view.querySelector(".img-search-url");
  imgSearchEl.value = options.imageSearch.searchUrl;
  imgSearchEl.addEventListener("input", (e) => {
    options.imageSearch.searchUrl = e.target.value;
    debounceSetOptions();
  });

  // 头像黏贴消息框效果
  addSwitchEventlistener("message.avatarSticky.enabled", ".avatarSticky", (_, enabled) => {
    view.querySelector(".avatar-bottom-li").classList.toggle("disabled-switch", !enabled);
  });

  /**
   * 初始化自定义撤回样式
   * @type {Element}
   */
  const customTextColorLight = view.querySelector(".custom-text-color-lite");
  customTextColorLight.value = options.preventMessageRecall.textColor.light;
  customTextColorLight.addEventListener("change", (event) => {
    options.preventMessageRecall.textColor.light = event.target.value;
    lite_tools.setOptions(options);
  });
  const customTextColorDark = view.querySelector(".custom-text-color-dark");
  customTextColorDark.value = options.preventMessageRecall.textColor.dark;
  customTextColorDark.addEventListener("change", (event) => {
    options.preventMessageRecall.textColor.dark = event.target.value;
    lite_tools.setOptions(options);
  });

  // 清除本地撤回数据
  view.querySelector(".clear-localStorage-recall-msg").addEventListener("click", () => {
    log("清除本地数据");
    lite_tools.clearLocalStorageRecallMsg();
  });
  // 动态更新界面上的撤回数据
  lite_tools.onUpdateRecallListNum((_, num) => {
    view.querySelector(".local-recall-msg-num").innerText = `清除所有本地保存的撤回数据，当前保存约 ${num} 条消息`;
  });
  // 获取本地撤回消息数量
  const recallNum = lite_tools.getRecallListNum();
  view.querySelector(".local-recall-msg-num").innerText = `清除所有本地保存的撤回数据，当前保存约 ${recallNum} 条消息`;
  // 查看撤回数据
  view.querySelector(".open-recall-msg-list").addEventListener("click", () => {
    log("查看撤回数据");
    lite_tools.openRecallMsgList();
  });

  // 图片遮罩
  addSwitchEventlistener("message.preventNSFW.enabled", ".preventNSFW", (_, enabled) => {
    view.querySelector(".preventNSFW-keyword").classList.toggle("disabled-input", !enabled);
  });
  const preventNSFW = view.querySelector(".preventNSFW-list-input");
  preventNSFW.value = options.message.preventNSFW.list.join(",");
  preventNSFW.addEventListener("input", (e) => {
    if (e.target.value.length) {
      options.message.preventNSFW.list = e.target.value.split(",");
    } else {
      options.message.preventNSFW.list = [];
    }
    debounceSetOptions();
  });

  // 消息关键词
  addSwitchEventlistener("keywordReminder.enabled", ".keywordReminder", (_, enabled) => {
    view.querySelector(".keywordReminder-keyword").classList.toggle("disabled-input", !enabled);
  });
  const keywordReminder = view.querySelector(".keywordReminder-keyword-input");
  keywordReminder.value = options.keywordReminder.keyList.join(",");
  keywordReminder.addEventListener("input", (e) => {
    if (e.target.value.length) {
      options.keywordReminder.keyList = e.target.value.split(",");
    } else {
      options.keywordReminder.keyList = [];
    }
    debounceSetOptions();
  });

  // 消息转图片
  view.querySelector(".select-default-save-file-input-clear").value = options.messageToImage.path;
  view.querySelector(".select-default-save-file-input").addEventListener("click", () => {
    log("修改默认保存位置");
    lite_tools.openSelectDefaultSaveFilePath();
  });
  view.querySelector(".select-default-save-file-input-clear").addEventListener("click", () => {
    log("删除默认保存位置");
    view.querySelector(".select-default-save-file-input-clear").value = "";
    options.messageToImage.path = "";
    lite_tools.setOptions(options);
  });

  // 本地表情包功能
  addSwitchEventlistener("localEmoticons.enabled", ".switchLocalEmoticons", (_, enabled) => {
    view.querySelector(".select-folder-input").classList.toggle("disabled-input", !enabled);
    view.querySelector(".copyFileTolocalEmoticons").classList.toggle("disabled-switch", !enabled);
  });
  view.querySelector(".select-folder-input input").value = options.localEmoticons.localPath;
  view.querySelector(".select-local-emoticons-folder").addEventListener("click", () => {
    lite_tools.openSelectLocalEmoticonsFolder();
  });
  view.querySelector(".select-local-emoticons-folder-clear").addEventListener("click", () => {
    view.querySelector(".select-local-emoticons-folder-clear").value = "";
    options.localEmoticons.localPath = "";
    lite_tools.setOptions(options);
  });

  // 快捷输入表情功能
  addSwitchEventlistener("localEmoticons.quickEmoticons", ".switchQuickEmoticons", (_, enabled) => {
    view.querySelector(".switchQuickEmoticonsAutoInputOnlyOne").parentNode.classList.toggle("disabled-switch", !enabled);
  });
  // 快捷表情自动插入
  const quickEmoticonsActiveKey = view.querySelector(".quickEmoticonsActiveKey");
  quickEmoticonsActiveKey.value = options.localEmoticons.quickEmoticonsActiveKey;
  quickEmoticonsActiveKey.addEventListener("input", (e) => {
    // 只保留一位
    if (e.target.value.length > 1) {
      e.target.value = e.target.value.split("")[e.target.value.length - 1];
    } else if (e.target.value.length === 0) {
      e.target.value = "/";
    }
    options.localEmoticons.quickEmoticonsActiveKey = e.target.value.split("")[0];
    debounceSetOptions();
  });
  // 常用表情分类
  addSwitchEventlistener("localEmoticons.commonlyEmoticons", ".switchCommonlyEmoticons", (_, enabled) => {
    view.querySelector(".hoverShowCommonlyEmoticons").classList.toggle("disabled-switch", !enabled);
  });

  // 初始化背景路径选择监听和值
  view.querySelector(".select-background-wallpaper-clear").value = options.background.url;
  view.querySelector(".select-background-wallpaper").addEventListener("click", () => {
    lite_tools.openSelectBackground();
  });
  view.querySelector(".select-background-wallpaper-clear").addEventListener("click", () => {
    view.querySelector(".select-background-wallpaper-clear").value = "";
    options.background.url = "";
    lite_tools.setOptions(options);
  });
  // 初始化背景透明度输入框监听和值
  view.querySelector(".background-opacity").value = options.background.opacity * 100;
  view.querySelector(".background-opacity").addEventListener("blur", (e) => {
    const inputValue = parseInt(e.target.value) / 100;
    if (!Number.isNaN(inputValue) && inputValue >= 0 && inputValue <= 1) {
      options.background.opacity = inputValue;
    } else {
      options.background.opacity = 0.5;
    }
    e.target.value = options.background.opacity * 100;
    debounceSetOptions();
  });

  // 监听连接元素点击
  view.querySelectorAll("a").forEach((el) => {
    el.addEventListener("click", (event) => {
      lite_tools.openWeb(event.target.getAttribute("data-href"));
    });
  });
  log("完成所有选项初始化");

  // 自定义历史表情数量
  view.querySelector(".recommend-num").innerText = `自定义历史表情保存数量，推荐：${options.localEmoticons.rowsSize}，${
    options.localEmoticons.rowsSize * 2
  }，${options.localEmoticons.rowsSize * 3}，${options.localEmoticons.rowsSize * 4}`;
  const commonlyEmoticonsEl = view.querySelector(".commonly-emoticons-num");
  commonlyEmoticonsEl.setAttribute("placeholder", options.localEmoticons.rowsSize * 3);
  commonlyEmoticonsEl.value = options.localEmoticons.commonlyNum;
  commonlyEmoticonsEl.addEventListener("blur", (e) => {
    let inputValue = parseInt(e.target.value);
    if (!inputValue || inputValue <= 0) {
      inputValue = options.localEmoticons.rowsSize * 3;
    }
    options.localEmoticons.commonlyNum = inputValue;
    commonlyEmoticonsEl.value = options.localEmoticons.commonlyNum;
    debounceSetOptions();
  });

  // 不可复用的拖拽选择方法
  function initSider() {
    updateSider();
    let hasDown = false;
    let downX = 0;
    let btnX = 0;
    let siderBar;
    let siderWidth;
    const step = [0, 25, 50, 75, 100];

    window.addEventListener("mousedown", (event) => {
      if (event.target.classList.contains("sider-button")) {
        siderBar = view.querySelector(".sider");
        siderWidth = siderBar.offsetWidth;
        hasDown = true;
        downX = event.clientX;
        btnX = event.target.offsetLeft;
      }
    });
    window.addEventListener("mousemove", (event) => {
      if (hasDown) {
        // 很怪的判定方法
        const moveX = downX - event.clientX;
        const process = parseInt(((btnX - moveX) / siderWidth) * 100);
        const newVal = step.findIndex((num) => {
          const offset = Math.abs(num - process);
          if (offset < 12) {
            return true;
          }
        });
        if (newVal !== -1) {
          options.localEmoticons.rowsSize = newVal + 3;
          view.querySelector(".commonly-emoticons-num").setAttribute("placeholder", options.localEmoticons.rowsSize * 3);
          view.querySelector(".recommend-num").innerText = `自定义历史表情保存数量，推荐：${options.localEmoticons.rowsSize}，${
            options.localEmoticons.rowsSize * 2
          }，${options.localEmoticons.rowsSize * 3}，${options.localEmoticons.rowsSize * 4}`;

          debounceSetOptions();
          updateSider();
        }
      }
    });
    window.addEventListener("mouseup", (event) => {
      hasDown = false;
    });
  }
  initSider();

  function updateSider() {
    const button = view.querySelector(".sider-button");
    const mask = view.querySelector(".sider-mask");
    const siderStepItems = view.querySelectorAll(".sider-step-item");
    siderStepItems.forEach((item, index) => {
      const value = parseInt(item.getAttribute("data-value"));
      if (value <= options.localEmoticons.rowsSize) {
        item.classList.add("active-bg");
        const offset = `${100 * (index / (siderStepItems.length - 1))}%`;
        button.style.left = offset;
        mask.style.width = offset;
      } else {
        item.classList.remove("active-bg");
      }
    });
  }

  // 消息后缀
  const listView = view.querySelector(".vertical-list-item .tail-ruls-list");
  const tailList = new TailList(listView, options.tail.list);
  view.querySelector(".create-new-tail-item").addEventListener("click", () => {
    tailList.createNewTail();
  });

  // 打开当前版本的更新日志
  view.querySelector(".tag-version").addEventListener("click", () => {
    fetch(`local:///${LiteLoader.plugins.lite_tools.path.plugin}/changeLog.md`)
      .then((res) => res.text())
      .then((text) => {
        log("打开更新日志", text);
        const updateLogs = simpleMarkdownToHTML(text);
        openChangeLog(
          updateLogs,
          false,
          `https://github.com/xiyuesaves/LiteLoaderQQNT-lite_tools/releases/tag/${LiteLoader.plugins.lite_tools.manifest.repository.release.tag}`,
        );
      });
  });

  // 监听更新进度
  let prevToast = null;
  lite_tools.updateEvent((event, data) => {
    log("更新进度", data);
    if (data.toast) {
      if (data.status === "processing" || data.status === "end") {
        if (prevToast) {
          prevToast.close();
        }
        if (data.status === "end") {
          clearToast();
        }
        prevToast = showToast(data.toast.content, data.toast.type, data.toast.duration);
      } else {
        showToast(data.toast.content, data.toast.type, data.toast.duration);
      }
    }
  });

  // 监听独立配置文件切换
  const userConfig = await lite_tools.getUserConfig();
  const authData = await getAuthData();
  const standaloneConfiguration = view.querySelector(".standaloneConfiguration");
  if (userConfig && authData) {
    standaloneConfiguration.classList.toggle("is-active", userConfig.has(authData.uid));
    standaloneConfiguration.addEventListener("click", (event) => {
      if (standaloneConfiguration.classList.contains("is-active")) {
        lite_tools.deleteUserConfig(authData.uid);
        standaloneConfiguration.classList.remove("is-active");
      } else {
        lite_tools.addUserConfig(authData.uid, authData.uin);
        standaloneConfiguration.classList.add("is-active");
      }
    });
  } else {
    standaloneConfiguration.classList.add("disabled-switch");
    standaloneConfiguration.setAttribute("title", "当前环境无法启用");
  }

  // 监听设置文件变动
  updateOptions((opt) => {
    log("检测到配置更新", opt);
    view.querySelector(".select-background-wallpaper-clear").value = opt.background.url;
    view.querySelector(".select-local-emoticons-folder-clear").value = opt.localEmoticons.localPath;
    view.querySelector(".select-default-save-file-input-clear").value = opt.messageToImage.path;
    tailList?.updateOptions();
    customTextColorEl.value = options.preventMessageRecall.textColor;
  });
  log("完成初始化");
}

export { onConfigView };
