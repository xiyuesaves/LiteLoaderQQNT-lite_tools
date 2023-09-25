// 配置信息模块
const options = lite_tools.getOptions();
const updateFunctions = [];

lite_tools.updateOptions((event, newOpt) => {
  Object.keys(newOpt).forEach((key) => {
    options[key] = newOpt[key];
  });
  dispatchUpdateOptions();
});

// 触发配置更新
function dispatchUpdateOptions() {
  updateFunctions.forEach((fun) => {
    fun(options);
  });
}

// 监听配置更新
function updateOptions(callback) {
  updateFunctions.push(callback);
}

// 重命名options兼容旧代码
export { options, updateOptions };
