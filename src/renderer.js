// 运行在 Electron 渲染进程 下的页面脚本
let options, styleText, port;

// 首次执行检测，只有第一次执行时返回true
function First() {
  const set = new Set();
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
}
const first = First();

// 通用初始化函数
function initFunction(func) {
  if (!options.spareInitialization) {
    // 全局监听器，在页面创建30秒后自动销毁
    const observer = new MutationObserver(func);
    observer.observe(document.querySelector("#app"), {
      attributes: false,
      childList: true,
      subtree: false,
    });
    // 页面加载完成30秒后取消监听
    setTimeout(() => {
      observer.disconnect();
    }, 30000);
  } else {
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
}

// 通用样式加载函数
async function updateWallpaper() {
  const backgroundStyle = document.querySelector(".background-style");
  if (options.background.enabled) {
    if (!styleText) {
      styleText = await lite_tools.getStyle();
    }
    // 如果url指向图片类型则直接插入css中
    let backgroundImage = "";
    if (/\.(jpg|png|gif|JPG|PNG|GIF)$/.test(options.background.url)) {
      document.querySelector(".background-wallpaper-video")?.remove();
      backgroundImage = `:root{--background-wallpaper:url("http://localhost:${port}${options.background.url}")}`;
    } else if (/\.(mp4|MP4)$/.test(options.background.url)) {
      let videoEl = document.querySelector(".background-wallpaper-video");
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.setAttribute("muted", "");
        videoEl.setAttribute("autoplay", "");
        videoEl.setAttribute("loop", "");
        videoEl.setAttribute("src", options.background.url);
        videoEl.classList.add("background-wallpaper-video");
        videoEl.volume = 0;
        if (document.querySelector(".tab-container")) {
          document.querySelector(".tab-container").appendChild(videoEl);
        } else if (document.querySelector(".container")) {
          document.querySelector(".container").appendChild(videoEl);
        } else if (document.querySelector("#app.forward")) {
          document.querySelector("#app.forward").appendChild(videoEl);
        } else {
          console.log("自定义视频挂载失败");
        }
      } else {
        if (videoEl.getAttribute("src") !== `http://localhost:${port}${options.background.url}`) {
          videoEl.setAttribute("src", `http://localhost:${port}${options.background.url}`);
        }
      }
    } else {
      document.querySelector(".background-wallpaper-video")?.remove();
    }
    backgroundStyle.textContent = backgroundImage + styleText;
  } else {
    backgroundStyle.textContent = "";
    document.querySelector(".background-wallpaper-video")?.remove();
  }
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

  function observerChatArea() {
    new MutationObserver((mutations, observe) => {
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
      // 更新输入框上方功能列表
      const textAreaList = Array.from(document.querySelectorAll(".chat-func-bar .bar-icon")).map((el) => {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          id: el.querySelector(".icon-item").id,
          disabled: el.className.includes(".disabled"),
        };
      });
      lite_tools.sendTextAreaList(textAreaList);
    }).observe(document.querySelector(".chat-input-area"), {
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

    // 更新自定义样式
    updateWallpaper();
  }

  // 配置文件更新
  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
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
            disabled: el.className.includes("disabled"),
          };
        } else {
          return {
            name: el.getAttribute("aria-label"),
            index,
            disabled: el.className.includes("disabled"),
          };
        }
      } else if (el.querySelector(".game-center-item")) {
        return {
          name: "游戏中心",
          index,
          disabled: el.className.includes("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.className.includes("disabled"),
        };
      }
    });
    let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
      if (el.querySelector(".icon-item").getAttribute("aria-label")) {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          index,
          disabled: el.className.includes("disabled"),
        };
      } else {
        return {
          name: "未知功能",
          index,
          disabled: el.className.includes("disabled"),
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
  // initFunction(updatePage);
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

    // 更新自定义样式
    updateWallpaper();
  }
  // 配置更新
  lite_tools.updateOptions((event, opt) => {
    options = opt;
    updatePage();
  });
}

// 转发消息界面
function forwardMessage() {
  document.querySelector("#app").classList.add("forward");
  updatePage();
  async function updatePage() {
    // 更新自定义样式
    updateWallpaper();
  }
  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
    updatePage();
  });
}

