import { options } from "./options.js";
import { logs } from "./logs.js";
const log = new logs("阻止滑动选择").log;
let listenTarget = false;
/**
 * 阻止拖拽多选消息
 * @param {String} className 禁止拖拽类名
 */
function touchMoveSelectin(className) {
  log("模块已加载", options.message.disabledSlideMultipleSelection);
  let interception;
  document.querySelector("#app").addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      interception = interception =
        !(event.target.classList.contains("message-content__wrapper") || doesParentHaveClass(event.target, "message-content__wrapper")) &&
        (event.target.classList.contains(className) || doesParentHaveClass(event.target, className));
    }
  });

  document.querySelector("#app").addEventListener("mousemove", (event) => {
    if (!listenTarget && document.querySelector(`.${className}`)) {
      log("已捕获目标元素");
      document.querySelector(`.${className}`).addEventListener("mousedown", (event) => {
        if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
          if (document.querySelector("#qContextMenu")) {
            document.querySelector("#qContextMenu").remove();
          }
        }
      });
      listenTarget = true;
    }
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      log("拖拽事件", interception);
      if (interception) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}

/**
 * 判断父元素是否包含指定类名
 * @param {Element} element 目标元素
 * @param {className} className 目标类名
 * @returns
 */
function doesParentHaveClass(element, className) {
  let parentElement = element.parentElement;
  while (parentElement !== null) {
    if (parentElement.classList.contains(className)) {
      return true;
    }
    parentElement = parentElement.parentElement;
  }
  return false;
}

export { touchMoveSelectin };
