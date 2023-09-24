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
const addEventqContextMenu = async (options) => {
  let selectText = "";
  let isRightClick = false;
  let imagePath = "";
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
    console.log(options)
    const qContextMenu = document.querySelector("#qContextMenu");
    // 在网页搜索
    if (qContextMenu && isRightClick && selectText.length && options.wordSearch.enabled) {
      const searchText = selectText;
      addQContextMenu(
        qContextMenu,
        '<svg t="1691607468711" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4164" width="200" height="200"><path d="M425.75644445 819.2C211.51288889 819.2 37.09155555 644.89244445 37.09155555 430.53511111c0-214.24355555 174.30755555-388.55111111 388.55111112-388.55111111s388.55111111 174.30755555 388.55111111 388.55111111C814.30755555 644.89244445 640 819.2 425.75644445 819.2z m0-709.06311111c-176.69688889 0-320.39822222 143.70133333-320.39822223 320.39822222S249.05955555 750.93333333 425.75644445 750.93333333s320.39822222-143.70133333 320.39822222-320.39822222-143.70133333-320.39822222-320.39822222-320.39822222z" fill="currentColor" p-id="4165"></path><path d="M828.64355555 900.096c-10.46755555 0-20.93511111-3.98222222-28.89955555-11.94666667L656.49777778 744.90311111c-15.92888889-15.92888889-15.92888889-41.87022222 0-57.91288889 15.92888889-15.92888889 41.87022222-15.92888889 57.91288889 0l143.24622222 143.24622223c15.92888889 15.92888889 15.92888889 41.87022222 0 57.91288888-8.07822222 7.96444445-18.54577778 11.94666667-29.01333334 11.94666667z" fill="currentColor" p-id="4166"></path></svg>',
        "搜索",
        () => {
          lite_tools.openWeb(options.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
        }
      );
    }
    if (qContextMenu && imagePath && options.imageSearch.enabled) {
      let localPath = decodeURIComponent(imagePath);
      addQContextMenu(
        qContextMenu,
        '<svg t="1691607468711" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4164" width="200" height="200"><path d="M425.75644445 819.2C211.51288889 819.2 37.09155555 644.89244445 37.09155555 430.53511111c0-214.24355555 174.30755555-388.55111111 388.55111112-388.55111111s388.55111111 174.30755555 388.55111111 388.55111111C814.30755555 644.89244445 640 819.2 425.75644445 819.2z m0-709.06311111c-176.69688889 0-320.39822222 143.70133333-320.39822223 320.39822222S249.05955555 750.93333333 425.75644445 750.93333333s320.39822222-143.70133333 320.39822222-320.39822222-143.70133333-320.39822222-320.39822222-320.39822222z" fill="currentColor" p-id="4165"></path><path d="M828.64355555 900.096c-10.46755555 0-20.93511111-3.98222222-28.89955555-11.94666667L656.49777778 744.90311111c-15.92888889-15.92888889-15.92888889-41.87022222 0-57.91288889 15.92888889-15.92888889 41.87022222-15.92888889 57.91288889 0l143.24622222 143.24622223c15.92888889 15.92888889 15.92888889 41.87022222 0 57.91288888-8.07822222 7.96444445-18.54577778 11.94666667-29.01333334 11.94666667z" fill="currentColor" p-id="4166"></path></svg>',
        "搜索图片",
        () => {
          const filePathArr = localPath.split("/");
          const fileName = filePathArr[filePathArr.length - 1].split(".")[0].toUpperCase().replace("_0", "");
          const picSrc = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${fileName}/0`;
          const openUrl = options.imageSearch.searchUrl.replace("%search%", picSrc);
          lite_tools.openWeb(openUrl);
        }
      );
    }
  }).observe(document.querySelector("body"), { childList: true });
};

export { addEventqContextMenu };