// 页面加载完成时触发
async function onLoad() {
  // 获取最新的配置信息
  options = await lite_tools.config();
  // 获取端口
  port = await lite_tools.getPort();

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
      console.log("更新背景样式");
      let backgroundImage = "";
      if (/\.(jpg|png|gif|JPG|PNG|GIF)/.test(options.background.url)) {
        backgroundImage = `:root{--background-wallpaper:url("http://localhost:${port}${options.background.url}")}`;
      }
      element.textContent = backgroundImage + message;
    }
  });
  // 调试用-globalCss刷新
  lite_tools.updateGlobalStyle((event, message) => {
    const element = document.querySelector(".global-style");
    element.removeAttribute("href");
    if (element) {
      console.log("更新全局样式");
      element.textContent = message;
    }
  });

  // 所有页面都需要执行的更新操作
  updatePage();
  lite_tools.updateOptions((event, opt) => {
    console.log("新接口获取配置更新");
    options = opt;
    updatePage();
  });

  function updatePage() {
    // 禁用滑动多选消息
    if (options.message.disabledSlideMultipleSelection) {
      document.body.classList.add("disabled-slide-multiple-selection");
    } else {
      document.body.classList.remove("disabled-slide-multiple-selection");
    }
  }

  // 监听导航跳转
  navigation.addEventListener("navigatesuccess", () => {
    let hash = location.hash;
    if (hash.includes("#/chat/")) {
      hash = "#/chat/message";
    } else if (hash.includes("#/forward")) {
      hash = "#/forward";
    }
    lite_tools.log(`新页面参数 ${hash}`);
    switch (hash) {
      case "#/imageViewer":
        imageViewer();
        break;
      case "#/main/message":
        mainMessage();
        break;
      case "#/chat/message":
        chatMessage();
        break;
      case "#/forward":
        forwardMessage();
        break;
    }
  });
}

// 打开设置界面时触发
async function onConfigView(view) {
  port = await lite_tools.getPort();
  const css_file_path = `http://localhost:${port}/config/view.css`;
  const html_file_path = `http://localhost:${port}/config/view.html`;

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

  // 更新配置信息
  options = await lite_tools.config();

  // 显示插件版本信息
  view.querySelector(".version .link").addEventListener("click", () => {
    lite_tools.openWeb("https://github.com/xiyuesaves/lite_tools/tree/dev");
  });

  view.querySelector(".version .link").innerText = LiteLoader.plugins.lite_tools.manifest.version;

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
        Function("options", `options.${objKey}[${index}].${key} = ${this.className.includes("is-active")}`)(options);
        this.classList.toggle("is-active");
        lite_tools.config(options);
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

  // 列表展开功能
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
  });

  // 切换初始化方式
  addSwitchEventlistener("spareInitialization", ".switchSpare");

  // 快速关闭图片
  addSwitchEventlistener("imageViewer.quickClose", ".switchQuickCloseImage");

  // 禁用推荐表情
  addSwitchEventlistener("message.disabledSticker", ".switchSticker");

  // 禁用表情GIF热图
  addSwitchEventlistener("message.disabledHotGIF", ".switchHotGIF");

  // 禁用红点
  addSwitchEventlistener("message.disabledBadge", ".disabledBadge");

  // 将哔哩哔哩小程序替换为url卡片
  addSwitchEventlistener("message.convertBiliBiliArk", ".switchDisabledMiniPrgm");

  // 自动打开来自手机的链接或者卡片消息
  addSwitchEventlistener("message.autoOpenURL", ".switchAutoOpenURL");

  // debug开关
  addSwitchEventlistener("debug", ".switchDebug");

  // 显示每条消息发送时间
  addSwitchEventlistener("message.showMsgTime", ".showMsgTime");

  // 禁用滑动多选消息
  addSwitchEventlistener("message.disabledSlideMultipleSelection", ".switchDisabledSlideMultipleSelection");

  // 自定义背景
  addSwitchEventlistener("background.enabled", ".switchBackgroundImage", (event, enabled) => {
    if (enabled) {
      view.querySelector(".select-path").classList.remove("hidden");
    } else {
      view.querySelector(".select-path").classList.add("hidden");
    }
  });
  if (options.background.enabled) {
    view.querySelector(".select-path").classList.remove("hidden");
  } else {
    view.querySelector(".select-path").classList.add("hidden");
  }
  view.querySelector(".select-path input").value = options.background.showUrl;
  view.querySelectorAll(".select-file").forEach((el) => {
    el.addEventListener("click", () => {
      lite_tools.openSelectBackground();
    });
  });

  // 初始化设置界面
  function addSwitchEventlistener(optionKey, switchClass, callback) {
    const option = Function("options", `return options.${optionKey}`)(options);
    if (option) {
      view.querySelector(switchClass).classList.add("is-active");
    } else {
      view.querySelector(switchClass).classList.remove("is-active");
    }
    view.querySelector(switchClass).addEventListener("click", function (event) {
      this.classList.toggle("is-active");
      options = Object.assign(
        options,
        Function("options", `options.${optionKey} = ${this.className.includes("is-active")}; return options`)(options)
      );
      lite_tools.config(options);
      if (callback) {
        callback(event, this.className.includes("is-active"));
      }
    });
  }

  // 监听设置文件变动
  lite_tools.updateOptions((event, opt) => {
    options = opt;
    view.querySelector(".select-path input").value = options.background.showUrl;
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };
