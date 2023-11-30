import { options, updateOptions } from "./options.js";
import { debounce } from "./debounce.js";
import { logs } from "./logs.js";
import { localEmoticonsIcon } from "./svg.js";
import { sendMessage } from "./QQCall.js";
const log = new logs("本地表情包模块").log;

let barIcon;
let htmoDom;
let openFullPreview = false;
let openFullPreviewTO = null;
let showEmoticons = false;
let insertImg = true;
let folderInfos = [];
let emoticonsListArr = [];
let forList = [];
let regOut;
let ckeditorInstance;
let ckeditEditorModel;
let quickPreviewEl;
let previewListEl;

if (options.localEmoticons.enabled) {
  document.body.classList.add("lite-tools-showLocalEmoticons");
} else {
  document.body.classList.remove("lite-tools-showLocalEmoticons");
}
updateOptions((opt) => {
  if (opt.localEmoticons.enabled) {
    document.body.classList.add("lite-tools-showLocalEmoticons");
  } else {
    document.body.classList.remove("lite-tools-showLocalEmoticons");
  }
});
log("模块已加载");

/**
 * 初始化本地表情包功能
 */
function localEmoticons() {
  if (document.querySelector(".lite-tools-bar")) {
    return;
  }
  if (!document.querySelector(".chat-input-area .chat-func-bar .func-bar")) {
    return;
  }
  if (!ckeditEditorModel) {
    loadEditorModel();
    lite_tools.updateLocalEmoticonsConfig((_, list) => {
      updateCommonlyEmoticons(list);
    });
    lite_tools.updateEmoticons((_, list) => {
      log("渲染端更新列表", list.length);
      appendEmoticons(list);
    });
  }
  document.body.removeEventListener("mouseup", globalMouseUp);
  document.body.removeEventListener("mouseleave", globalMouseUp);
  document.body.removeEventListener("mousedown", globalMouseDown);
  document.body.addEventListener("mouseup", globalMouseUp);
  document.body.addEventListener("mouseleave", globalMouseUp);
  document.body.addEventListener("mousedown", globalMouseDown);
  if (!htmoDom) {
    loadDom();
  }

  /**
   * 插入图标逻辑
   */
  const targetPosition = document.querySelector(".chat-input-area .chat-func-bar .func-bar:last-child");
  if (!barIcon) {
    barIcon = document.createElement("div");
    barIcon.classList.add("lite-tools-bar");
    const qTooltips = document.createElement("div");
    qTooltips.classList.add("lite-tools-q-tooltips");
    qTooltips.addEventListener("click", openLocalEmoticons);
    const qTooltipsContent = document.createElement("div");
    qTooltipsContent.classList.add("lite-tools-q-tooltips__content");
    const icon = document.createElement("i");
    icon.classList.add("lite-tools-q-icon");
    icon.innerHTML = localEmoticonsIcon;
    qTooltipsContent.innerText = "本地表情";
    qTooltips.appendChild(icon);
    qTooltips.appendChild(qTooltipsContent);
    barIcon.appendChild(qTooltips);
    targetPosition.appendChild(barIcon);
    log("创建图标");
  } else {
    targetPosition.appendChild(barIcon);
    log("嵌入图标");
  }

  /**
   * 监听聊天窗口尺寸变化
   */
  function changeListSize() {
    if (forList.length) {
      let fixedWidth = forList.length * 80 - 10 + 20;
      let maxWidth = document.querySelector(".expression-bar").offsetWidth - 28;
      if (fixedWidth > maxWidth) {
        fixedWidth = maxWidth;
      }
      quickPreviewEl.style.width = fixedWidth + "px";
      previewListEl.style.height = fixedWidth + "px";
    }
  }

  /**
   * 快速选择栏插入位置
   */
  const chatMessagePosition = document.querySelector(".expression-bar .sticker-wrapper.expression-bar-inner");
  if (!quickPreviewEl) {
    quickPreviewEl = document.createElement("div");
    quickPreviewEl.classList.add("lite-tools-sticker-bar");
    previewListEl = document.createElement("div");
    previewListEl.classList.add("preview-list");
    quickPreviewEl.appendChild(previewListEl);

    // 监听窗口宽度变化
    const resizeObserver = new ResizeObserver(changeListSize);
    resizeObserver.observe(document.querySelector(".expression-bar"));

    // 处理鼠标相关事件
    quickPreviewEl.addEventListener("mousedown", (event) => {
      if (doesParentHaveClass(event.target, "preview-item", "lite-tools-sticker-bar")) {
        mouseDown(event);
      }
    });
    quickPreviewEl.addEventListener("mousemove", (event) => {
      if (doesParentHaveClass(event.target, "preview-item", "lite-tools-sticker-bar")) {
        mouseEnter(event);
      }
    });
    quickPreviewEl.addEventListener("click", (event) => {
      if (doesParentHaveClass(event.target, "preview-item", "lite-tools-sticker-bar")) {
        insert(event);
      }
    });

    chatMessagePosition.appendChild(quickPreviewEl);
    changeListSize();
  } else {
    chatMessagePosition.appendChild(quickPreviewEl);
    changeListSize();
  }
}

