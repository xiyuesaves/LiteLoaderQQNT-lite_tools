import { options, updateOptions } from "./options.js";
import { localEmoticonsHTML } from "./HTMLtemplate.js";
import { debounce } from "./debounce.js";
import { Logs } from "./logs.js";
import { localEmoticonsIcon } from "./svg.js";
import { sendMessage } from "./nativeCall.js";
import { first } from "./first.js";
import { getPeer } from "./curAioData.js";
import { showToast } from "./toast.js";
const log = new Logs("本地表情包模块");
/**
 * 图标元素
 * @type {Element}
 */
const barIcon = initBarIcon();
/**
 * 主要元素
 */
const { folderListEl, folderIconListEl, commonlyEmoticonsPanelEl } = loadDom();
/**
 * 快速选择表情元素
 */
const { quickPreviewEl, previewListEl, previewListScroll } = initQuickPreview();
/**
 * 是否处于全屏预览状态
 * @type {Boolean}
 */
let openFullPreview = false;
/**
 * 进入全屏状态计时器编号
 * @type {timeoutID}
 */
let openFullPreviewTO = null;
/**
 * 是否打开表情窗口
 * @type {Boolean}
 */
let showEmoticons = false;
/**
 * 是否执行插入函数
 * @type {Boolean}
 */
let insertImg = true;
/**
 * 表情实例数组
 * @type {Array}
 */
let folderInfos = [];
/**
 * 表情列表数组，储存的是所有表情的平铺数据
 * @type {Array}
 */
let emoticonsListArr = [];
/**
 * 获取到的原始表情列表数据
 * @type {Array}
 */
let emoticonsList = [];
/**
 * 快速插入表情功能使用到的数组
 * @type {Array}
 */
let forList = [];
/**
 * 正则匹配到的需要删除的文本内容
 * @type {String}
 */
let regOut;
/**
 * 编辑器实例
 * @type {Object}
 */
let ckeditorInstance;
/**
 * 编辑器实例属性 model
 * @type {Object}
 */
let ckeditEditorModel;
/**
 * 右键菜单状态
 * @type {Boolean}
 */
let showContextMenu = false;
/**
 * 右键点击的图片元素
 * @type {Element}
 */
let targetElement;
/**
 * 常用表情分类实例
 * @type {Object}
 */
let commonlyEmoticons;
/**
 * 鼠标移入本地表情图标的延迟等待id
 * @type {timeoutID}
 */
let mouseEnterEventTimeOut;

const commonlyId = "commonlyEmoticons";

document.body.classList.toggle("lite-tools-showLocalEmoticons", options.localEmoticons.enabled);

updateOptions(async (opt) => {
  log("更新配置", opt);
  document.body.classList.toggle("lite-tools-showLocalEmoticons", opt.localEmoticons.enabled);
  if (opt.localEmoticons.enabled) {
    localEmoticons();
    folderListEl.setAttribute("style", `--category-item-size: ${(folderListEl.offsetWidth - 12) / opt.localEmoticons.rowsSize}px;`);
    if (options.localEmoticons.toLeftSlot) {
      const targetPosition = document.querySelector(".chat-input-area .chat-func-bar .func-bar:first-child");
      barIcon.classList.add("position-left");
      targetPosition?.insertAdjacentElement("afterbegin", barIcon);
    } else {
      const targetPosition = document.querySelector(".chat-input-area .chat-func-bar .func-bar:last-child");
      barIcon.classList.remove("position-left");
      targetPosition?.appendChild(barIcon);
    }
    if (opt.localEmoticons.commonlyEmoticons) {
      const config = await lite_tools.getLocalEmoticonsConfig();
      const list = config.commonlyEmoticons.map((path, index) => ({ path, index }));
      if (commonlyEmoticons && list.length) {
        commonlyEmoticons.updateEmoticonList(list);
      } else if (!commonlyEmoticons && list.length) {
        commonlyEmoticons = new emoticonFolder("历史表情", list, commonlyId, list[0].path, -1, "commonly");
        folderInfos.unshift(commonlyEmoticons);
        folderListEl.insertBefore(commonlyEmoticons.folderEl, folderListEl.querySelector(":first-child"));
        folderIconListEl.insertBefore(commonlyEmoticons.folderIconEl, folderIconListEl.querySelector(":first-child"));
        commonlyEmoticons.load();
      }
    } else if (commonlyEmoticons) {
      log("销毁历史表情实例", commonlyEmoticons.id);
      folderInfos.shift();
      commonlyEmoticons.destroy();
      commonlyEmoticons = null;
    }
  }
});

