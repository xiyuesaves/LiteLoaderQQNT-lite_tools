import { first } from "./first.js";
import { options, updateOptions } from "./options.js";
import { logs } from "./logs.js";
const log = new logs("聊天窗口功能列表").log;

let observe;
/**
 * 监听输入框上方功能
 */
async function observerChatArea() {
  if (!observe) {
    observe = new MutationObserver((mutations, observe) => {
      // 禁用指定功能
      document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
        const name = el.querySelector(".icon-item").getAttribute("aria-label");
        const find = options.textAreaFuncList.find((el) => el.name === name);
        if (find) {
          if (find.disabled) {
            el.classList.add("disabled");
          } else {
            el.classList.remove("disabled");
          }
        }
      });
      const textAreaList = Array.from(document.querySelectorAll(".chat-func-bar .bar-icon"))
        .map((el) => {
          return {
            name: el.querySelector(".icon-item").getAttribute("aria-label"),
            id: el.querySelector(".icon-item").id,
            disabled: el.classList.contains(".disabled"),
          };
        })
        .filter((el) => !options.textAreaFuncList.find((_el) => _el.name === el.name));
      if (textAreaList.length) {
        log("发送聊天窗口功能列表");
        lite_tools.sendTextAreaList(textAreaList);
      }
    });
  }
  if (document.querySelector(".chat-input-area .chat-func-bar")) {
    disabledFunctions();
    if (first("chatInputAreaFuncBar")) {
      log("已捕获指定元素");
      updateOptions(disabledFunctions);
      observe.observe(document.querySelector(".chat-input-area .chat-func-bar"), {
        attributes: false,
        childList: true,
        subtree: true,
      });
    }
  }
}

function disabledFunctions() {
  document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
    const name = el.querySelector(".icon-item").getAttribute("aria-label");
    const find = options.textAreaFuncList.find((el) => el.name === name);
    if (find) {
      if (find.disabled) {
        el.classList.add("disabled");
      } else {
        el.classList.remove("disabled");
      }
    }
  });
}

export { observerChatArea };