/**
 * 捕获编辑器实例
 */
function loadEditorModel() {
  log("尝试捕获编辑器实例");
  if (
    document.querySelector(".ck.ck-content.ck-editor__editable") &&
    document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance
  ) {
    ckeditorInstance = document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance;
    ckeditEditorModel = ckeditorInstance.model;

    const observe = new MutationObserver(quickInsertion);
    observe.observe(document.querySelector(".ck.ck-content.ck-editor__editable"), {
      subtree: true,
      attributes: false,
      childList: true,
    });
  } else {
    setTimeout(loadEditorModel, 100);
  }
}

/**
 * 处理快捷输入表情命令
 */
function quickInsertion() {
  if (!options.localEmoticons.enabled || !options.localEmoticons.quickEmoticons) {
    if (quickPreviewEl.classList.contains("show")) {
      quickPreviewEl.classList.remove("show");
    }
    return;
  }

  const msg = ckeditorInstance.getData();
  const msgArr = msg.split("<p>");
  const lastStr = msgArr[msgArr.length - 1];
  // 一个很抽象的编辑框文本处理方案
  regOut = lastStr.replace(/<[^>]+>/g, "<element>").match(/\/([^\/]*)(?=<element>$)/);
  let filterEmocicons = [];
  if (regOut) {
    log(regOut);
    let emoticonsName = regOut[0].slice(1);
    filterEmocicons = emoticonsListArr.filter((emoticons) => emoticons.name.includes(emoticonsName));
  }

  if (lastStr.slice(-5) === "/</p>" || filterEmocicons.length) {
    if (!quickPreviewEl.classList.contains("show")) {
      quickPreviewEl.classList.add("show");
    }

    // 如果没有过滤数据，则使用全部图片
    forList = filterEmocicons.length ? filterEmocicons : emoticonsListArr;

    // 计算浮动窗口宽度
    let fixedWidth = forList.length * 80 - 10 + 20;
    let maxWidth = document.querySelector(".expression-bar").offsetWidth - 28;
    if (fixedWidth > maxWidth) {
      fixedWidth = maxWidth;
    }
    quickPreviewEl.style.width = fixedWidth + "px";
    previewListEl.style.height = fixedWidth + "px";

    // 清理上一次的数据
    document.querySelectorAll(".preview-list .preview-item").forEach((el) => el.remove());

    // 插入过滤后的表情列表
    for (let i = 0; i < forList.length; i++) {
      const previewItem = document.createElement("div");
      previewItem.classList.add("preview-item");
      const skiterPreview = document.createElement("div");
      skiterPreview.classList.add("skiter-preview");
      const img = document.createElement("img");
      img.setAttribute("lazy", "");
      img.src = "llqqnt://local-file/" + forList[i].path;
      skiterPreview.appendChild(img);
      previewItem.appendChild(skiterPreview);
      previewListEl.appendChild(previewItem);
    }
  } else {
    if (quickPreviewEl.classList.contains("show")) {
      quickPreviewEl.classList.remove("show");
    }
  }
}

