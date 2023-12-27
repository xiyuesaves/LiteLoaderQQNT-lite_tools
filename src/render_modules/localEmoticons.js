import { options, updateOptions } from "./options.js";
import { debounce } from "./debounce.js";
import { logs } from "./logs.js";
import { localEmoticonsIcon } from "./svg.js";
import { sendMessage } from "./nativeCall.js";
const log = new logs("本地表情包模块").log;

let barIcon;
let htmlDom;
let openFullPreview = false;
let openFullPreviewTO = null;
let showEmoticons = false;
let insertImg = true;
let folderInfos = [];
let emoticonsListArr = [];
let emoticonsList = [];
let forList = [];
let regOut;
let ckeditorInstance;
let ckeditEditorModel;
let quickPreviewEl;
let previewListEl;
let showContextMenu = false;
let targetElement; // 右键点击的图片元素
const commonlyId = "commonlyEmoticons";

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
    lite_tools.updateLocalEmoticonsConfig((_, config) => {
      updateLocalEmoticonsConfig(config);
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
  if (!htmlDom) {
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
      if (event.target.closest(".preview-item")) {
        mouseDown(event);
      }
    });
    quickPreviewEl.addEventListener("mousemove", (event) => {
      if (event.target.closest(".preview-item")) {
        mouseEnter(event);
      }
    });
    quickPreviewEl.addEventListener("click", (event) => {
      if (event.target.closest(".preview-item")) {
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
function updateLocalEmoticonsConfig(config) {
  log("更新表情尺寸", options.localEmoticons.rowsSize);
  const folderList = document.querySelector(".lite-tools-local-emoticons-main .folder-list");
  const folderScroll = document.querySelector(".folder-icon-list .folder-scroll");
  folderList.setAttribute("style", `--category-item-size: ${(folderList.offsetWidth - 12) / options.localEmoticons.rowsSize}px;`);

  if (!options.localEmoticons.enabled) {
    return;
  }

  log("更新常用表情列表", config);

  if (!options.localEmoticons.commonlyEmoticons) {
    log("销毁历史表情实例", folderInfos[0].id);
    if (folderInfos[0].id === commonlyId) {
      const emoticon = folderInfos.shift();
      emoticon.destroy();
    }
  } else {
    const list = config.commonlyEmoticons.map((path, index) => {
      return { path, index };
    });
    if (folderInfos[0].id === commonlyId) {
      const findEmoticons = folderInfos[0];
      findEmoticons.updateEmoticonList(list);
      folderList.insertBefore(findEmoticons.folderEl, folderList.querySelector(":first-child"));
      folderScroll.insertBefore(findEmoticons.folderIconEl, folderScroll.querySelector(":first-child"));
    } else if (list.length) {
      const newEmoticonFolder = new emoticonFolder("历史表情", list, commonlyId, list[0].path, -1, "commonly");
      folderInfos.unshift(newEmoticonFolder);
      folderList.insertBefore(newEmoticonFolder.folderEl, folderList.querySelector(":first-child"));
      folderScroll.insertBefore(newEmoticonFolder.folderIconEl, folderScroll.querySelector(":first-child"));
    }
  }
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
  if (showContextMenu && !event.target.closest(".context-menu")) {
    closeContextMenu();
  }
  if (!event.target.closest(".lite-tools-bar") && barIcon.querySelector(".lite-tools-local-emoticons-main")) {
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
function insert(event) {
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
      const peer = lite_tools.getPeer();
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
  htmlDom = parser.parseFromString(html_text, "text/html");
  htmlDom.querySelectorAll("section").forEach((el) => {
    barIcon.appendChild(el);
  });

  // 表情选择面板
  const emoticonsMain = barIcon.querySelector(".lite-tools-local-emoticons-main");

  // 加载本地表情包
  const emoticonsList = await lite_tools.getLocalEmoticonsList();
  appendEmoticons(emoticonsList);

  // 获取表情包配置文件
  const config = await lite_tools.getLocalEmoticonsConfig();
  updateLocalEmoticonsConfig(config);

  // 监听列表滚动
  emoticonsMain.querySelector(".folder-list").addEventListener(
    "scroll",
    debounce((event) => {
      let top = 0;
      for (let i = 0; i < folderInfos.length; i++) {
        const folder = folderInfos[i];
        top += folder.folderEl.offsetHeight;
        if (top >= event.target.scrollTop + 1) {
          document.querySelector(".folder-icon-item.active")?.classList?.remove("active");
          const activeEl = document.querySelector(`.folder-icon-item[data-id="${folder.id}"]`);
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
    if (event.target.closest(".category-item")) {
      if (event.button === 0) {
        mouseDown(event);
      } else if (event.button === 2) {
        contextMenu(event);
      }
    }
  });
  emoticonsMain.addEventListener("mousemove", (event) => {
    if (event.target.closest(".category-item")) {
      mouseEnter(event);
    }
  });
  emoticonsMain.addEventListener("click", (event) => {
    if (event.target.closest(".category-item")) {
      insert(event);
    } else if (event.target.closest(".folder-icon-item")) {
      jumpFolder(event);
    }
  });

  // 处理右键菜单监听事件
  const contextMenuEl = barIcon.querySelector(".context-menu");
  contextMenuEl.querySelector(".open-folder").addEventListener("click", (event) => {
    log("打开文件路径", targetElement.path);
    lite_tools.openFolder(targetElement.path);
    closeContextMenu();
  });
  contextMenuEl.querySelector(".open-file").addEventListener("click", (event) => {
    log("打开文件", targetElement.path);
    lite_tools.openFile(targetElement.path);
    closeContextMenu();
  });
  contextMenuEl.querySelector(".delete-from-commonly").addEventListener("click", (event) => {
    log("从历史记录中移除", targetElement.path);
    lite_tools.deleteCommonlyEmoticons(targetElement.path);
    closeContextMenu();
  });
}

/**
 * 关闭右键菜单
 */
function closeContextMenu() {
  showContextMenu = false;
  barIcon.querySelector(".skiter-preview.active").classList.remove("active");
  barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show-menu");
}

/**
 * 打开表情右键菜单
 * @param {MouseEvent} event
 */
function contextMenu(event) {
  event.stopPropagation();
  showContextMenu = true;
  event.target.classList.add("active");
  barIcon.querySelector(".lite-tools-local-emoticons-main").classList.add("show-menu");
  targetElement = {
    path: event.target.closest(".category-item").path,
    type: event.target.closest(".folder-item").getAttribute("data-type"),
  };
  log("目标元素数据", targetElement);

  const contextMenuEl = barIcon.querySelector(".context-menu");
  const folderList = barIcon.querySelector(".lite-tools-local-emoticons-main .folder-list");
  const padding = 6;

  if (targetElement.type === "commonly") {
    contextMenuEl.querySelector(".delete-from-commonly").classList.remove("hide");
  } else {
    contextMenuEl.querySelector(".delete-from-commonly").classList.add("hide");
  }

  let offsetTop =
    event.target.parentElement.parentElement.offsetParent.offsetTop +
    event.target.offsetParent.offsetTop +
    event.offsetY -
    folderList.scrollTop;
  if (offsetTop + contextMenuEl.offsetHeight > folderList.offsetHeight + 36 - padding) {
    offsetTop -= contextMenuEl.offsetHeight;
  }
  contextMenuEl.style.top = offsetTop + "px";
  let offsetLeft = event.target.parentElement.parentElement.offsetParent.offsetLeft + event.target.offsetParent.offsetLeft + event.offsetX;
  if (offsetLeft + contextMenuEl.offsetWidth > folderList.offsetWidth - padding) {
    offsetLeft -= contextMenuEl.offsetWidth;
  }
  contextMenuEl.style.left = offsetLeft + "px";
}

/**
 * 跳转到图标对应表情文件夹
 * @param {MouseEvent} event
 */
function jumpFolder(event) {
  const id = event.target.closest(".folder-icon-item").getAttribute("data-id");
  if (!id) {
    return;
  }
  const targetItem = document.querySelector(`.folder-item[data-id="${id}"]`);
  document.querySelector(".lite-tools-local-emoticons-main .folder-list").scrollTo({
    top: targetItem.offsetTop,
  });
}

/**
 * 加载表情包列表
 * @param {Array} emoticonsList 表情包列表
 */
function appendEmoticons(newEmoticonsList) {
  log("获取到表情对象", newEmoticonsList);
  // 平铺表情对象数组
  emoticonsListArr = newEmoticonsList.flatMap((emoticons) => {
    return emoticons.list;
  });

  const folderList = document.querySelector(".lite-tools-local-emoticons-main .folder-list");
  const folderScroll = document.querySelector(".folder-icon-list .folder-scroll");
  // 插入新的表情数据
  newEmoticonsList.forEach((folder, index) => {
    const findEmoticons = folderInfos.find((item) => item.id === folder.id);
    if (findEmoticons) {
      findEmoticons.index = folder.index;
      findEmoticons.updateEmoticonList(folder.list);
      folderList.appendChild(findEmoticons.folderEl);
      folderScroll.appendChild(findEmoticons.folderIconEl);
    } else {
      const newEmoticonFolder = new emoticonFolder(folder.name, folder.list, folder.id, folder.list[0].path, folder.index, "folder");
      folderInfos.push(newEmoticonFolder);
      folderList.appendChild(newEmoticonFolder.folderEl);
      folderScroll.appendChild(newEmoticonFolder.folderIconEl);
    }
  });
  // 销毁无用实例
  const deleteEmoticon = emoticonsList.filter((item) => !newEmoticonsList.find((newItem) => newItem.id === item.id));
  deleteEmoticon.forEach((item) => {
    const deleteIndex = folderInfos.findIndex((emoticon) => emoticon.id === item.id);
    const emoticon = folderInfos.splice(deleteIndex, 1)[0];
    emoticon.destroy();
  });
  // 更新数据
  emoticonsList = newEmoticonsList;
  // 对数组进行排序
  folderInfos.sort((a, b) => a.index - b.index);
}

class emoticonFolder {
  constructor(name, list, id, iconPath, index, type) {
    // 实例属性
    this.name = name;
    this.id = id;
    this.emoticonList = [];
    this.iconPath = iconPath;
    this.index = index;
    this.type = type;

    // 实例节点
    this.folderEl;
    this.categoryNameEl;
    this.categoryListEl;
    this.categoryItemsEl = [];
    this.folderIconEl;
    this.iconEl;
    this.iconBoxEl;

    // 初始化方法
    this.createFolderEl();
    this.createIconEl();
    this.updateEmoticonList(list);
  }
  createFolderEl() {
    this.folderEl = document.createElement("div");
    this.folderEl.classList.add("folder-item");
    this.folderEl.setAttribute("data-id", this.id);
    this.folderEl.setAttribute("data-type", this.type);
    this.categoryNameEl = document.createElement("div");
    this.categoryNameEl.classList.add("category-name");
    this.categoryNameEl.innerText = this.name;
    this.categoryListEl = document.createElement("div");
    this.categoryListEl.classList.add("category-list");
    this.folderEl.append(this.categoryNameEl, this.categoryListEl);
  }
  createIconEl() {
    this.folderIconEl = document.createElement("div");
    this.folderIconEl.classList.add("folder-icon-item");
    this.folderIconEl.setAttribute("title", this.name);
    this.folderIconEl.setAttribute("data-id", this.id);
    this.iconEl = document.createElement("img");
    this.iconEl.src = this.protocolPrefix + this.iconPath;
    this.iconBoxEl = document.createElement("div");
    this.iconBoxEl.classList.add("icon-box");
    this.iconBoxEl.appendChild(this.iconEl);
    this.folderIconEl.appendChild(this.iconBoxEl);
  }
  updateEmoticonList(newEmoticonList) {
    const newListSet = new Set(newEmoticonList.map((emoticon) => emoticon.path));
    const oldListSet = new Set(this.emoticonList.map((emoticon) => emoticon.path));
    const addEmoticonList = newEmoticonList.filter((emoticon) => !oldListSet.has(emoticon.path));
    const deleteEmoticonList = this.emoticonList.filter((emoticon) => !newListSet.has(emoticon.path));
    this.emoticonList = newEmoticonList;

    if (newEmoticonList[0]) {
      this.iconEl.src = this.protocolPrefix + newEmoticonList[0].path;
    }

    deleteEmoticonList.forEach((item) => {
      const deleteIndex = this.categoryItemsEl.findIndex((El) => El.path === item.path);
      const deleteEl = this.categoryItemsEl.splice(deleteIndex, 1)[0];
      deleteEl.remove();
    });

    addEmoticonList.forEach((item) => {
      const categoryItemEl = document.createElement("div");
      categoryItemEl.classList.add("category-item");
      categoryItemEl.path = item.path;
      categoryItemEl.index = item.index;
      const skiterPreviewEl = document.createElement("div");
      skiterPreviewEl.classList.add("skiter-preview");
      const imgEl = document.createElement("img");
      imgEl.setAttribute("lazy", "");
      imgEl.src = "llqqnt://local-file/" + item.path;
      skiterPreviewEl.appendChild(imgEl);
      categoryItemEl.append(skiterPreviewEl);
      this.categoryItemsEl.splice(item.index, 0, categoryItemEl);
    });

    this.emoticonList.forEach((item) => {
      this.categoryItemsEl.find((el) => el.path === item.path).index = item.index;
    });

    this.categoryItemsEl.sort((a, b) => a.index - b.index);

    this.categoryListEl.append(...this.categoryItemsEl);
  }
  destroy() {
    log("销毁实例", this.name);
    this.folderEl.remove();
    this.categoryNameEl.remove();
    this.categoryListEl.remove();
    this.folderIconEl.remove();
    this.iconEl.remove();
    this.iconBoxEl.remove();
    this.categoryItemsEl = null;
    this.folderEl = null;
    this.categoryNameEl = null;
    this.categoryListEl = null;
    this.folderIconEl = null;
    this.iconEl = null;
    this.iconBoxEl = null;
    this.name = null;
    this.id = null;
    this.emoticonList = null;
    this.iconPath = null;
    this.type = null;
  }
  static getPath(src) {
    return src.replace(emoticonFolder.prototype.protocolPrefix, "");
  }
}
emoticonFolder.prototype.protocolPrefix = "llqqnt://local-file/";

/**
 * 打开表情包管理菜单
 */
function openLocalEmoticons() {
  if (htmlDom) {
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