/**
 * 更新常用表情列表
 * @param {Array} list 常用表情列表
 */
function updateLocalEmoticonsConfig(_, config) {
  const list = config.commonlyEmoticons.map((path, index) => ({ path, index }));
  if (commonlyEmoticons) {
    if (list.length) {
      log("更新常用表情列表", list);
      commonlyEmoticons.updateEmoticonList(list);
    } else {
      log("销毁历史表情实例", commonlyEmoticons.id);
      folderInfos.shift();
      commonlyEmoticons.destroy();
      commonlyEmoticons = null;
    }
  } else if (!commonlyEmoticons && options.localEmoticons.commonlyEmoticons) {
    commonlyEmoticons = new emoticonFolder("历史表情", list, commonlyId, list[0].path, -1, "commonly");
    folderInfos.unshift(commonlyEmoticons);
    folderListEl.insertBefore(commonlyEmoticons.folderEl, folderListEl.querySelector(":first-child"));
    folderIconListEl.insertBefore(commonlyEmoticons.folderIconEl, folderIconListEl.querySelector(":first-child"));
    commonlyEmoticons.load();
  }
}

log("模块已加载");

// 自执行函数
async function init() {
  document.body.addEventListener("mouseup", globalMouseUp);
  document.body.addEventListener("mouseleave", globalMouseUp);
  document.body.addEventListener("mousedown", globalMouseDown);
  lite_tools.updateLocalEmoticonsConfig(updateLocalEmoticonsConfig);
  lite_tools.updateEmoticons(appendEmoticons);
  loadEditorModel();

  // 加载本地表情包
  const emoticonsList = await lite_tools.getLocalEmoticonsList();
  appendEmoticons(null, emoticonsList);

  // 初始化常用表情
  if (options.localEmoticons.commonlyEmoticons) {
    const config = await lite_tools.getLocalEmoticonsConfig();
    const list = config.commonlyEmoticons.map((path, index) => ({ path, index }));
    if (list.length && !commonlyEmoticons) {
      commonlyEmoticons = new emoticonFolder("历史表情", list, commonlyId, list[0].path, -1, "commonly");
      folderInfos.unshift(commonlyEmoticons);
      folderListEl.insertBefore(commonlyEmoticons.folderEl, folderListEl.querySelector(":first-child"));
      folderIconListEl.insertBefore(commonlyEmoticons.folderIconEl, folderIconListEl.querySelector(":first-child"));
    }
  }
}
// 错开CPU高占用阶段
setTimeout(init, 500);

/**
 * 初始化本地表情包功能
 */
