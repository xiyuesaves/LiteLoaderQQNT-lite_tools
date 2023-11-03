/**
 * @author xiyuesaves
 * @date 2023-11-03
 */
function onLoad() {
  /**
   * 监听页面 hash 变动
   */
  if (location.hash === "#/blank") {
    navigation.addEventListener("navigatesuccess", updateHash, { once: true });
  } else {
    updateHash();
  }

  /**
   * 根据页面 hash 决定执行函数
   */
  function updateHash() {
    let hash = location.hash;
    /**
     * 默认 hash 直接返回
     */
    if (hash === "#/blank") {
      return;
    }
    /**
     * 局部匹配
     */
    if (hash.includes("#/chat/")) {
      import("./pages/chatMessage.js");
    } else if (hash.includes("#/forward")) {
      import("./pages/forward.js");
    }
    /**
     * 路径匹配
     */
    switch (hash) {
      case "#/imageViewer":
        import("./pages/imageViewer.js");
        break;
      case "#/main/message":
        import("./pages/mainMessage.js");
        break;
    }
  }
}

// 打开设置界面时触发
async function onConfigView(view) {
  // 调试用，等待5秒后再执行
  // await new Promise((res) => setTimeout(res, 3000));

  // 防抖函数
  const { debounce } = await import("./render_modules/debounce.js");
  // 初次执行检查
  const { first } = await import("./render_modules/first.js");
  // 检查更新;
  const { checkUpdate } = await import(`./render_modules/checkUpdate.js`);
  // 向设置界面插入动态选项
  const { addOptionLi } = await import(`./render_modules/addOptionLi.js`);
  // 初始化设置界面监听方法
  const { SwitchEventlistener } = await import(`./render_modules/addSwitchEventlistener.js`);
  // 加载配置信息
  const { options, updateOptions } = await import("./render_modules/options.js");

  // 返回通用监听方法
  const addSwitchEventlistener = await SwitchEventlistener(view);

  // 初始化常量
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.css`;
  const html_file_path = `llqqnt://local-file/${plugin_path}/src/config/view.html`;

  // CSS
  const link_element = document.createElement("link");
  link_element.rel = "stylesheet";
  link_element.href = css_file_path;
  document.head.appendChild(link_element);

  // HTMl
  const html_text = await (await fetch(html_file_path)).text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html_text, "text/html");
  doc.querySelectorAll("section").forEach((node) => view.appendChild(node));

  // 检查更新
  // checkUpdate(view);
  // 调试模式动态更新样式
  lite_tools.updateSettingStyle((event, message) => {
    link_element.href = css_file_path + `?r=${new Date().getTime()}`;
  });
  // 显示插件版本信息
  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools");
  });

  // 获取侧边栏按钮列表
  console.log("发送获取");
  options.sidebar = await lite_tools.getSidebar({ type: "get" });
  const sidebar = view.querySelector(".sidebar ul");
  addOptionLi(options.sidebar.top, sidebar, "sidebar.top", "disabled");
  addOptionLi(options.sidebar.bottom, sidebar, "sidebar.bottom", "disabled");

  // 添加输入框上方功能列表
  addOptionLi(options.textAreaFuncList, view.querySelector(".textArea ul"), "textAreaFuncList", "disabled");

  // 添加聊天框上方功能列表
  addOptionLi(options.chatAreaFuncList, view.querySelector(".chatArea ul"), "chatAreaFuncList", "disabled");

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
    if (enabled) {
      view.querySelector(".select-search-url").classList.remove("disabled-input");
    } else {
      view.querySelector(".select-search-url").classList.add("disabled-input");
    }
    if (first("init-world-search-option")) {
      const searchEl = view.querySelector(".search-url");
      searchEl.value = options.wordSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.wordSearch.searchUrl = searchEl.value;
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 图片搜索
  addSwitchEventlistener("imageSearch.enabled", ".switchImageSearch", (_, enabled) => {
    if (enabled) {
      view.querySelector(".image-select-search-url").classList.remove("disabled-input");
    } else {
      view.querySelector(".image-select-search-url").classList.add("disabled-input");
    }
    if (first("init-image-search-option")) {
      const searchEl = view.querySelector(".img-search-url");
      searchEl.value = options.imageSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.imageSearch.searchUrl = searchEl.value;
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 头像黏贴消息框效果
  addSwitchEventlistener("message.avatarSticky.enabled", ".avatarSticky", (_, enabled) => {
    if (enabled) {
      view.querySelector(".avatar-bottom-li").classList.remove("disabled-switch");
    } else {
      view.querySelector(".avatar-bottom-li").classList.add("disabled-switch");
    }
  });

  // 合并消息
  addSwitchEventlistener("message.mergeMessage", ".mergeMessage");

  // 头像置底
  addSwitchEventlistener("message.avatarSticky.toBottom", ".avatar-bottom");

  // 移除回复时的@标记
  addSwitchEventlistener("message.removeReplyAt", ".removeReplyAt");

  // 阻止撤回
  addSwitchEventlistener("message.preventMessageRecall", ".preventMessageRecall");

  // 快速关闭图片
  addSwitchEventlistener("imageViewer.quickClose", ".switchQuickCloseImage");

  // 复读机
  addSwitchEventlistener("message.switchReplace", ".switchReplace");

  // 禁用推荐表情
  addSwitchEventlistener("message.disabledSticker", ".switchSticker");

  // 禁用表情GIF热图
  addSwitchEventlistener("message.disabledHotGIF", ".switchHotGIF");

  // 禁用红点
  addSwitchEventlistener("message.disabledBadge", ".disabledBadge");

  // 将哔哩哔哩小程序替换为url卡片
  addSwitchEventlistener("message.convertMiniPrgmArk", ".switchDisabledMiniPrgm");

  // 自动打开来自手机的链接或者卡片消息
  addSwitchEventlistener("message.autoOpenURL", ".switchAutoOpenURL");

  // debug开关
  addSwitchEventlistener("debug", ".switchDebug");

  // 显示每条消息发送时间
  addSwitchEventlistener("message.showMsgTime", ".showMsgTime");

  // 禁用滑动多选消息
  addSwitchEventlistener("message.disabledSlideMultipleSelection", ".switchDisabledSlideMultipleSelection");

  // 本地表情包功能
  addSwitchEventlistener("localEmoticons.enabled", ".switchLocalEmoticons", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-folder-input").classList.remove("disabled-input");
    } else {
      view.querySelector(".select-folder-input").classList.add("disabled-input");
    }
    if (first("switchLocalEmoticons")) {
      const selectFolderEl = view.querySelector(".select-folder-input input");
      selectFolderEl.value = options.localEmoticons.localPath;
      view.querySelectorAll(".select-folder").forEach((el) => {
        el.addEventListener("click", () => {
          lite_tools.openSelectFolder();
        });
      });
    }
  });

  // 添加消息后缀
  addSwitchEventlistener("tail.enabled", ".msg-tail", (_, enabled) => {
    if (enabled) {
      view.querySelector(".message-tail").classList.remove("hidden");
    } else {
      view.querySelector(".message-tail").classList.add("hidden");
    }
    if (first("init-tail-option")) {
      const tailEl = view.querySelector(".tail-content");
      tailEl.value = options.tail.content;
      tailEl.addEventListener(
        "input",
        debounce(() => {
          options.tail.content = tailEl.value;
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 后缀是否换行
  addSwitchEventlistener("tail.newLine", ".msg-tail-newline");

  // 自定义背景
  addSwitchEventlistener("background.enabled", ".switchBackgroundImage", (_, enabled) => {
    if (enabled) {
      view.querySelector(".select-path").classList.remove("disabled-input");
    } else {
      view.querySelector(".select-path").classList.add("disabled-input");
    }
    if (first("init-background-option")) {
      view.querySelector(".select-path input").value = options.background.url;
      view.querySelectorAll(".select-file").forEach((el) => {
        el.addEventListener("click", () => {
          lite_tools.openSelectBackground();
        });
      });
    }
  });

  // 监听设置文件变动
  updateOptions((opt) => {
    view.querySelector(".select-path input").value = opt.background.url;
    view.querySelector(".select-folder-input input").value = opt.localEmoticons.localPath;
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };
