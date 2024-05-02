import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
/**
 * 配置合并模块
 */
import recursiveAssignment from "./recursiveAssignment.js";
/**
 * 配置模板
 */
const configTemplate = require("../config/configTemplate.json");
/**
 * 插件配置文件夹路径
 */
const pluginDataPath = LiteLoader.plugins.lite_tools.path.data;
/**
 * 默认配置文件路径
 */
const defaultConfigPath = join(pluginDataPath, "config.json");
/**
 * 旧配置文件路径
 */
const oldConfigPath = join(pluginDataPath, "settings.json");
/**
 * 前置配置文件路径
 */
const userConfigPath = join(pluginDataPath, "user.json");

/**
 * 当前读取的配置文件路径
 */
let loadConfigPath;

/**
 * 初始化配置文件夹
 */
if (!existsSync(pluginDataPath)) {
  mkdirSync(pluginDataPath, { recursive: true });
}
/**
 * 重命名旧的配置文件
 */
if (existsSync(oldConfigPath)) {
  renameSync(oldConfigPath, defaultConfigPath);
}
/**
 * 初始化配置文件
 */
if (!existsSync(defaultConfigPath)) {
  writeFileSync(defaultConfigPath, JSON.stringify(configTemplate, null, 2));
}
/**
 * 读取前置配置文件
 */
if (!existsSync(userConfigPath)) {
  writeFileSync(userConfigPath, "{}");
}
const user = require(userConfigPath);
console.log("user Config", user);

/**
 * 用户配置
 * @type {Object} 配置数据
 */
let config = null;
const addEventListenderList = new Set();

/**
 * 加载用户配置
 */
function loadUserConfig(configId) {
  const userConfigFile = user[configId];
  if (userConfigFile) {
    loadConfigPath = join(pluginDataPath, userConfigFile);
    if (!existsSync(loadConfigPath)) {
      writeFileSync(loadConfigPath, JSON.stringify(configTemplate, null, 2));
    }
  } else {
    loadConfigPath = defaultConfigPath;
  }
  const loadConfig = require(loadConfigPath);
  updateConfig(recursiveAssignment(loadConfig, configTemplate));
}

/**
 * 推送配置更新
 */
function pushUpdate() {
  addEventListenderList.forEach((callback) => callback(config));
}

/**
 * 配置更新事件
 * @param {Function} callback 配置更新回调
 */
function onUpdateConfig(callback) {
  addEventListenderList.add(callback);
}

/**
 * 更新配置文件
 * @param {Object} newConfig 新的配置文件
 */
function updateConfig(newConfig) {
  config = newConfig;
  writeFileSync(loadConfigPath, JSON.stringify(newConfig, null, 2));
  pushUpdate();
}

export { config, loadUserConfig, updateConfig, onUpdateConfig };