/**
 * 更新常用表情列表
 * @param {Array} list 常用表情列表
 */
function updateCommonlyEmoticons(options) {
  log("更新常用表情列表", options);
  // 移除旧数据
  document.querySelector(`.folder-item[data-id="commonlyEmoticons"]`)?.remove();
  document.querySelector(`.folder-icon-item [data-id="commonlyEmoticons"]`)?.parentElement?.remove();
  if (folderInfos[0].id === "commonlyEmoticons") {
    folderInfos.shift();
  }
  // 如果历史数组为空则直接返回
  if (!options.commonlyEmoticons.length) {
    return;
  }
  // 开始生成新数据
  const folderList = document.querySelector(".lite-tools-local-emoticons-main .folder-list");
  const folderScroll = document.querySelector(".folder-icon-list .folder-scroll");
  // 插入新的表情数据
  const folder = {
    name: "常用表情",
    list: options.commonlyEmoticons.map((path) => {
      return { path };
    }),
  };
  // 创建表情文件夹元素
  const { folderEl, folderIcon } = createEmoticonsFolder(folder, folder.list[0].path, "commonlyEmoticons");
  folderList.insertBefore(folderEl, folderList.querySelector(":first-child"));
  folderScroll.insertBefore(folderIcon, folderScroll.querySelector(":first-child"));
  folderInfos.unshift({
    el: folderEl,
    id: "commonlyEmoticons",
    name: folder.name,
  });
}

/**
 * 捕获全局鼠标按键抬起事件
 * @param {MouseEvent} event
 */
function globalMouseUp(event) {
  if (event.button === 0) {
    clearTimeout(openFullPreviewTO);
    if (openFullPreview) {
      openFullPreview = false;
      setTimeout(() => {
        insertImg = true;
      });
      document.querySelector(".full-screen-preview").classList.remove("show");
    }
  }
}

/**
 * 捕获全局鼠标按键按下事件
 * @param {MouseEvent} event
 */
function globalMouseDown(event) {
  if (!doesParentHaveClass(event.target, "lite-tools-bar") && barIcon.querySelector(".lite-tools-local-emoticons-main")) {
    showEmoticons = false;
    barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
    barIcon.querySelector(".lite-tools-q-tooltips__content").classList.remove("hidden");
    return;
  }
}

/**
 * 鼠标按键按下事件
 * @param {MouseEvent} event
 */
function mouseDown(event) {
  if (event.button === 0 && !openFullPreview) {
    openFullPreviewTO = setTimeout(() => {
      log("执行延迟逻辑");
      openFullPreview = true;
      insertImg = false;
      document.querySelector(".full-screen-preview img").src = event.target.querySelector("img").getAttribute("src");
      document.querySelector(".full-screen-preview").classList.add("show");
    }, 500);
  }
}

/**
 * 鼠标指针进入元素事件
 * @param {MouseEvent} event
 */
function mouseEnter(event) {
  if (openFullPreview) {
    const showImg = document.querySelector(".full-screen-preview img");
    const showImgSrc = showImg.getAttribute("src");
    const targetSrc = event.target.querySelector("img").getAttribute("src");
    if (showImgSrc !== targetSrc) {
      showImg.src = targetSrc;
    }
  }
}

/**
 * 插入表情包到编辑器
 * @param {MouseEvent} event
 * @returns
 */
