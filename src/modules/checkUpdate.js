const projectLatestUrl = "https://api.github.com/repos/xiyuesaves/LiteLoaderQQNT-lite_tools/releases/latest";

function compareVersions(currentVersion, latestVersion) {
  const currentParts = currentVersion.split(".");
  const latestParts = latestVersion.split(".");

  for (let i = 0; i < 3; i++) {
    const currentPart = parseInt(currentParts[i] || 0, 10);
    const latestPart = parseInt(latestParts[i] || 0, 10);

    if (currentPart < latestPart) {
      return true; // 当前版本低于最新版本
    } else if (currentPart > latestPart) {
      return false; // 当前版本高于最新版本
    }
    // 如果当前部分相等，继续比较下一个部分
  }

  return false; // 当前版本与最新版本相等
}

async function checkUpdate(view) {
  fetch(projectLatestUrl)
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      if (compareVersions(LiteLoader.plugins.lite_tools.manifest.version, json.tag_name)) {
        const newVersionEl = document.createElement("span");
        const aLink = document.createElement("a");
        aLink.innerText = json.tag_name;
        aLink.classList.add("link");
        aLink.addEventListener("click", () => {
          lite_tools.openWeb("https://github.com/xiyuesaves/LiteLoaderQQNT-lite_tools/releases/latest");
        });
        newVersionEl.innerText = ` 已发布新版本`;
        newVersionEl.appendChild(aLink);
        view.querySelector(".version").appendChild(newVersionEl);
      }
    })
    .catch((err) => {
      console.error("检查更新失败", err);
    });
}

export { checkUpdate };