async function localEmoticons() {
  // 初始化表情图片大小
  folderListEl.setAttribute("style", `--category-item-size: ${(folderListEl.offsetWidth - 12) / options.localEmoticons.rowsSize}px;`);

  // 插入主要本地表情元素
  if (!document.querySelector(".lite-tools-bar")) {
    if (options.localEmoticons.toLeftSlot) {
      const targetPosition = document.querySelector(".chat-input-area .chat-func-bar .func-bar:first-child");
      barIcon.classList.add("position-left");
      targetPosition?.insertAdjacentElement("afterbegin", barIcon);
    } else {
      const targetPosition = document.querySelector(".chat-input-area .chat-func-bar .func-bar:last-child");
      targetPosition?.appendChild(barIcon);
    }
  }

  // 插入快速选择表情元素
  if (!document.querySelector(".lite-tools-sticker-bar")) {
    const chatMessagePosition = document.querySelector(".expression-bar .sticker-wrapper.expression-bar-inner");
    chatMessagePosition?.appendChild(quickPreviewEl);
  }

  if (document.querySelector(".expression-bar") && first("expression-bar")) {
    // 监听窗口宽度变化
    const resizeObserver = new ResizeObserver(changeListSize);
    resizeObserver.observe(document.querySelector(".expression-bar"));
  }
}

/**
 * 捕获编辑器实例
 */
