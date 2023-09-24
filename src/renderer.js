// 运行在 Electron 渲染进程 下的页面脚本
let options,
  updateOptions,
  log = console.log;

// 页面加载完成时触发
async function onLoad() {
  // 输出logo
  log("%c轻量工具箱已加载", "border-radius: 8px;padding:10px 20px;font-size:18px;background:linear-gradient(to right, #3f7fe8, #03ddf2);color:#fff;");

  // 加载模块
  // 防抖函数
  const { opt, listenUpdateOptions } = await import("./modules/options.js");
  const { hookVue3 } = await import("./modules/hookVue3.js");
  const { addEventqContextMenu } = await import("./modules/qContextMenu.js");
  const { initStyle } = await import("./modules/initStyle.js");
  const { newMessageRecall } = await import("./modules/messageRecall.js");
  const { observerMessageList } = await import("./modules/observerMessageList.js");
  const { observerChatArea } = await import("./modules/observerChatArea.js");
  const { updateWallpaper } = await import("./modules/updateWallpaper.js");
  const { observeChatBox } = await import("./modules/observeChatBox.js");
  const { chatMessageList } = await import("./modules/chatMessageList.js");
  const { first } = await import("./modules/first.js");

  // 加载配置信息
  options = opt;
  updateOptions = listenUpdateOptions;

  // 判断是否输出日志
  if (!options.debug) {
    log = () => {};
  } else {
    log("已开启debug");
  }

  // 在元素上创建组件引用
  hookVue3();

  // 初始化基础样式数据
  initStyle();

  // 监听右键菜单
  addEventqContextMenu();

  // 全局注册撤回事件监听
  newMessageRecall();

  // 所有页面都需要执行的更新操作
  chatMessageList();
  updateOptions(() => {
    chatMessageList();
  });

  // 监听导航跳转
  navigation.addEventListener("navigatesuccess", navigateChange);
  function navigateChange() {
    updateHash();
    navigation.removeEventListener("navigatesuccess", navigateChange);
  }

  // 如果因为加载过久导致hash已经变动，这是备用触发方式
  updateHash();
  function updateHash() {
    let hash = location.hash;
    if (hash.includes("#/chat/")) {
      hash = "#/chat/message";
    } else if (hash.includes("#/forward")) {
      hash = "#/forward";
    }
    // 没有捕获到正确hash，直接退出
    if (hash === "#/blank") {
      return;
    }
    switch (hash) {
      case "#/imageViewer":
        if (first("is-active")) {
          imageViewer();
        }
        break;
      case "#/main/message":
        if (first("is-active")) {
          mainMessage();
        }
        break;
      case "#/chat/message":
        if (first("is-active")) {
          chatMessage();
        }
        break;
      case "#/forward":
        if (first("is-active")) {
          forwardMessage();
        }
        break;
    }
  }

  // 通用初始化函数
  function initFunction(func) {
    // 窗口启动的1分钟之内每隔10ms应用一次配置信息
    let timeout = new Date().getTime() + 30 * 1000;
    loop();
    function loop() {
      if (timeout > new Date().getTime()) {
        setTimeout(loop, 10);
        func();
      }
    }
  }

  // 阻止拖拽多选消息
  function touchMoveSelectin(className) {
    let interception;
    document.querySelector("#app").addEventListener("mousedown", (event) => {
      if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
        interception = interception =
          !(event.target.classList.contains("message-content__wrapper") || doesParentHaveClass(event.target, "message-content__wrapper")) &&
          (event.target.classList.contains(className) || doesParentHaveClass(event.target, className));
      }
    });
    document.querySelector(`.${className}`).addEventListener("mousedown", (event) => {
      if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
        if (document.querySelector("#qContextMenu")) {
          document.querySelector("#qContextMenu").remove();
        }
      }
    });
    document.querySelector("#app").addEventListener("mousemove", (event) => {
      if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
        if (interception) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    });
  }

  // 判断父元素是否包含指定类名
  function doesParentHaveClass(element, className) {
    let parentElement = element.parentElement;
    while (parentElement !== null) {
      if (parentElement.classList.contains(className)) {
        return true;
      }
      parentElement = parentElement.parentElement;
    }
    return false;
  }

  // 媒体预览增强
  function imageViewer() {
    // 修复弹窗字体模糊
    document.body.classList.add("image-viewer");
    // 针对图片的单击关闭图片
    const appEl = document.querySelector("#app");
    const option = { attributes: false, childList: true, subtree: true };
    const callback = (mutationsList, observer) => {
      const img = document.querySelector(".main-area__image");
      const video = document.querySelector("embed");
      if (img && options.imageViewer.quickClose) {
        observer.disconnect();
        let isMove = false;
        img.addEventListener("mousedown", (event) => {
          if (event.button === 0) {
            isMove = false;
          }
        });
        img.addEventListener("mousemove", (event) => {
          if (event.button === 0) {
            isMove = true;
          }
        });
        img.addEventListener("mouseup", (event) => {
          let rightMenu = document.querySelector("#qContextMenu");
          if (!isMove && event.button === 0 && !rightMenu) {
            document.querySelector(`div[aria-label="关闭"]`).click();
          }
        });
      } else if (video) {
        // 判断打开的是视频
        observer.disconnect();
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(appEl, option);
  }

  // 首页处理
  async function mainMessage() {
    // 初始化页面
    initFunction(updatePage);

    // 监听聊天框上方功能
    function observeChatTopFunc() {
      new MutationObserver((mutations, observe) => {
        document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
          const name = el.querySelector(".icon-item").getAttribute("aria-label");
          const find = options.chatAreaFuncList.find((el) => el.name === name);
          if (find) {
            if (find.disabled) {
              el.classList.add("disabled");
            } else {
              el.classList.remove("disabled");
            }
          }
        });
        // 更新聊天框上方功能列表
        const textAreaList = Array.from(document.querySelectorAll(".panel-header__action .func-bar .bar-icon"))
          .map((el) => {
            return {
              name: el.querySelector(".icon-item").getAttribute("aria-label"),
              id: el.querySelector(".icon-item").id,
              disabled: el.classList.contains(".disabled"),
            };
          })
          .filter((el) => !options.chatAreaFuncList.find((_el) => _el.name === el.name));
        if (textAreaList.length) {
          log("发送聊天框上方功能列表");
          lite_tools.sendChatTopList(textAreaList);
        }
      }).observe(document.querySelector(".panel-header__action"), {
        attributes: false,
        childList: true,
        subtree: true,
      });
    }

    // 刷新页面配置
    async function updatePage() {
      // 初始化推荐表情
      if (options.message.disabledSticker) {
        document.querySelector(".sticker-bar")?.classList.add("disabled");
      } else {
        document.querySelector(".sticker-bar")?.classList.remove("disabled");
      }
      // 初始化顶部侧边栏
      document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
        const find = options.sidebar.top.find((opt) => opt.index == index);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 初始化底部侧边栏
      document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item").forEach((el, index) => {
        const find = options.sidebar.bottom.find((opt) => opt.index == index);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 禁用GIF热图
      if (options.message.disabledHotGIF) {
        document.body.classList.add("disabled-sticker-hot-gif");
      } else {
        document.body.classList.remove("disabled-sticker-hot-gif");
      }
      // 禁用小红点
      if (options.message.disabledBadge) {
        document.body.classList.add("disabled-badge");
      } else {
        document.body.classList.remove("disabled-badge");
      }
      // 初始化输入框上方功能
      if (document.querySelector(".chat-input-area") && first("chat-input-area")) {
        observerChatArea();
      }
      // 初始化聊天框上方功能
      if (document.querySelector(".panel-header__action") && first("chat-message-area")) {
        observeChatTopFunc();
      }
      // 消息列表监听器
      if (document.querySelector(".ml-list.list") && first("msgList")) {
        observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
      }
      // 禁用滑动多选消息
      if (document.querySelector(".chat-msg-area") && first("disabledSlideMultipleSelection")) {
        touchMoveSelectin("chat-msg-area");
      }
      // 绑定输入框
      if (document.querySelector(".ck.ck-content.ck-editor__editable") && first(".ck.ck-content.ck-editor__editable")) {
        observeChatBox();
      }
      // 处理输入框上方功能列表
      document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.textAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 处理消息列表上方功能列表
      document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.chatAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新自定义样式
      if (first("init-wallpaper")) {
        updateWallpaper();
      }
    }

    // 配置文件更新
    updateOptions(() => {
      log("首页配置更新");
      updateWallpaper();
      updatePage();
    });

    // 设置页面获取侧边栏项目
    lite_tools.optionsOpen((event, message) => {
      let top = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
        if (el.getAttribute("aria-label")) {
          if (el.getAttribute("aria-label").includes("消息")) {
            return {
              name: "消息",
              index,
              disabled: el.classList.contains("disabled"),
            };
          } else {
            return {
              name: el.getAttribute("aria-label"),
              index,
              disabled: el.classList.contains("disabled"),
            };
          }
        } else if (el.querySelector(".game-center-item")) {
          return {
            name: "游戏中心",
            index,
            disabled: el.classList.contains("disabled"),
          };
        } else {
          return {
            name: "未知功能",
            index,
            disabled: el.classList.contains("disabled"),
          };
        }
      });
      let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
        if (el.querySelector(".icon-item").getAttribute("aria-label")) {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            index,
            disabled: el.classList.contains("disabled"),
          };
        } else {
          return {
            name: "未知功能",
            index,
            disabled: el.classList.contains("disabled"),
          };
        }
      });
      lite_tools.sendSidebar({
        top,
        bottom,
      });
    });
  }

  // 独立聊天窗口
  function chatMessage() {
    updatePage();
    initFunction(updatePage);
    async function updatePage() {
      // 禁用贴纸
      if (options.message.disabledSticker) {
        document.querySelector(".sticker-bar")?.classList.add("disabled");
      } else {
        document.querySelector(".sticker-bar")?.classList.remove("disabled");
      }
      // 禁用GIF热图
      if (options.message.disabledHotGIF) {
        document.body.classList.add("disabled-sticker-hot-gif");
      } else {
        document.body.classList.remove("disabled-sticker-hot-gif");
      }
      // 禁用滑动多选消息
      if (document.querySelector(".chat-msg-area") && first("disabledSlideMultipleSelection")) {
        touchMoveSelectin("chat-msg-area");
      }
      // 绑定输入框
      if (document.querySelector(".ck.ck-content.ck-editor__editable") && first(".ck.ck-content.ck-editor__editable")) {
        observeChatBox();
      }
      // 禁用输入框上方功能
      document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.textAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 禁用聊天框上方功能
      document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.chatAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      // 更新自定义样式
      if (first("init-wallpaper")) {
        updateWallpaper();
      }
    }
    // 配置更新
    updateOptions(() => {
      console.log("独立聊天配置更新");
      updateWallpaper();
      updatePage();
    });
    // 附加消息发送时间
    observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
  }

  // 转发消息界面
  function forwardMessage() {
    document.querySelector("#app").classList.add("forward");
    updateWallpaper();
    observerMessageList(".list .q-scroll-view", ".list .q-scroll-view > div", true);
    updateOptions(() => {
      log("转发页面配置更新");
      updateWallpaper();
    });
  }
}

