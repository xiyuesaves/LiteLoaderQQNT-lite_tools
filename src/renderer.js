// 运行在 Electron 渲染进程 下的页面脚本
let options;

// 首次执行检测，只有第一次执行时返回true
function First() {
  const set = new Set();
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
}
const first = First();

// 所有页面通用初始化函数
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

// 媒体预览增强
function imageViewer() {
  // 修复弹窗字体模糊
  const element = document.createElement("style");
  document.head.appendChild(element);
  element.textContent = `
  .main-area__loading-tip,
  .image-viewer__tip{
    pointer-events: none;
    width: 145px !important;
    transform: none !important;
    top:0 !important;
    left:0 !important;
    right:0 !important;
    bottom:0 !important;
    margin:auto !important;
  }
  `;
  // 针对图片的单击关闭图片
  if (options.imageViewer.quickClose) {
  }
  const appEl = document.querySelector("#app");
  const option = { attributes: false, childList: true, subtree: true };
  const callback = (mutationsList, observer) => {
    // lite_tools.log("observer触发");
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
      observer.disconnect();
      lite_tools.log(`视频播放器`);
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
    }).observe(document.querySelector(".chat-input-area"), {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  // 刷新页面配置
  function updatePage() {
    // 初始化推荐表情
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
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
    // 禁用给GIF热图
    document.querySelectorAll(".sticker-panel__bar .tabs-container-item").forEach((el) => {
      if (el.querySelector(".q-icon") && el.querySelector(".q-icon").getAttribute("title") === "GIF热图") {
        if (options.message.disabledHotGIF) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 禁用小红点
    if (options.message.disabledBadge) {
      let disabledBadge = document.createElement("style");
      disabledBadge.innerHTML = `.q-badge .q-badge-sub,.q-badge .q-badge-num,.q-badge .q-badge__red{display:none !important;}`;
      disabledBadge.classList.add("disabledBadge");
      document.body.appendChild(disabledBadge);
    } else {
      document.querySelectorAll(".disabledBadge").forEach((el) => el.remove());
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
  }

  // 主进程通信模块
  lite_tools.messageChannel((event, message) => {
    switch (message.type) {
      case "get":
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
        let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map(
          (el, index) => {
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
          }
        );
        lite_tools.sendSidebar({
          top,
          bottom,
        });
        break;
      case "set":
        options = message.options;
        updatePage();
        break;
    }
  });
}

// 独立聊天窗口
function chatMessage() {
  updatePage();
  initFunction(updatePage);
  function updatePage() {
    if (options.message.disabledSticker) {
      document.querySelector(".sticker-bar")?.classList.add("disabled");
    }
    document.querySelectorAll(".sticker-panel__bar .tabs-container-item").forEach((el) => {
      if (el.querySelector(".q-icon") && el.querySelector(".q-icon").getAttribute("title") === "GIF热图") {
        if (options.message.disabledHotGIF) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
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
  }
}

// 页面加载完成时触发
async function onLoad() {
  options = await lite_tools.config();

  // 全局加载通用样式
  const style = document.createElement("style");
  style.innerText = `.disabled{display:none !important};`;
  document.body.append(style);

  navigation.addEventListener("navigatesuccess", () => {
    let hash = location.hash;
    lite_tools.log(`新页面参数 ${hash}`);
    if (hash.includes("#/chat/")) {
      hash = "#/chat/message";
    }
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
    }
  });
}

// 打开设置界面时触发
async function onConfigView(view) {
  // 部分代码来自
  // https://github.com/mo-jinran/LiteLoaderQQNT-Config-View
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const css_file_path = `file://${plugin_path}/src/config/view.css`;
  const html_file_path = `file://${plugin_path}/src/config/view.html`;

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

  // 初始化设置界面
  function addSwitchEventlistener(optionKey, switchClass) {
    const option = Function("options", `return options.${optionKey}`)(options);
    if (option) {
      view.querySelector(switchClass).classList.add("is-active");
    } else {
      view.querySelector(switchClass).classList.remove("is-active");
    }
    view.querySelector(switchClass).addEventListener("click", function () {
      this.classList.toggle("is-active");
      options = Object.assign(
        options,
        Function("options", `options.${optionKey} = ${this.className.includes("is-active")}; return options`)(options)
      );
      lite_tools.config(options);
    });
  }
}

// 这两个函数都是可选的
export { onLoad, onConfigView };
