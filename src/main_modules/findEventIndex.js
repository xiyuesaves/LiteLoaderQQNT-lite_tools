/**
 * 判断事件名称
 * @param {Array} args 目标数组
 * @param {String} eventName 目标字符串
 * @returns {Boolean}
 */
export function findEventIndex(args, eventName) {
  return args[2] ? (Array.isArray(args[2]) ? args[2].findIndex((item) => item.cmdName === eventName) : -1) : -1;
}