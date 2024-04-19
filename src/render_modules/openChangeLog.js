import { updateMsgBox } from "./HTMLtemplate.js";
/**
 * 显示更新日志，该模块只能在设置页面使用
 * @param {String} html html字符串
 * @param {Boolean} showDownloadBtn 是否显示下载按钮
 */
function openChangeLog(html, showDownloadBtn) {
  const newMsgBox = updateMsgBox.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    switch (name) {
      case "title":
        return "更新日志";
      case "context":
        return html;
      case "hiddenUpdate":
        return showDownloadBtn ? "LT-disabled" : "";
      default:
        return name;
    }
  });
  document.querySelector(".tab-view.lite_tools").insertAdjacentHTML("beforeend", newMsgBox);
  document.querySelector(".tab-view.lite_tools").classList.add("lite-tools-overflow-hidden");
  const showMsgBox = document.querySelector(".lite-tools-mask");
  showMsgBox.offsetHeight;
  showMsgBox.classList.add("show");
  showMsgBox.querySelector(".quite-btn").addEventListener("click", () => {
    console.log("关闭");
    document.querySelector(".tab-view.lite_tools").classList.remove("lite-tools-overflow-hidden");
    showMsgBox.addEventListener("transitionend", () => {
      showMsgBox.remove();
    });
    showMsgBox.classList.remove("show");
  });
  showMsgBox.querySelector(".update-btn").addEventListener("click", () => {
    console.log("更新");
  });
}
window.test = () => {
  openChangeLog("<p>测试测试123</p>", false);
};
export { openChangeLog };