// 打开设置界面时触发
async function onConfigView(view) {

  // 引入模块
  // 防抖函数
  const { debounce } = await import("./modules/debounce.js");
  // 初次执行检查
  const { first } = await import("./modules/first.js");

  // 加载配置信息
  const { opt, listenUpdateOptions } = await import("./modules/options.js");
  updateOptions = listenUpdateOptions;
  options = opt;

  // 引入更新模块;
  const { checkUpdate } = await import(`./modules/checkUpdate.js`);

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
  checkUpdate(view);

  // 调试模式动态更新样式
  lite_tools.updateSettingStyle((event, message) => {
    link_element.href = css_file_path + `?r=${new Date().getTime()}`;
  });

  // 显示插件版本信息
  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools");
  });

  // 向设置界面插入动态选项
  function addOptionLi(list, element, objKey, key) {
    list.forEach((el, index) => {
      const hr = document.createElement("hr");
      hr.classList.add("horizontal-dividing-line");
      const li = document.createElement("li");
      li.classList.add("vertical-list-item");
      const switchEl = document.createElement("div");
      switchEl.classList.add("q-switch");
      if (!el[key]) {
        switchEl.classList.add("is-active");
      }
      switchEl.setAttribute("index", index);
      switchEl.addEventListener("click", function () {
        Function("options", `options.${objKey}[${index}].${key} = ${this.classList.contains("is-active")}`)(options);
        this.classList.toggle("is-active");
        lite_tools.setOptions(options);
      });
      const span = document.createElement("span");
      span.classList.add("q-switch__handle");
      switchEl.appendChild(span);
      const title = document.createElement("h2");
      title.innerText = el.name;
      li.append(title, switchEl);
      element.append(hr, li);
    });
  }

  // 获取侧边栏按钮列表
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
      view.querySelector(".select-search-url").classList.remove("hidden");
    } else {
      view.querySelector(".select-search-url").classList.add("hidden");
    }
    if (first("init-world-search-option")) {
      const searchEl = view.querySelector(".search-url");
      searchEl.value = options.wordSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.wordSearch.searchUrl = searchEl.value;
          log("更新搜索url", searchEl.value);
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 图片搜索
  addSwitchEventlistener("imageSearch.enabled", ".switchImageSearch", (_, enabled) => {
    if (enabled) {
      view.querySelector(".image-select-search-url").classList.remove("hidden");
    } else {
      view.querySelector(".image-select-search-url").classList.add("hidden");
    }
    if (first("init-image-search-option")) {
      const searchEl = view.querySelector(".img-search-url");
      searchEl.value = options.imageSearch.searchUrl;
      searchEl.addEventListener(
        "input",
        debounce(() => {
          options.imageSearch.searchUrl = searchEl.value;
          log("更新搜索url", searchEl.value);
          lite_tools.setOptions(options);
        }, 100)
      );
    }
  });

  // 头像黏贴消息框效果
  addSwitchEventlistener("message.avatarSticky.enabled", ".avatarSticky", (_, enabled) => {
    if (enabled) {
      view.querySelector(".avatar-bottom-li").classList.remove("hidden");
    } else {
      view.querySelector(".avatar-bottom-li").classList.add("hidden");
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
      view.querySelector(".select-path").classList.remove("hidden");
    } else {
      view.querySelector(".select-path").classList.add("hidden");
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

  // 初始化设置界面
  function addSwitchEventlistener(optionKey, switchClass, callback) {
    const option = Function("options", `return options.${optionKey}`)(options);
    if (option) {
      view.querySelector(switchClass).classList.add("is-active");
    } else {
      view.querySelector(switchClass).classList.remove("is-active");
    }
    // 初始化时执行一次callback方法
    if (callback) {
      callback(null, option);
    }
    view.querySelector(switchClass).addEventListener("click", function (event) {
      this.classList.toggle("is-active");
      let newOptions = Object.assign(options, Function("options", `options.${optionKey} = ${this.classList.contains("is-active")}; return options`)(options));
      lite_tools.setOptions(newOptions);
      if (callback) {
        callback(event, this.classList.contains("is-active"));
      }
    });
  }

  // 监听设置文件变动
  updateOptions((opt) => {
    console.log("设置界面配置更新");
    view.querySelector(".select-path input").value = opt.background.url;
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };

// 输入框方法
// document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance.data
