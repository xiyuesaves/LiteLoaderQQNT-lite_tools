const svg = `<svg t="1698129556991" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13011" width="22" height="22"><path d="M640 970.666667H384c-231.765333 0-330.666667-98.901333-330.666667-330.666667V384c0-231.765333 98.901333-330.666667 330.666667-330.666667h256c231.765333 0 330.666667 98.901333 330.666667 330.666667v256c0 231.765333-98.901333 330.666667-330.666667 330.666667z m-256-853.333334C187.136 117.333333 117.333333 187.136 117.333333 384v256c0 196.864 69.802667 266.666667 266.666667 266.666667h256c196.864 0 266.666667-69.802667 266.666667-266.666667V384c0-196.864-69.76-266.666667-266.666667-266.666667z" fill="currentColor" p-id="13012"></path><path d="M661.333333 448a96 96 0 1 1 96-96 96.128 96.128 0 0 1-96 96z m0-128a32 32 0 1 0 32 32 32.042667 32.042667 0 0 0-32-32zM362.666667 448a96 96 0 1 1 96-96A96.128 96.128 0 0 1 362.666667 448z m0-128a32 32 0 1 0 32 32 32.042667 32.042667 0 0 0-32-32zM512 829.866667a224.256 224.256 0 0 1-224-224 70.485333 70.485333 0 0 1 70.4-70.4h307.2a70.485333 70.485333 0 0 1 70.4 70.4A224.298667 224.298667 0 0 1 512 829.866667z m-153.6-230.4a6.528 6.528 0 0 0-6.4 6.4 160 160 0 1 0 320 0 6.570667 6.570667 0 0 0-6.4-6.4z" fill="currentColor" p-id="13013"></path></svg>`

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