async function insert(event) {
  if (!insertImg) {
    return;
  }
  // 操作输入框代码参考：https://github.com/Night-stars-1/LiteLoaderQQNT-Plugin-LLAPI/blob/4ef44f7010d0150c3577d664b9945af62a7bc54b/src/renderer.js#L208C5-L208C15
  if (ckeditEditorModel) {
    const src = decodeURI(event.target.querySelector("img").src.replace("llqqnt://local-file/", "").replace(/\//g, "\\"));
    // 更新常用表情
    if (options.localEmoticons.commonlyEmoticons) {
      lite_tools.addCommonlyEmoticons(src);
    }
    // 如果有匹配命令值，则先删除
    if (regOut) {
      ckeditEditorModel.change((writer) => {
        writer.setSelection(writer.createPositionAt(ckeditEditorModel.document.getRoot(), "end"));
        for (let i = 0; i < regOut[0].length; i++) {
          ckeditorInstance.execute("delete");
        }
      });
    }

    if (event.altKey) {
      log("直接发送图片");
      const peer = await lite_tools.getPeer();
      sendMessage(peer, [{ type: "image", path: src }]);
    } else {
      const selection = ckeditEditorModel.document.selection;
      const position = selection.getFirstPosition();

      ckeditEditorModel.change((writer) => {
        writer.setSelection(writer.createPositionAt(ckeditEditorModel.document.getRoot(), "end"));
        // 插入表情
        const writerEl = writer.createElement("msg-img", { data: JSON.stringify({ type: "pic", src, picSubType: 0 }) });
        writer.insert(writerEl, position);
      });
    }

    showEmoticons = false;
    // 如果按下了ctrl键，则不关闭窗口面板
    if (!event.ctrlKey) {
      barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
    }
  }
}

/**
 * 加载dom结构
 */
async function loadDom() {
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const domUrl = `llqqnt://local-file/${plugin_path}/src/config/localEmoticons.html`;
  const html_text = await (await fetch(domUrl)).text();
  const parser = new DOMParser();
  htmoDom = parser.parseFromString(html_text, "text/html");
  htmoDom.querySelectorAll("section").forEach((el) => {
    barIcon.appendChild(el);
  });

  // 表情选择面板
  const emoticonsMain = barIcon.querySelector(".lite-tools-local-emoticons-main");

  // 加载本地表情包
  const emoticonsList = await lite_tools.getLocalEmoticonsList();
  appendEmoticons(emoticonsList);

  // 加载常用表情包
  const CommonlyEmoticons = await lite_tools.getCommonlyEmoticons();
  updateCommonlyEmoticons(CommonlyEmoticons);

  // 监听列表滚动
  emoticonsMain.querySelector(".folder-list").addEventListener(
    "scroll",
    debounce((event) => {
      let top = 0;
      for (let i = 0; i < folderInfos.length; i++) {
        const folder = folderInfos[i];
        top += folder.el.offsetHeight;
        if (top >= event.target.scrollTop) {
          document.querySelector(".folder-icon-item.active")?.classList?.remove("active");
          const activeEl = document.querySelector(`.folder-icon-item .icon-box[data-id="${folder.id}"]`).parentElement;
          const folderScroll = document.querySelector(".folder-scroll");
          activeEl.classList.add("active");
          folderScroll.scrollTo({
            top: activeEl.offsetTop - folderScroll.offsetHeight / 2,
            behavior: "smooth",
          });
          break;
        }
      }
    }, 10),
  );

  // 处理鼠标相关事件
  emoticonsMain.addEventListener("mousedown", (event) => {
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      mouseDown(event);
    }
  });
  emoticonsMain.addEventListener("mousemove", (event) => {
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      mouseEnter(event);
    }
  });
  emoticonsMain.addEventListener("click", (event) => {
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      insert(event);
    } else if (doesParentHaveClass(event.target, "folder-icon-item", "lite-tools-local-emoticons-main")) {
      jumpFolder(event);
    }
  });
}

/**
 * 跳转到图标对应表情文件夹
 * @param {MouseEvent} event
 */
function jumpFolder(event) {
  const id = event.target.getAttribute("data-id");
  if (!id) {
    return;
  }
  // document.querySelector(".folder-icon-item.active")?.classList?.remove("active");
  // event.target.parentElement.classList.add("active");
  const targetItem = document.querySelector(`.folder-item[data-id="${id}"]`);
  document.querySelector(".lite-tools-local-emoticons-main .folder-list").scrollTo({
    top: targetItem.offsetTop,
    // behavior: "smooth",
  });
}

/**
 * 判断父元素是否包含指定类名
 * @param {Element} element 需要判断的元素
 * @param {className} className 目标样式
 * @param {className} stopClassName 停止递归样式
 * @returns
 */
