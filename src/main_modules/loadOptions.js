const fs = require("fs");
const defaultOptions = require("./defaultOptions.json");

/**
 * 加载本地配置文件
 * @param {String} optionsPath 配置文件路径
 * @returns Object 配置信息
 */
function loadOptions(optionsPath) {
  try {
    // 判断是否存在配置文件
    if (!fs.existsSync(optionsPath)) {
      // 没有传入配置文件地址则直接返回默认配置文件并初始化
      fs.writeFileSync(optionsPath, JSON.stringify(defaultOptions, null, 4));
      return defaultOptions;
    } else {
      const fileOptions = JSON.parse(fs.readFileSync(optionsPath, "utf-8"));
      const options = recursiveAssignment(fileOptions, defaultOptions);
      fs.writeFileSync(optionsPath, JSON.stringify(options, null, 4));
      return options;
    }
  } catch (err) {
    console.error("读取配置文件出错", err);
    return defaultOptions;
  }
}

/**
 * 
 * @param {Object} fileOptions 从文件加载的配置
 * @param {Object} defaultOptions 默认配置
 * @returns Object 两个配置合并后的实际配置文件
 */
function recursiveAssignment(fileOptions, defaultOptions) {
  if (!fileOptions) {
    return defaultOptions;
  }
  let obj = {};
  for (const key in defaultOptions) {
    if (Object.hasOwnProperty.call(defaultOptions, key)) {
      // 如果键值是对象则递归处理
      if (Object.prototype.toString.call(defaultOptions[key]) === "[object Object]") {
        obj[key] = recursiveAssignment(fileOptions[key], defaultOptions[key]);
      }
      // 判断两者同一个键的数据类型是否一致
      else if (Object.prototype.toString.call(fileOptions[key]) === Object.prototype.toString.call(defaultOptions[key])) {
        obj[key] = fileOptions[key];
      } else {
        obj[key] = defaultOptions[key];
      }
    }
  }
  return obj;
}

module.exports = loadOptions;
