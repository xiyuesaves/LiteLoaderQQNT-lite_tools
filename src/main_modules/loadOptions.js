const fs = require("fs");
const { recursiveAssignment } = require("./recursiveAssignment");

/**
 * 加载本地配置文件
 * @param {JSON} defaultConfig 默认配置文件
 * @param {String} optionsPath 配置文件路径
 * @returns Object 配置信息
 */
function loadOptions(defaultConfig, optionsPath) {
  try {
    // 判断是否存在配置文件
    if (!fs.existsSync(optionsPath)) {
      // 没有传入配置文件地址则直接返回默认配置文件并初始化
      fs.writeFileSync(optionsPath, JSON.stringify(defaultConfig, null, 4));
      return defaultConfig;
    } else {
      const fileOptions = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
      const options = recursiveAssignment(fileOptions, defaultConfig);
      fs.writeFileSync(optionsPath, JSON.stringify(options, null, 4));
      return options;
    }
  } catch (err) {
    console.error("读取配置文件出错", err);
    return defaultConfig;
  }
}

module.exports = loadOptions;
