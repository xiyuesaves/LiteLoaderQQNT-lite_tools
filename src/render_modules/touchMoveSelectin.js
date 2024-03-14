import { options } from "./options.js";
import { Logs } from "./logs.js";
const log = new Logs("阻止滑动选择");
let listenTarget = false;
/**
 * 阻止拖拽多选消息
 * @param {String} className 禁止拖拽类名
 */
function touchMoveSelectin(className) {
  log("模块已加载", options.message.disabledSlideMultipleSelection);
  let interception;
  document.querySelector("#app").addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && (event.buttons === 1 || event.buttons === 4)) {
      interception = !event.target.closest(".message-content__wrapper") && event.target.closest(`.${className}`);
    }
  });

  document.querySelector("#app").addEventListener("mousemove", (event) => {
    if (!listenTarget && document.querySelector(`.${className}`)) {
      log("已捕获目标元素");
      document.querySelector(`.${className}`).addEventListener("mousedown", (event) => {
        if (options.message.disabledSlideMultipleSelection && (event.buttons === 1 || event.buttons === 4)) {
          document.querySelector(".q-context-menu")?.remove();
        }
      });
      listenTarget = true;
    }
    if (options.message.disabledSlideMultipleSelection && (event.buttons === 1 || event.buttons === 4)) {
      if (interception) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}

export { touchMoveSelectin };