function doesParentHaveClass(element, className, stopClassName) {
  let parentElement = element.parentElement;
  while (parentElement !== null) {
    if (parentElement.classList.contains(className)) {
      return true;
    }
    if (parentElement.classList.contains(stopClassName)) {
      return false;
    }
    parentElement = parentElement.parentElement;
  }
  return false;
}

/**
 * 加载表情包列表
 * @param {Array} emoticonsList 表情包列表
 */
function appendEmoticons(emoticonsList) {
  // 平铺表情对象数组
  emoticonsListArr = emoticonsList.flatMap((emoticons) => {
    return emoticons.list;
  });
  // 初始化表情文件夹信息
  folderInfos = [];
  // 清理dom结构
  document
    .querySelectorAll(
      `.lite-tools-local-emoticons-main .folder-item:not([data-id="commonlyEmoticons"]),.lite-tools-local-emoticons-main .folder-icon-list .folder-icon-item:not([data-id="commonlyEmoticons"])`,
    )
    .forEach((item) => {
      item.remove();
    });
  const folderList = document.querySelector(".lite-tools-local-emoticons-main .folder-list");
  const folderScroll = document.querySelector(".folder-icon-list .folder-scroll");
  // 插入新的表情数据
  emoticonsList.forEach((folder, index) => {
    // 创建表情文件夹元素
    const { folderEl, folderIcon } = createEmoticonsFolder(folder, folder.list[0].path, index);
    folderList.appendChild(folderEl);
    folderScroll.appendChild(folderIcon);
    folderInfos.push({
      el: folderEl,
      id: index,
      name: folder.name,
    });
  });
}

// 创建表情文件夹元素
function createEmoticonsFolder(folder, iconSrc, id) {
  if (!iconSrc) {
    iconSrc = folder.list[0].path;
  }
  // 创建表情分类
  const folderEl = document.createElement("div");
  folderEl.classList.add("folder-item");
  folderEl.setAttribute("data-id", id);
  const categoryName = document.createElement("div");
  categoryName.classList.add("category-name");
  categoryName.innerText = folder.name;
  const categoryList = document.createElement("div");
  categoryList.classList.add("category-list");
  // 创建小图标
  const folderIcon = document.createElement("div");
  folderIcon.classList.add("folder-icon-item");
  folderIcon.setAttribute("title", folder.name);
  folderIcon.setAttribute("data-id", id);
  const iconEl = document.createElement("img");
  iconEl.src = "llqqnt://local-file/" + iconSrc;
  const iconBox = document.createElement("div");
  iconBox.classList.add("icon-box");
  iconBox.setAttribute("data-id", id);
  iconBox.appendChild(iconEl);
  folderIcon.appendChild(iconBox);
  // 插入表情文件
  folder.list.forEach((item) => {
    const categoryItem = document.createElement("div");
    categoryItem.classList.add("category-item");
    const skiterPreview = document.createElement("div");
    skiterPreview.classList.add("skiter-preview");
    const img = document.createElement("img");
    img.setAttribute("lazy", "");
    img.src = "llqqnt://local-file/" + item.path;
    skiterPreview.appendChild(img);
    categoryItem.append(skiterPreview);
    categoryList.appendChild(categoryItem);
  });
  folderEl.append(categoryName, categoryList);
  return { folderEl, folderIcon };
}

/**
 * 打开表情包管理菜单
 */
function openLocalEmoticons() {
  if (htmoDom) {
    if (showEmoticons) {
      showEmoticons = false;
      barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
      barIcon.querySelector(".lite-tools-q-tooltips__content").classList.remove("hidden");
    } else {
      showEmoticons = true;
      document.querySelector(".folder-list").scrollTop = 0;
      barIcon.querySelector(".lite-tools-local-emoticons-main").classList.add("show");
      barIcon.querySelector(".lite-tools-q-tooltips__content").classList.add("hidden");
    }
  } else {
    log("表情菜单还没有加载完成");
  }
}

export { localEmoticons };
