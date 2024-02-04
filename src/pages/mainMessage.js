import { options, updateOptions } from "../render_modules/options.js";
// 右键菜单相关操作
import { addEventqContextMenu } from "../render_modules/qContextMenu.js";
// 撤回事件监听
import { newMessageRecall } from "../render_modules/messageRecall.js";
// 消息列表监听
import { observerMessageList } from "../render_modules/observerMessageList.js";
// 监听输入框上方功能
import { observerChatArea } from "../render_modules/observerChatArea.js";
// 背景壁纸模块
import { updateWallpaper } from "../render_modules/updateWallpaper.js";
// 通用监听输入框编辑事件
import { observeChatBox } from "../render_modules/observeChatBox.js";
// 通用聊天消息列表处理模块
import { chatMessageList } from "../render_modules/chatMessageList.js";
// 阻止拖拽多选消息
import { touchMoveSelectin } from "../render_modules/touchMoveSelectin.js";
// 更新输入框上方功能列表
import { observeChatTopFunc } from "../render_modules/observeChatTopFunc.js";
// 页面插入本地表情功能
import { localEmoticons } from "../render_modules/localEmoticons.js";
// 消息后缀提示模块
import "../render_modules/messageTail.js";

// log
import { Logs } from "../render_modules/logs.js";
const log = new Logs("主窗口");

addEventqContextMenu();
touchMoveSelectin("chat-msg-area");
chatMessageList();
updateWallpaper();
newMessageRecall();

// 设置页面获取侧边栏项目
lite_tools.optionsOpen((event, message) => {
  let top = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
    if (el.getAttribute("aria-label")) {
      if (el.getAttribute("aria-label").includes("消息")) {
        return {
          name: "消息",
          index,
          disabled: el.classList.contains("LT-disabled"),
        };
      } else {
        return {
          name: el.getAttribute("aria-label"),
          index,
          disabled: el.classList.contains("LT-disabled"),
        };
      }
    } else if (el.querySelector(".game-center-item")) {
      return {
        name: "游戏中心",
        index,
        disabled: el.classList.contains("LT-disabled"),
      };
    } else {
      return {
        name: "未知功能",
        index,
        disabled: el.classList.contains("LT-disabled"),
      };
    }
  });
  let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
    if (el.querySelector(".icon-item").getAttribute("aria-label")) {
      const item = {
        name: el.querySelector(".icon-item").getAttribute("aria-label"),
        index,
        disabled: el.classList.contains("LT-disabled"),
      };
      if (item.name === "更多") {
        item.name = "更多 （此选项内包含设置页面入口，不要关闭，除非你知道自己在做什么）";
      }
      return item;
    } else {
      return {
        name: "未知功能",
        index,
        disabled: el.classList.contains("LT-disabled"),
      };
    }
  });
  lite_tools.sendSidebar({
    top,
    bottom,
  });
});

const observe = new MutationObserver(chatMessage);
observe.observe(document.body, {
  childList: true,
  subtree: true,
});
updateOptions(chatMessage);
chatMessage();

function chatMessage() {
  // log("更新内容");
  // 初始化推荐表情
  document.querySelector(".sticker-bar")?.classList?.toggle("LT-disabled", options.message.disabledSticker);

  // 初始化顶部侧边栏
  document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
    const find = options.sidebar.top.find((opt) => opt.index == index);
    if (find) {
      el.classList.toggle("LT-disabled", find.disabled);
    }
  });
  // 初始化底部侧边栏
  document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item").forEach((el, index) => {
    const find = options.sidebar.bottom.find((opt) => opt.index == index);
    if (find) {
      el.classList.toggle("LT-disabled", find.disabled);
    }
  });
  // 禁用GIF热图
  if (options.message.disabledHotGIF) {
    document.body.classList.add("disabled-sticker-hot-gif");
  } else {
    document.body.classList.remove("disabled-sticker-hot-gif");
  }
  // 禁用小红点
  if (options.message.disabledBadge) {
    document.body.classList.add("disabled-badge");
  } else {
    document.body.classList.remove("disabled-badge");
  }
  // 消息列表只显示头像
  document.querySelector(".two-col-layout__aside").classList.toggle("only-avatar", options.message.onlyAvatar);

  localEmoticons();
  observeChatTopFunc();
  observerChatArea();
  observeChatBox();
  observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
}
