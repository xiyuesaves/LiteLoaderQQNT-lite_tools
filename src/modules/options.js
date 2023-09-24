// 配置信息模块
const options = lite_tools.getOptions();

lite_tools.updateOptions((event, newOpt) => {
  console.log("更新配置", newOpt);
  Object.keys(newOpt).forEach((key) => {
    options[key] = newOpt[key];
  });
});

export { options as opt };
