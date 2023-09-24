// 配置信息模块
const options = lite_tools.getOptions();
const updateFunctions = [];

lite_tools.updateOptions((event, newOpt) => {
  Object.keys(newOpt).forEach((key) => {
    options[key] = newOpt[key];
  });
  updateOptions();
});

// 触发配置更新
function updateOptions() {
  updateFunctions.forEach((fun) => {
    fun(options);
  });
}

// 监听配置更新
function listenUpdateOptions(callback) {
  updateFunctions.push(callback);
}

// 重命名options兼容旧代码
export { options as opt, options, listenUpdateOptions };
