/**
 * 判断父元素是否包含指定类名
 * @param {Element} element 需要判断的元素
 * @param {className} className 目标样式
 * @param {className} stopClassName 停止递归样式
 * @returns
 */
export function doesParentHaveClass(element, className, stopClassName) {
  let parentElement = element.parentElement;
  while (parentElement !== null) {
    if (parentElement.classList.contains(className)) {
      return true;
    }
    if (parentElement.classList.contains(stopClassName)) {
      return false;
    }
    parentElement = parentElement.parentElement;
  }
  return false;
}
