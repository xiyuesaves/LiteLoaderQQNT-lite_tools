/**
 * @typedef wordSearch
 * @property {Boolean} enabled 是否启用
 * @property {String} searchUrl 搜索地址
 */

/**
 * @typedef imageSearch
 * @property {Boolean} enabled 是否启用
 * @property {String} searchUrl 搜索地址
 */

/**
 * @typedef localEmoticons
 * @property {Boolean} enabled 是否启用本地表情包
 * @property {String} localPath 表情包文件夹路径
 */

/**
 * @typedef sidebar
 * @property {Array} top 顶部功能列表
 * @property {Array} bottom 底部功能列表
 */

/**
 * @typedef imageViewer
 * @property {Boolean} quickClose 快速关闭窗口开关
 */

/**
 * @typedef message
 * @property {Boolean} disabledSticker 禁用贴纸
 * @property {Boolean} disabledHotGIF 禁用GIF热图
 * @property {Boolean} disabledBadge 禁用小红点
 * @property {Boolean} disabledSlideMultipleSelection 禁用滑动多选消息
 * @property {Boolean} convertMiniPrgmArk 替换小程序为url卡片
 * @property {Boolean} showMsgTime 显示消息发送时间
 * @property {Boolean} replaceBtn 复读机
 * @property {Boolean} preventMessageRecall 阻止撤回
 * @property {Boolean} removeReplyAt 移除回复时的At标记
 * @property {Boolean} mergeMessage 合并消息
 * @property {avatarSticky} avatarSticky 头像浮动
 */

/**
 * @typedef avatarSticky
 * @property {Boolean} enabled 启用头像浮动
 * @property {Boolean} toBottom 头像置底
 */

/**
 * @typedef tail
 * @property {Boolean} enabled 是否启用小尾巴
 * @property {Boolean} newLine 小尾巴是否换行
 * @property {String} content 小尾巴内容
 */

/**
 * @typedef background
 * @property {Boolean} enabled 是否启用背景图片
 * @property {String} url 背景图片地址
 */

/**
 * @typedef Options
 * @property {Boolean} debug debug开关
 * @property {wordSearch} wordSearch 划词搜索
 * @property {imageSearch} imageSearch 图片搜索
 * @property {localEmoticons} localEmoticons 本地表情包
 * @property {sidebar} sidebar 侧边栏数据
 * @property {imageViewer} imageViewer 媒体预览窗口
 * @property {message} message 消息窗口
 * @property {tail} tail 小尾巴
 * @property {Array} textAreaFuncList 输入框上方功能列表
 * @property {Array} chatAreaFuncList 消息框上方功能列表
 * @property {background} background 背景图片
 */

/**
 * @type {Options} 配置信息
 */
const options = lite_tools.getOptions();
const updateFunctions = [];
// import { Logs } from "./logs.js";
// const log = new Logs("配置模块");

lite_tools.updateOptions((event, newOpt) => {
  Object.keys(newOpt).forEach((key) => {
    options[key] = newOpt[key];
  });
  dispatchUpdateOptions();
});

/**
 * 触发配置更新
 */
function dispatchUpdateOptions() {
  // log("更新配置文件");
  updateFunctions.forEach((fun) => {
    fun(options);
  });
}

/**
 * 监听配置更新
 * @param {Function} callback 触发函数
 */
function updateOptions(callback) {
  updateFunctions.push(callback);
}

export { options, updateOptions };
