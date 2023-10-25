const svg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" id="图层_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;" xml:space="preserve">
<path fill="currentColor" d="M185,190H15c-8.3,0-15-6.7-15-14.9V24.9C0,16.7,6.7,10,15,10h87.7c8.3,0,15,6.7,15,14.9v13.3c0,2.8,2.2,5,5,5H185
	c8.3,0,15,6.7,15,14.9v116.9C200,183.3,193.3,190,185,190z M20,24.6c-2.6,0-4.7,2.1-4.7,4.7v141.5c0,2.6,2.1,4.7,4.7,4.7H180
	c2.6,0,4.7-2.1,4.7-4.7V60.6c0-2.6-2.1-4.7-4.7-4.7h-59.6c-7.8,0-15.1-6.3-15.1-14.1V29.3c0-2.6-2.1-4.7-4.7-4.7L20,24.6L20,24.6z"
	/>
<path fill="currentColor" d="M51.3,134.5c26.9,26.9,70.6,26.9,97.5,0c0,0,0,0,0,0c2.9-2.9,2.9-7.6,0-10.4c-2.9-2.9-7.6-2.9-10.4,0
	c-21.2,21.1-55.4,21.1-76.6,0c-2.9-2.9-7.6-2.9-10.4,0C48.4,126.9,48.4,131.6,51.3,134.5C51.3,134.5,51.3,134.5,51.3,134.5z"/>
<path fill="currentColor" d="M53.8,84.3c0,6.4,5.2,11.5,11.5,11.5s11.5-5.2,11.5-11.5c0-6.4-5.2-11.5-11.5-11.5C59,72.7,53.8,77.9,53.8,84.3L53.8,84.3z"
	/>
<path fill="currentColor" d="M123.1,84.3c0,6.4,5.2,11.5,11.5,11.5c6.4,0,11.5-5.2,11.5-11.5c0,0,0,0,0,0c0-6.4-5.2-11.5-11.5-11.5
	C128.3,72.7,123.1,77.9,123.1,84.3C123.1,84.2,123.1,84.2,123.1,84.3z"/>
