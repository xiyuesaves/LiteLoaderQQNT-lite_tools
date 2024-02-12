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
// 原生事件模块
import { getUserInfo, goMainWindowScene } from "../render_modules/nativeCall.js";
// 引入图标
import { pluginIcon } from "../render_modules/svg.js";

// 配置界面日志
import { Logs } from "../render_modules/logs.js";
const log = new Logs("配置界面");

// 打开设置界面时触发
async function onConfigView(view) {
  // 调试用，等待5秒后再执行
  // await new Promise((res) => setTimeout(res, 3000));

  document.querySelectorAll(".nav-item.liteloader").forEach((node) => {
    if (node.textContent === "轻量工具箱") {
      node.querySelector(".q-icon").innerHTML = pluginIcon;
      // console.log(node.querySelector(".q-icon"))
    }
  });
  // 返回通用监听方法
  const addSwitchEventlistener = SwitchEventlistener(view);
  log("开始初始化");
  // 初始化常量
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `local:///${plugin_path}/src/config/view.css`;
  const html_file_path = `local:///${plugin_path}/src/config/view.html`;
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
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools/tree/v4");
  });

  // 获取侧边栏按钮列表
  options.sidebar = await lite_tools.getSidebar({ type: "get" });

  const sidebar = view.querySelector(".sidebar ul");
  const textArea = view.querySelector(".textArea ul");
  const chatArea = view.querySelector(".chatArea ul");

  log("开始添加功能");
  /**
   * 获取系统字体列表
   * @type {Array}
   */
  const systemFonts = await lite_tools.getSystemFonts();
  const fontListEl = view.querySelector(".font-list");
  const fontInputEl = view.querySelector(".font-input");
  fontInputEl.value = options.message.overrideFont;
  fontInputEl.addEventListener("focus", updateFilterFontList);
  fontInputEl.addEventListener("input", updateFilterFontList);
  fontInputEl.addEventListener("blur", () => {
    fontListEl.classList.remove("show");
  });
  fontListEl.addEventListener("mousedown", (event) => {
    if (event.target.classList.contains("font-item")) {
      const selectFont = event.target.getAttribute("data-value");
      log("选择了", selectFont);
      options.message.overrideFont = selectFont;
      fontInputEl.value = selectFont;
      debounceSetOptions();
    }
  });
  function updateFilterFontList(event) {
    fontListEl.classList.add("show");
    if (event.target.value.length) {
      const filterFontList = systemFonts.filter((fontName) =>
        fontName.toLocaleLowerCase().includes(event.target.value.toLocaleLowerCase()),
      );
      updateFontList(filterFontList);
    } else {
      updateFontList(systemFonts);
    }
    options.message.overrideFont = event.target.value;
    debounceSetOptions();
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
    fontList.forEach((fontName) => {
      const settingOptionEl = document.createElement("span");
      settingOptionEl.setAttribute("data-value", fontName);
      settingOptionEl.setAttribute("title", fontName);
      settingOptionEl.classList.add("font-item");
      if (fontName === "当前系统不受支持") {
        settingOptionEl.classList.add("poe-none");
      }
      settingOptionEl.innerText = fontName;
      fontListEl.appendChild(settingOptionEl);
    });
  }

  addOptionLi(options.sidebar.top, sidebar, "sidebar.top", "disabled");
  addOptionLi(options.sidebar.bottom, sidebar, "sidebar.bottom", "disabled");

  // 添加输入框上方功能列表
  addOptionLi(options.textAreaFuncList, textArea, "textAreaFuncList", "disabled");

  // 添加聊天框上方功能列表
  addOptionLi(options.chatAreaFuncList, chatArea, "chatAreaFuncList", "disabled");

  // 列表展开功能
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
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

  // 合并消息
  addSwitchEventlistener("message.mergeMessage", ".mergeMessage");
  addSwitchEventlistener("message.mergeMessageKeepTime", ".mergeMessageKeepTime");

  // 头像置底
  addSwitchEventlistener("message.avatarSticky.toBottom", ".avatar-bottom");

  // 移除回复时的@标记
  addSwitchEventlistener("message.removeReplyAt", ".removeReplyAt");

  // 阻止撤回
  addSwitchEventlistener("preventMessageRecall.enabled", ".preventMessageRecall");
  addSwitchEventlistener("preventMessageRecall.localStorage", ".localStorage");
  addSwitchEventlistener("preventMessageRecall.preventSelfMsg", ".preventSelfMsg");
  addSwitchEventlistener("preventMessageRecall.customColor", ".custom-color");

  // 初始化自定义撤回样式
  const customTextColorEl = view.querySelector(".custom-text-color");
  customTextColorEl.value = options.preventMessageRecall.textColor;
  customTextColorEl.addEventListener("change", (event) => {
    options.preventMessageRecall.textColor = event.target.value;
    lite_tools.setOptions(options);
  });

  view.querySelector(".clear-localStorage-recall-msg").addEventListener("click", () => {
    log("清除本地数据");
    lite_tools.clearLocalStorageRecallMsg();
  });
  lite_tools.onUpdateRecallListNum((_, num) => {
    view.querySelector(".local-recall-msg-num").innerText = `清除所有本地保存的撤回数据，当前保存约 ${num} 条消息`;
  });
  lite_tools.goToMsg((_, msgData) => {
    goMainWindowScene(msgData);
  });
  const recallNum = lite_tools.getRecallListNum();
  view.querySelector(".local-recall-msg-num").innerText = `清除所有本地保存的撤回数据，当前保存约 ${recallNum} 条消息`;

  view.querySelector(".open-recall-msg-list").addEventListener("click", () => {
    log("查看撤回数据");
    lite_tools.openRecallMsgList();
  });

  // 只能在qq自己创建的窗口内调用原生事件
  lite_tools.onRequireUserInfo(async (event, uid) => {
    log("尝试获取数据", uid);
    lite_tools.sendUserInfo(await getUserInfo(uid));
  });

  // 快速关闭图片
  addSwitchEventlistener("imageViewer.quickClose", ".switchQuickCloseImage");

  // 复读机
  addSwitchEventlistener("message.replaceBtn", ".replaceBtn");
  // 复读机-双击切换
  addSwitchEventlistener("message.doubleClickReplace", ".doubleClickReplace");

  // 禁用推荐表情
  addSwitchEventlistener("message.disabledSticker", ".switchSticker");

  // 禁用表情GIF热图
  addSwitchEventlistener("message.disabledHotGIF", ".switchHotGIF");

  // 禁用红点
  addSwitchEventlistener("message.disabledBadge", ".disabledBadge");

  // 将哔哩哔哩小程序替换为url卡片
  addSwitchEventlistener("message.convertMiniPrgmArk", ".switchDisabledMiniPrgm");

  // debug开关
  addSwitchEventlistener("debug.console", ".switchDebug");
  addSwitchEventlistener("debug.mainConsole", ".switchMainDebug");

  // 显示每条消息发送时间
  addSwitchEventlistener("message.showMsgTime", ".showMsgTime");

  // 禁用滑动多选消息
  addSwitchEventlistener("message.disabledSlideMultipleSelection", ".switchDisabledSlideMultipleSelection");

  // 消息靠左显示
  addSwitchEventlistener("message.selfMsgToLeft", ".selfMsgToLeft");

  // 消息靠左显示
  addSwitchEventlistener("message.onlyAvatar", ".onlyAvatar");

  // 消息转图片
  addSwitchEventlistener("messageToImage.enabled", ".messageToImage");
  // 消息转图片-高清化
  addSwitchEventlistener("messageToImage.highResolution", ".highResolution");
  view.querySelector(".select-default-save-file-input").value = options.messageToImage.path;
  view.querySelectorAll(".select-default-save-file-input").forEach((el) => {
    el.addEventListener("click", () => {
      log("修改默认保存位置");
      lite_tools.openSelectDefaultSaveFilePath();
    });
  });

  // 本地表情包功能
  addSwitchEventlistener("localEmoticons.enabled", ".switchLocalEmoticons", (_, enabled) => {
    view.querySelector(".select-folder-input").classList.toggle("disabled-input", !enabled);
  });
  view.querySelector(".select-folder-input input").value = options.localEmoticons.localPath;
  view.querySelectorAll(".select-local-emoticons-folder").forEach((el) => {
    el.addEventListener("click", () => {
      lite_tools.openSelectLocalEmoticonsFolder();
    });
  });
  // 表情加载优化
  addSwitchEventlistener("localEmoticons.majorization", ".majorization");
  // 以图片形式发送
  addSwitchEventlistener("localEmoticons.sendBigImage", ".sendBigImage");
  // 快捷输入表情功能
  addSwitchEventlistener("localEmoticons.quickEmoticons", ".switchQuickEmoticons", (_, enabled) => {
    view.querySelector(".switchQuickEmoticonsAutoInputOnlyOne").parentNode.classList.toggle("disabled-switch", !enabled);
  });
  // 快捷表情自动插入
  addSwitchEventlistener("localEmoticons.quickEmoticonsAutoInputOnlyOne", ".switchQuickEmoticonsAutoInputOnlyOne");
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
  addSwitchEventlistener("localEmoticons.commonlyEmoticons", ".switchCommonlyEmoticons");

  // 自定义背景
  addSwitchEventlistener("background.enabled", ".switchBackgroundImage", (_, enabled) => {
    view.querySelector(".select-path").classList.toggle("disabled-input", !enabled);
  });
  view.querySelector(".select-path input").value = options.background.url;
  view.querySelectorAll(".select-file").forEach((el) => {
    el.addEventListener("click", () => {
      lite_tools.openSelectBackground();
    });
  });

  // 自定义历史表情数量
  view.querySelector(".recommend-num").innerText = `自定义历史表情保存数量，推荐：${options.localEmoticons.rowsSize}，${
    options.localEmoticons.rowsSize * 2
  }，${options.localEmoticons.rowsSize * 3}，${options.localEmoticons.rowsSize * 4}`;
  const commonlyEmoticonsEl = view.querySelector(".commonly-emoticons-num");
  commonlyEmoticonsEl.value = options.localEmoticons.commonlyNum;
  commonlyEmoticonsEl.addEventListener("blur", (e) => {
    options.localEmoticons.commonlyNum = parseInt(e.target.value) || 20;
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
  addSwitchEventlistener("tail.enabled", ".msg-tail");
  addSwitchEventlistener("tail.tips", ".msg-tail-tips");
  const listView = view.querySelector(".vertical-list-item .tail-ruls-list");
  const tailList = new TailList(listView, options.tail.list);
  view.querySelector(".create-new-tail-item").addEventListener("click", () => {
    tailList.createNewTail();
  });

  // 监听设置文件变动
  updateOptions((opt) => {
    log("检测到配置更新", opt);
    view.querySelector(".select-path input").value = opt.background.url;
    view.querySelector(".select-folder-input input").value = opt.localEmoticons.localPath;
    view.querySelector(".select-default-save-file-input").value = opt.messageToImage.path;
    customTextColorEl.value = options.preventMessageRecall.textColor;
  });
}

export { onConfigView };
