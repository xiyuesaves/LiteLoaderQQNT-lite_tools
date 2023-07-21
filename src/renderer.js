// 运行在 Electron 渲染进程 下的页面脚本
let options;

// 媒体预览增强
function imageViewer() {
  // 修复弹窗字体模糊
  const element = document.createElement("style");
  document.head.appendChild(element);
  element.textContent = `
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
    lite_tools.log("observer触发");
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
  const style = document.createElement("style");
  style.innerText = ".disabled{display:none !important};";
  document.body.appendChild(style);

  // 监听侧边栏图标变动
  const observer = new MutationObserver((mutations, observer) => {
    document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
      const find = options.sidebar.find((opt) => opt.index == index);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
  });
  observer.observe(document.querySelector(".nav.sidebar__nav"), {
    attributes: false,
    childList: true,
    subtree: false,
  });
  // 页面加载完成30秒后取消监听
  setTimeout(() => {
    observer.disconnect();
  }, 30000);

  // 主进程通信模块
  lite_tools.updateSidebar((event, message) => {
    // console.log("接收到请求", message);
    switch (message.type) {
      case "get":
        let list = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
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
        lite_tools.sendSidebar(list);
        break;
      case "set":
        // lite_tools.log(
        //   `${document.querySelectorAll(".nav.sidebar__nav .nav-item").length} 更新聊天页面 ${JSON.stringify(message)}`
        // );
        document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
          const find = message.options.sidebar.find((opt) => opt.index == index);
          if (find) {
            if (find.disabled) {
              el.classList.add("disabled");
            } else {
              el.classList.remove("disabled");
            }
          }
        });
        break;
    }
  });
}

// 设置界面
function settings() {}

// 页面加载完成时触发
async function onLoad() {
  options = await lite_tools.config();

  navigation.addEventListener("navigatesuccess", () => {
    // lite_tools.log(`新页面参数 ${JSON.stringify(location)}`);
    switch (location.hash) {
      case "#/imageViewer":
        imageViewer();
        break;
      case "#/main/message":
        mainMessage();
        break;
      case "#/setting/settings/common":
        settings();
        break;
    }
  });
}

// 打开设置界面时触发
async function onConfigView(view) {
  // 部分代码来自
  // https://github.com/mo-jinran/LiteLoaderQQNT-Config-View
  const plugin_path = LiteLoader.plugins.lightweight_toolbox.path.plugin;
  const css_file_path = `file://${plugin_path}/src/config/style.css`;
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

  options = await lite_tools.config();

  // 获取侧边栏按钮列表\
  getSidebar();
  async function getSidebar() {
    const list = await lite_tools.getSidebar({
      type: "get",
    });
    const sidebar = view.querySelector(".sidebar ul");
    list.forEach((el) => {
      const hr = document.createElement("hr");
      hr.classList.add("horizontal-dividing-line");
      const li = document.createElement("li");
      li.classList.add("vertical-list-item");
      const switchEl = document.createElement("div");
      switchEl.classList.add("q-switch");
      if (!el.disabled) {
        switchEl.classList.add("is-active");
      }
      switchEl.setAttribute("index", el.index);
      switchEl.addEventListener("click", function () {
        let index = this.getAttribute("index");
        list[index].disabled = this.className.includes("is-active");
        this.classList.toggle("is-active");
        options.sidebar = list;
        lite_tools.config(options);
      });
      const span = document.createElement("span");
      span.classList.add("q-switch__handle");
      switchEl.appendChild(span);
      const title = document.createElement("h2");
      title.innerText = el.name;
      li.append(title, switchEl);
      sidebar.append(hr, li);
    });
  }

  // 点击事件
  view.querySelectorAll(".wrap .vertical-list-item.title").forEach((el) => {
    el.addEventListener("click", function (event) {
      const wrap = this.parentElement;
      wrap.querySelector(".icon").classList.toggle("is-fold");
      wrap.querySelector("ul").classList.toggle("hidden");
    });
  });

  if (options.imageViewer.quickClose) {
    view.querySelector(".switchQuickCloseImage").classList.add("is-active");
  } else {
    view.querySelector(".switchQuickCloseImage").classList.remove("is-active");
  }

  view.querySelector(".switchQuickCloseImage").addEventListener("click", function () {
    this.classList.toggle("is-active");
    options.imageViewer.quickClose = this.className.includes("is-active");
    lite_tools.config(options);
  });
}

// 这两个函数都是可选的
export { onLoad, onConfigView };
