import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { UserConfig } from "./userConfig.js";
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
 * 读取用户独立配置
 */
const userConfig = new UserConfig(userConfigPath);
/**
 * 配置文件更新回调函数列表
 */
const addEventListenderList = new Set();
/**
 * 当前读取的配置文件路径
 */
let loadConfigPath;
/**
 * 用户配置
 * @type {Object} 配置数据
 */
let config = null;
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
 * 加载用户配置
 * @param {String} userId 根据 userId 来判断读取哪个配置文件
 */
function loadUserConfig(userId) {
  const userConfigFile = userConfig.get(userId);
  let loadConfig;
  if (userConfigFile) {
    loadConfigPath = join(pluginDataPath, userConfigFile);
  } else {
    loadConfigPath = defaultConfigPath;
  }
  if (!existsSync(loadConfigPath)) {
    writeFileSync(loadConfigPath, JSON.stringify(configTemplate, null, 2));
  }
  try {
    loadConfig = require(loadConfigPath);
  } catch (err) {
    loadConfig = configTemplate;
    writeFileSync(loadConfigPath, JSON.stringify(configTemplate, null, 2));
  }
  updateConfig(recursiveAssignment(loadConfig, configTemplate));
}

/**
 * 推送配置更新
 */
function pushUpdate() {
  addEventListenderList.forEach((callback) => callback(config));
}

/**
 * 添加配置更新监听
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

export { config, userConfig, loadUserConfig, updateConfig, onUpdateConfig };
