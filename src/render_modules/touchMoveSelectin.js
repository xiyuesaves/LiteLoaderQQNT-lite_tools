// 阻止拖拽多选消息
async function touchMoveSelectin(className) {
  const { options } = await import("./options.js");
  let interception;
  document.querySelector("#app").addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      interception = interception =
        !(event.target.classList.contains("message-content__wrapper") || doesParentHaveClass(event.target, "message-content__wrapper")) &&
        (event.target.classList.contains(className) || doesParentHaveClass(event.target, className));
    }
  });
  document.querySelector(`.${className}`).addEventListener("mousedown", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      if (document.querySelector("#qContextMenu")) {
        document.querySelector("#qContextMenu").remove();
      }
    }
  });
  document.querySelector("#app").addEventListener("mousemove", (event) => {
    if (options.message.disabledSlideMultipleSelection && event.buttons === 1) {
      if (interception) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });
}

// 判断父元素是否包含指定类名
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
