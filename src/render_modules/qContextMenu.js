// 右键菜单插入功能方法
function addQContextMenu(qContextMenu, icon, title, callback) {
  const tempEl = document.createElement("div");
  tempEl.innerHTML = document.querySelector("#qContextMenu [aria-disabled='false']").outerHTML.replace(/<!---->/g, "");
  const item = tempEl.firstChild;
  item.id = "web-search";
  if (item.querySelector(".q-icon")) {
    item.querySelector(".q-icon").innerHTML = icon;
  }
  if (item.classList.contains("q-context-menu-item__text")) {
    item.innerText = title;
  } else {
    item.querySelector(".q-context-menu-item__text").innerText = title;
  }
  item.addEventListener("click", () => {
    callback();
    qContextMenu.remove();
  });
  qContextMenu.appendChild(item);
}
// 右键菜单监听
const addEventqContextMenu = async () => {
  let selectText = "";
  let isRightClick = false;
  let imagePath = "";
  const { options } = await import("./options.js");
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const svgIconUrl = `llqqnt://local-file/${plugin_path}/src/local_file/search.svg`;
  const svg = await (await fetch(svgIconUrl)).text();
  document.addEventListener("mouseup", (event) => {
    if (event.button === 2) {
      isRightClick = true;
      selectText = window.getSelection().toString();
      let imgEl = event.target;
      if (imgEl.classList.contains("image-content") && imgEl?.src?.startsWith("appimg://")) {
        imagePath = imgEl?.src?.replace("appimg://", "");
      } else {
        imagePath = "";
      }
    } else {
      isRightClick = false;
      selectText = "";
      imagePath = "";
    }
  });
  new MutationObserver(() => {
    const qContextMenu = document.querySelector("#qContextMenu");
    // 在网页搜索
    if (qContextMenu && isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      addQContextMenu(qContextMenu, svg, "搜索", () => {
        lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
      });
    }
    if (qContextMenu && imagePath && options.imageSearch.enabled) {
      let localPath = decodeURIComponent(imagePath);
      addQContextMenu(qContextMenu, svg, "搜索图片", () => {
        const filePathArr = localPath.split("/");
        const fileName = filePathArr[filePathArr.length - 1].split(".")[0].toUpperCase().replace("_0", "");
        const picSrc = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${fileName}/0`;
        const openUrl = options.imageSearch.searchUrl.replace("%search%", picSrc);
        lite_tools.openWeb(openUrl);
      });
    }
  }).observe(document.querySelector("body"), { childList: true });
};

export { addEventqContextMenu };
