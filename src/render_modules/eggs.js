import { weightIcon } from "./svg.js";
import { debounce } from "./debounce.js";
import { showToast, clearToast } from "./toast.js";

function isToday() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return month === 4 && day === 1;
}

if (isToday()) {
  document.querySelectorAll(".nav-item.liteloader").forEach((node) => {
    if (node.textContent === "轻量工具箱") {
      node.querySelector(".name").innerHTML = "超重工具箱";
      const iconEl = node.querySelector(".q-icon");
      iconEl.innerHTML = weightIcon;
    }
  });
}

let isActive = false;
let count = 0;
let msgIndex = -1;
const contents = [
  ["不要点啦！", "default", 3000],
  ["乱点会坏掉的！", "default", 3000],
  ["真的会坏掉的！", "default", 3000],
  ["[光敏性癫痫警告]接下来要触发的内容可能引起部分人群的不适，请小心！", "error", 3000],
];
export async function switchButtons() {
  if (document.querySelector(".lite-tools-settings").classList.contains("eggs")) {
    clearToast();
    document.querySelector(".lite-tools-settings").classList.remove("eggs");
  }
  if (isActive) {
    timeout();
    if (msgIndex !== contents.length - 1) {
      msgIndex++;
      const toast = contents[msgIndex];
      showToast(...toast);
    } else {
      isActive = false;
      msgIndex = -1;
      clearToast();
      document.querySelector(".lite-tools-settings").classList.add("eggs");
      showToast("开始蹦迪！！！(再次切换任意开关关闭)", "success", Number.MAX_SAFE_INTEGER / 1000);
    }
  } else {
    isActive = activeEggs();
  }
}

function activeEggs() {
  count++;
  if (count > 10) {
    return true;
  }
  frequency();
  return false;
}

const frequency = debounce(() => {
  count = 0;
}, 1000);

const timeout = debounce(() => {
  if (isActive) {
    showToast("这才像话嘛~", "success", 3000);
    isActive = false;
    msgIndex = -1;
  }
}, 5000);
