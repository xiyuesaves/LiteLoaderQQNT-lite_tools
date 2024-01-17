let options = {};
const callFunSet = new Set();
const beforeCallFunSet = new Set();

/**
 * 更新配置文件
 * @param {Object} opt 配置信息
 */
function setOptions(opt) {
  beforeCallFunSet.forEach((callback) => callback(opt));
  options = opt;
  callFunSet.forEach((callback) => callback(opt));
}

/**
 * 获取配置文件
 * @returns Object
 */
function getOptions() {
  return options;
}

/**
 * 注册监听在更新配置文件后触发该事件
 * @param {Function} callback 监听函数
 */
function onUpdateOptions(callback) {
  callFunSet.add(callback);
}

/**
 * 解除之前注册的监听函数
 * @param {Function} callback 监听函数
 */
function offUpdateOptions(callback) {
  callFunSet.delete(callback);
}

/**
 * 在配置文件被更新前触发
 * @param {Function} callback 监听函数
 */
function onBeforeUpdateOptions(callback) {
  beforeCallFunSet.add(callback);
}

/**
 * 接触之前注册的监听事件
 * @param {Function} callback 监听函数
 */
function offBeforeUpdateOptions(callback) {
  beforeCallFunSet.delete(callback);
}

module.exports = {
  setOptions,
  getOptions,
  onBeforeUpdateOptions,
  offBeforeUpdateOptions,
  onUpdateOptions,
  offUpdateOptions,
};
