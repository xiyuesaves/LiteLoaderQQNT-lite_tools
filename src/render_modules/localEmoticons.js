let svg;
(async () => {
  const plugin_path = LiteLoader.plugins.lite_tools.path.plugin;
  const svgIconUrl = `llqqnt://local-file/${plugin_path}/src/local_file/localEmoticons.svg`;
  svg = await (await fetch(svgIconUrl)).text();
})();

function localEmoticons() {
  if (document.querySelector(".lite-tools-bar")) {
    return;
  }
  if (!document.querySelector(".chat-input-area .chat-func-bar .func-bar")) {
    return;
  }
  console.log("本地表情包模块执行", new Date().toLocaleString());

  const barIcon = document.createElement("div");
  barIcon.classList.add("lite-tools-bar");
  const qTooltips = document.createElement("div");
  qTooltips.classList.add("lite-tools-q-tooltips");
  const qTooltipsContent = document.createElement("div");
  qTooltipsContent.classList.add("lite-tools-q-tooltips__content");
  const icon = document.createElement("i");
  icon.classList.add("lite-tools-q-icon");
  icon.innerHTML = svg;
  qTooltipsContent.innerText = "本地表情";
  qTooltips.appendChild(icon);
  qTooltips.appendChild(qTooltipsContent);
  barIcon.appendChild(qTooltips);
  document.querySelector(".chat-input-area .chat-func-bar .func-bar").appendChild(barIcon);
  console.log("嵌入图标完成");
}

window.localEmoticons = localEmoticons;

export { localEmoticons };
