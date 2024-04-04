const projectLatestUrl = "https://api.github.com/repos/xiyuesaves/LiteLoaderQQNT-lite_tools/releases/latest";
import { Logs } from "./logs.js";
const log = new Logs("检查更新模块");
/**
 * 对比版本号
 * @param {String} currentVersion 当前版本
 * @param {String} latestVersion 最新版本
 * @returns
 */
function compareVersions(currentVersion, latestVersion) {
  const currentParts = currentVersion.replace("v", "").split(".");
  const latestParts = latestVersion.replace("v", "").split(".");

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

/**
 * 检测更新
 * @param {Element} view 插件设置界面容器
 */
async function checkUpdate(view) {
  fetch(projectLatestUrl)
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      if (compareVersions(LiteLoader.plugins.lite_tools.manifest.version, json.tag_name)) {
        const newVersionEl = document.createElement("span");
        const aLink = document.createElement("a");
        aLink.innerText = json.tag_name.replace("v", "");
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
      log("检查更新失败", err);
    });
}

export { checkUpdate };