</svg>`;

let barIcon;
let htmoDom;
let openFullPreview = false;
let openFullPreviewTO = null;
let showEmoticons = false;
let insertImg = true;
let ckeditorInstance;
let ckeditEditorModel;
function localEmoticons() {
  if (document.querySelector(".lite-tools-bar")) {
    return;
  }
  if (!document.querySelector(".chat-input-area .chat-func-bar .func-bar")) {
    return;
  }
  if (!ckeditEditorModel) {
    loadEditorModel();
    lite_tools.updateEmoticons((_, list) => {
      console.log("渲染端更新列表", list);
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
    icon.innerHTML = svg;
    qTooltipsContent.innerText = "本地表情";
    qTooltips.appendChild(icon);
    qTooltips.appendChild(qTooltipsContent);
    barIcon.appendChild(qTooltips);
    targetPosition.appendChild(barIcon);
    console.log("创建图标");
  } else {
    targetPosition.appendChild(barIcon);
    console.log("嵌入图标");
  }
}

function loadEditorModel() {
  console.log("尝试捕获编辑器实例");
  if (document.querySelector(".ck.ck-content.ck-editor__editable") && document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance) {
    ckeditorInstance = document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance;
    ckeditEditorModel = ckeditorInstance.model;
  } else {
    setTimeout(loadEditorModel, 100);
  }
}

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

function globalMouseDown(event) {
  if (!doesParentHaveClass(event.target, "lite-tools-bar")) {
    showEmoticons = false;
    barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
    barIcon.querySelector(".lite-tools-q-tooltips__content").classList.remove("hidden");
    return;
  }
}

function mouseDown(event) {
  if (event.button === 0 && !openFullPreview) {
    openFullPreviewTO = setTimeout(() => {
      console.log("执行延迟逻辑");
      openFullPreview = true;
      insertImg = false;
      document.querySelector(".full-screen-preview img").src = event.target.querySelector("img").src;
      document.querySelector(".full-screen-preview").classList.add("show");
    }, 500);
  }
}

function mouseEnter(event) {
  if (openFullPreview) {
    const showImg = document.querySelector(".full-screen-preview img");
    if (showImg.src !== event.target.querySelector("img").src) {
      showImg.src = event.target.querySelector("img").src;
    }
  }
}

function insert(event) {
  if (!insertImg) {
    return;
  }
  const selection = ckeditEditorModel.document.selection;
  const position = selection.getFirstPosition();
  // 操作输入框代码参考：https://github.com/Night-stars-1/LiteLoaderQQNT-Plugin-LLAPI/blob/4ef44f7010d0150c3577d664b9945af62a7bc54b/src/renderer.js#L208C5-L208C15
  const src = decodeURIComponent(event.target.querySelector("img").src.replace("llqqnt://local-file/", "").replace(/\//g, "\\"));
  if (ckeditEditorModel) {
    ckeditEditorModel.change((writer) => {
      const writerEl = writer.createElement("msg-img", { data: JSON.stringify({ type: "pic", src, picSubType: 0 }) });
      writer.insert(writerEl, position);
    });
    showEmoticons = false;
    barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
  }
}

async function loadDom() {
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const domUrl = `llqqnt://local-file/${plugin_path}/src/config/localEmoticons.html`;
  const html_text = await (await fetch(domUrl)).text();
  const parser = new DOMParser();
  htmoDom = parser.parseFromString(html_text, "text/html");
  htmoDom.querySelectorAll("section").forEach((el) => {
    barIcon.appendChild(el);
  });
  const emoticonsMain = barIcon.querySelector(".lite-tools-local-emoticons-main");
  // 这里加载本地表情包

  const emoticonsList = await lite_tools.getLocalEmoticonsList();
  appendEmoticons(emoticonsList);
  // 处理表情包监听事件逻辑
  emoticonsMain.addEventListener("mousedown", (event) => {
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      mouseDown(event);
    }
  });
  emoticonsMain.addEventListener("mousemove", (event) => {
    console.log("mover");
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      mouseEnter(event);
    }
  });
  emoticonsMain.addEventListener("click", (event) => {
    if (doesParentHaveClass(event.target, "category-item", "lite-tools-local-emoticons-main")) {
      insert(event);
    }
  });
}

// 判断父元素是否包含指定类名
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

function appendEmoticons(emoticonsList) {
  document.querySelectorAll(".folder-item").forEach((item) => {
    item.remove();
  });
  emoticonsList.forEach((folder) => {
    const folderEl = document.createElement("div");
    folderEl.classList.add("folder-item");
    const categoryName = document.createElement("div");
    categoryName.classList.add("category-name");
    categoryName.innerText = folder.name;
    const categoryList = document.createElement("div");
    categoryList.classList.add("category-list");
    folder.list.forEach((item) => {
      const categoryItem = document.createElement("div");
      categoryItem.classList.add("category-item");
      const skiterPreview = document.createElement("div");
      skiterPreview.classList.add("skiter-preview");
      const img = document.createElement("img");
      img.src = "llqqnt://local-file/" + item.path;
      skiterPreview.appendChild(img);
      categoryItem.append(skiterPreview);
      categoryList.appendChild(categoryItem);
    });
    folderEl.append(categoryName, categoryList);
    document.querySelector(".lite-tools-local-emoticons-main .folder-list").appendChild(folderEl);
  });
}

function openLocalEmoticons() {
  console.log("打开表情管理菜单");
  if (htmoDom) {
    if (showEmoticons) {
      showEmoticons = false;
      barIcon.querySelector(".lite-tools-local-emoticons-main").classList.remove("show");
      barIcon.querySelector(".lite-tools-q-tooltips__content").classList.remove("hidden");
    } else {
      showEmoticons = true;
      barIcon.querySelector(".lite-tools-local-emoticons-main").classList.add("show");
      barIcon.querySelector(".lite-tools-q-tooltips__content").classList.add("hidden");
    }
  } else {
    console.log("表情菜单还没有加载完成");
  }
}

window.localEmoticons = localEmoticons;
window.loadDom = loadDom;

export { localEmoticons };