function loadEditorModel() {
  if (document.querySelector(".ck.ck-content.ck-editor__editable")?.ckeditorInstance) {
    log("获取到编辑器实例");
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
    quickPreviewEl?.classList?.remove("show");
    return;
  }

  const msg = ckeditorInstance.getData();
  const msgArr = msg.split("<p>");
  const lastStr = msgArr[msgArr.length - 1];
  const quickEmoticonsActiveKey = options.localEmoticons.quickEmoticonsActiveKey.replace("\\", "\\\\");
  const regExp = new RegExp(`${quickEmoticonsActiveKey}([^${quickEmoticonsActiveKey}]*)(?=$)`);
  regOut = lastStr.replace(/<[^>]+>/g, "").match(regExp);
  let filterEmocicons = [];
  if (regOut) {
    let emoticonsName = regOut[0].slice(1);
    filterEmocicons = emoticonsListArr.filter((emoticons) => emoticons.name.includes(emoticonsName));
  }
  // 判断输入框最后5个字符是否匹配激活关键字
  if (lastStr.slice(-5) === `${quickEmoticonsActiveKey}</p>` || filterEmocicons.length) {
    if (!quickPreviewEl.classList.contains("show")) {
      quickPreviewEl.classList.add("show");
    }
    if (options.localEmoticons.quickEmoticonsAutoInputOnlyOne === true && filterEmocicons.length === 1) {
      insertToEditor(filterEmocicons[0].path);
      return;
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
    const previewItems = [];
    for (let i = 0; i < forList.length; i++) {
      const previewItem = document.createElement("div");
      previewItem.classList.add("preview-item");
      const stickerPreview = document.createElement("div");
      stickerPreview.classList.add("sticker-preview");
      const img = document.createElement("img");
      if (options.localEmoticons.majorization) {
        img.setAttribute("data-src", `local:///${forList[i].path}`);
      } else {
        img.src = `local:///${forList[i].path}`;
      }
      stickerPreview.appendChild(img);
      previewItem.appendChild(stickerPreview);
      previewItems.push(previewItem);
    }
    previewListEl.append(...previewItems);
    previewListEl.scrollTop = 0;
    previewListScroll({ target: previewListEl });
  } else {
    quickPreviewEl?.classList?.remove("show");
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
    closeLocalEmoticons();
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
 * @param {MouseEvent} src 表情包路径
 * @param {Boolean} altKey 是否按下alt键
 * @param {Boolean} ctrlKey 是否按下ctrl键
 * @returns
 */
function insertToEditor(src, altKey = false, ctrlKey = false) {
  if (!insertImg) {
    return;
  }
  // 操作输入框代码参考：https://github.com/Night-stars-1/LiteLoaderQQNT-Plugin-LLAPI/blob/4ef44f7010d0150c3577d664b9945af62a7bc54b/src/renderer.js#L208C5-L208C15
  if (ckeditEditorModel) {
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
    // 以表情包模式发送
    let picSubType = 1;
    // 以图片形式发送
    if (options.localEmoticons.sendBigImage) {
      picSubType = 0;
    }
    if (altKey) {
      const peer = getPeer();
      log("直接发送图片", peer);
      if (peer) {
        sendMessage(peer, [{ type: "image", path: src, picSubType }]);
      } else {
        showToast("发送失败", "error");
      }
    } else {
      const selection = ckeditEditorModel.document.selection;
      const position = selection.getFirstPosition();
      ckeditEditorModel.change((writer) => {
        writer.setSelection(writer.createPositionAt(ckeditEditorModel.document.getRoot(), "end"));
        // 插入表情
        const writerEl = writer.createElement("msg-img", { data: JSON.stringify({ type: "pic", src, picSubType }) });
        writer.insert(writerEl, position);
      });
    }

    showEmoticons = false;
    // 如果按下了ctrl键，则不关闭窗口面板
    if (!ctrlKey) {
      closeLocalEmoticons();
      closeCommonlyEmoticonsPanel();
    }
  }
}

/**
 * 插入表情包到编辑器
 * @param {MouseEvent} event
 * @returns
 */
function insert(event) {
  insertToEditor(decodeURI(event.target.querySelector("img").src.replace("local:///", "")), event.altKey, event.ctrlKey);
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
    previewListScroll({ target: previewListEl });
  }
}

/**
 * 初始化图标
 * @returns {Element}
 */
function initBarIcon() {
  const qTooltips = document.createElement("div");
  const qTooltipsContent = document.createElement("div");
  const icon = document.createElement("i");
  const barIcon = document.createElement("div");

  barIcon.classList.add("lite-tools-bar");
  barIcon.appendChild(qTooltips);

  qTooltips.classList.add("lite-tools-q-tooltips");
  qTooltips.addEventListener("click", openLocalEmoticons);
  barIcon.addEventListener("mouseenter", handleMouseEvents);
  barIcon.addEventListener("mouseleave", handleMouseEvents);
  qTooltips.appendChild(icon);
  qTooltips.appendChild(qTooltipsContent);

  qTooltipsContent.classList.add("lite-tools-q-tooltips__content");
  qTooltipsContent.innerText = "本地表情";

  icon.classList.add("lite-tools-q-icon");
  icon.innerHTML = localEmoticonsIcon;

  return barIcon;
}

/**
 * 本地表情主窗口元素
 * @typedef {Object} EmoticonsMainElements
 * @property {Element} emoticonsMainEl - 主窗口元素
 * @property {Element} folderListEl - 文件夹列表元素
 * @property {Element} folderIconListEl - 文件夹图标列表元素
 */

/**
 * 加载DOM元素
 * @function
 * @returns {EmoticonsMainElements} 包含本地表情主窗口相关元素的对象
 */
function loadDom() {
  log("开始加载dom");
  barIcon.insertAdjacentHTML("beforeend", localEmoticonsHTML);

  /**
   * 常用表情悬浮显示菜单
   * @type {Element}
   */
  const commonlyEmoticonsPanelEl = barIcon.querySelector(".commonly-emoticons-panel");

  /**
   * 本地表情面板
   * @type {Element}
   */
  const emoticonsMainEl = barIcon.querySelector(".lite-tools-local-emoticons-main");

  /**
   * 表情文件夹列表
   * @type {Element}
   */
  const folderListEl = barIcon.querySelector(".folder-list");

  /**
   * 表情文件夹图标列表
   * @type {Element}
   */
  const folderIconListEl = barIcon.querySelector(".folder-icon-list .folder-scroll");

  // 防抖监听滚动事件
  const debounceScroll = debounce((event) => {
    // 显示区域高度
    const viewHeight = document.querySelector(".lite-tools-local-emoticons-main .folder-list").offsetHeight;
    // 当前表情文件夹的底部坐标
    let folderOffsetBottom = 0;
    let isActive = false;
    const scrollTop = event.target.scrollTop;
    const scrollBottom = scrollTop + viewHeight;
    for (let i = 0; i < folderInfos.length; i++) {
      const folder = folderInfos[i];
      const folderOffsetTop = folderOffsetBottom;
      folderOffsetBottom += folder.folderEl.offsetHeight;

      // 判断是否需要加载表情符号的条件
      const shouldLoadEmoticons =
        (folderOffsetBottom >= scrollTop && folderOffsetTop <= scrollTop) ||
        (folderOffsetTop <= scrollBottom && folderOffsetBottom >= scrollBottom) ||
        (folderOffsetTop >= scrollTop && folderOffsetBottom <= scrollBottom);

      // 判断表情包是否需要加载
      if (shouldLoadEmoticons && options.localEmoticons.majorization) {
        const activeEl = document.querySelector(`.folder-icon-item[data-id="${folder.id}"]`);
        activeEl.emoticonFolder.load();
      }
      // 激活距离顶部最近的表情文件夹图标
      if (folderOffsetBottom >= scrollTop + 4 && !isActive) {
        document.querySelector(".folder-icon-item.active")?.classList?.remove("active");
        const activeEl = document.querySelector(`.folder-icon-item[data-id="${folder.id}"]`);
        const folderScroll = document.querySelector(".folder-scroll");
        activeEl.classList.add("active");
        folderScroll.scrollTo({
          top: activeEl.offsetTop - folderScroll.offsetHeight / 2,
          behavior: "smooth",
        });
        isActive = true;
      }
    }
  }, 10);

  // 监听列表滚动
  folderListEl.addEventListener("scroll", debounceScroll);

  // 处理鼠标相关事件
  emoticonsMainEl.addEventListener("mousedown", emoticonsMousedown);
  commonlyEmoticonsPanelEl.addEventListener("mousedown", emoticonsMousedown);
  function emoticonsMousedown(event) {
    if (event.target.closest(".category-item")) {
      if (event.button === 0) {
        mouseDown(event);
      } else if (event.button === 2 && event.target.closest(".lite-tools-local-emoticons-main")) {
        contextMenu(event);
      }
    }
  }
  emoticonsMainEl.addEventListener("mousemove", emoticonsMousemove);
  commonlyEmoticonsPanelEl.addEventListener("mousemove", emoticonsMousemove);
  function emoticonsMousemove(event) {
    if (event.target.closest(".category-item")) {
      mouseEnter(event);
    }
  }
  emoticonsMainEl.addEventListener("click", clickEmoticons);
  commonlyEmoticonsPanelEl.addEventListener("click", clickEmoticons);
  function clickEmoticons(event) {
    if (event.target.closest(".category-item")) {
      insert(event);
    } else if (event.target.closest(".folder-icon-item")) {
      jumpFolder(event);
    }
  }

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
  contextMenuEl.querySelector(".delete-file").addEventListener("click", async (event) => {
    log("从文件中删除", targetElement.path);
    const res = await lite_tools.deleteEmoticonsFile(targetElement.path);
    log("删除结果", res);
    if (res.success) {
      showToast(res.msg, "success", 3000);
    } else {
      showToast(res.msg, "error", 3000);
    }
    closeContextMenu();
  });

  // 设置默认每行显示数量
  folderListEl.setAttribute("style", `--category-item-size: ${(folderListEl.offsetWidth - 12) / options.localEmoticons.rowsSize}px;`);

  return { emoticonsMainEl, folderListEl, folderIconListEl, commonlyEmoticonsPanelEl };
}

/**
 * 快捷选择表情元素
 * @typedef {Object} InitQuickPreviewElements
 * @property {Element} quickPreviewEl - 悬浮托盘元素
 * @property {Element} previewListEl - 表情列表元素
 */

/**
 * 初始化快捷表情元素
 * @function
 * @returns {InitQuickPreviewElements} 包含快捷输入表情元素的对象
 */
function initQuickPreview() {
  const quickPreviewEl = document.createElement("div");
  const previewListEl = document.createElement("div");
  previewListEl.classList.add("preview-list");
  quickPreviewEl.classList.add("lite-tools-sticker-bar");
  quickPreviewEl.appendChild(previewListEl);

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

  const previewListScroll = debounce((event) => {
    log("快捷预览窗口滚动", event.target.scrollTop);
    if (options.localEmoticons.majorization) {
      const listItemHeight = 80;
      const startTop = event.target.scrollTop;
      const endBottom = startTop + event.target.offsetHeight;
      const startNum = parseInt(startTop / listItemHeight);
      const endNum = Math.ceil((endBottom - startTop) / listItemHeight) + 1;
      for (let i = 0; i < endNum; i++) {
        const index = i + startNum + 1;
        const prevItemImg = event.target.querySelector(`.preview-item:nth-child(${index}) img`);
        if (prevItemImg && !prevItemImg.src) {
          prevItemImg.src = prevItemImg.getAttribute("data-src");
        }
      }
    }
  }, 10);

  previewListEl.addEventListener("scroll", previewListScroll);

  return { quickPreviewEl, previewListEl, previewListScroll };
}

/**
 * 关闭右键菜单
 */
function closeContextMenu() {
  showContextMenu = false;
  barIcon.querySelector(".sticker-preview.active")?.classList?.remove("active");
  barIcon.querySelector(".lite-tools-local-emoticons-main")?.classList?.remove("show-menu");
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
 * @param {Null} _ 无用字段
 * @param {Array} newEmoticonsList 表情包列表
 */
function appendEmoticons(_, newEmoticonsList) {
  log("获取到表情对象", newEmoticonsList);
  // 平铺表情对象数组
  emoticonsListArr = newEmoticonsList.flatMap((emoticons) => {
    return emoticons.list;
  });

  // 插入新的表情数据
  newEmoticonsList.forEach((folder, index) => {
    const findEmoticons = folderInfos.find((item) => item.id === folder.id);
    if (findEmoticons) {
      findEmoticons.index = folder.index;
      findEmoticons.updateEmoticonList(folder.list);
      folderListEl.appendChild(findEmoticons.folderEl);
      folderIconListEl.appendChild(findEmoticons.folderIconEl);
    } else {
      const newEmoticonFolder = new emoticonFolder(folder.name, folder.list, folder.id, folder.list[0].path, folder.index, "folder");
      folderInfos.push(newEmoticonFolder);
      folderListEl.appendChild(newEmoticonFolder.folderEl);
      folderIconListEl.appendChild(newEmoticonFolder.folderIconEl);
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
    this.isLoad = false;

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
    this.folderIconEl.emoticonFolder = this;
  }
  load() {
    if (!this.isLoad) {
      log("加载实例", this.name);
      this.isLoad = true;
      this.categoryItemsEl.forEach((categoryItemEl) => {
        categoryItemEl.imgEl.src = this.protocolPrefix + categoryItemEl.path;
      });
    }
  }
  unLoad() {
    if (this.isLoad) {
      log("卸载实例", this.name);
      this.isLoad = false;
      this.categoryItemsEl.forEach((categoryItemEl) => {
        categoryItemEl.imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      });
    }
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
      skiterPreviewEl.classList.add("sticker-preview");
      const imgEl = document.createElement("img");
      categoryItemEl.imgEl = imgEl;
      if (this.isLoad) {
        imgEl.src = this.protocolPrefix + categoryItemEl.path;
      }
      skiterPreviewEl.appendChild(imgEl);
      categoryItemEl.append(skiterPreviewEl);
      this.categoryItemsEl.splice(item.index, 0, categoryItemEl);
    });

    this.emoticonList.forEach((item) => {
      this.categoryItemsEl.find((el) => el.path === item.path).index = item.index;
    });

    this.categoryItemsEl.sort((a, b) => a.index - b.index);

    this.categoryListEl.append(...this.categoryItemsEl);

    // 如果没有开启内存优化或者本地表情窗口处于打开状态，则初始化时就加载该实例
    if (!options.localEmoticons.majorization || showEmoticons) {
      this.load();
    }
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
emoticonFolder.prototype.protocolPrefix = "local:///";

/**
 * 打开表情包管理菜单
 */
function openLocalEmoticons() {
  if (showEmoticons) {
    closeLocalEmoticons();
  } else {
    showLocalEmoticons();
  }
}

/**
 * 监听移入移出事件
 * @param {MouseEvent} event 鼠标事件
 */
function handleMouseEvents(event) {
  if (options.localEmoticons.hoverShowCommonlyEmoticons && commonlyEmoticons) {
    clearTimeout(mouseEnterEventTimeOut);
    const delayTime = 300;
    mouseEnterEventTimeOut = setTimeout(() => {
      if (event.type === "mouseenter") {
        showCommonlyEmoticonsPanel();
      } else if (event.type === "mouseleave") {
        closeCommonlyEmoticonsPanel();
      }
    }, delayTime);
  }
}

/**
 * 显示常用表情面板
 */
function showCommonlyEmoticonsPanel() {
  if (showEmoticons || !commonlyEmoticons) {
    return;
  }
  commonlyEmoticons.load();
  commonlyEmoticonsPanelEl.classList.add("show");
  const commonlyListEl = commonlyEmoticonsPanelEl.querySelector(".folder-list-commonly");
  commonlyListEl.setAttribute(
    "style",
    `--category-item-size: ${(commonlyEmoticonsPanelEl.offsetWidth - 12) / options.localEmoticons.rowsSize}px;`,
  );
  commonlyListEl.appendChild(commonlyEmoticons.folderEl);
}

/**
 * 关闭常用表情面板
 */
function closeCommonlyEmoticonsPanel(immediately = false) {
  if (showEmoticons || !commonlyEmoticons) {
    return;
  }
  if (immediately) {
    folderListEl.insertBefore(commonlyEmoticons.folderEl, folderListEl.querySelector(":first-child"));
  } else if (commonlyEmoticonsPanelEl.classList.contains("show")) {
    commonlyEmoticonsPanelEl.addEventListener(
      "transitionend",
      () => {
        if (!commonlyEmoticonsPanelEl.classList.contains("show")) {
          commonlyEmoticons.unLoad();
          folderListEl.insertBefore(commonlyEmoticons.folderEl, folderListEl.querySelector(":first-child"));
        }
      },
      { once: true },
    );
  }
  commonlyEmoticonsPanelEl.classList.remove("show");
}

/**
 * 打开本地表情窗口
 */
function showLocalEmoticons() {
  closeCommonlyEmoticonsPanel(true);
  showEmoticons = true;
  document.querySelector(".folder-list").scrollTop = 0;
  // 创建一个滚动事件
  const event = new Event("scroll");
  // 触发滚动事件
  document.querySelector(".folder-list").dispatchEvent(event);
  barIcon.querySelector(".lite-tools-local-emoticons-main").classList.add("show");
  if (!options.localEmoticons.majorization) {
    folderInfos.forEach((folderInfo) => {
      folderInfo.load();
    });
  }
}

/**
 * 关闭本地表情窗口
 */
function closeLocalEmoticons() {
  showEmoticons = false;
  const localEmoticonsEl = barIcon.querySelector(".lite-tools-local-emoticons-main");
  if (localEmoticonsEl.classList.contains("show")) {
    localEmoticonsEl.addEventListener(
      "transitionend",
      () => {
        if (!localEmoticonsEl.classList.contains("show") && options.localEmoticons.majorization) {
          folderInfos.forEach((folderInfo) => {
            folderInfo.unLoad();
          });
        }
      },
      { once: true },
    );
  }
  localEmoticonsEl.classList.remove("show");
}

export { localEmoticons, emoticonsList };
