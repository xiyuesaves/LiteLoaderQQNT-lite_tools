import { options } from "../render_modules/options.js";
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

addEventqContextMenu();
touchMoveSelectin("chat-msg-area");
chatMessageList();
updateWallpaper();
newMessageRecall();

// 设置页面获取侧边栏项目
lite_tools.optionsOpen((event, message) => {
  console.log("获取侧边栏");
  let top = Array.from(document.querySelectorAll(".nav.sidebar__nav .nav-item")).map((el, index) => {
    if (el.getAttribute("aria-label")) {
      if (el.getAttribute("aria-label").includes("消息")) {
        return {
          name: "消息",
          index,
          disabled: el.classList.contains("disabled"),
        };
      } else {
        return {
          name: el.getAttribute("aria-label"),
          index,
          disabled: el.classList.contains("disabled"),
        };
      }
    } else if (el.querySelector(".game-center-item")) {
      return {
        name: "游戏中心",
        index,
        disabled: el.classList.contains("disabled"),
      };
    } else {
      return {
        name: "未知功能",
        index,
        disabled: el.classList.contains("disabled"),
      };
    }
  });
  let bottom = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item")).map((el, index) => {
    if (el.querySelector(".icon-item").getAttribute("aria-label")) {
      return {
        name: el.querySelector(".icon-item").getAttribute("aria-label"),
        index,
        disabled: el.classList.contains("disabled"),
      };
    } else {
      return {
        name: "未知功能",
        index,
        disabled: el.classList.contains("disabled"),
      };
    }
  });
  lite_tools.sendSidebar({
    top,
    bottom,
  });
  console.log("获取侧边栏-发送");
});

const observe = new MutationObserver(chatMessage);
observe.observe(document.body, {
  childList: true,
  subtree: true,
});
updateOptions(chatMessage);
chatMessage();

function chatMessage(mutationList) {
  // 初始化推荐表情
  if (options.message.disabledSticker) {
    document.querySelector(".sticker-bar")?.classList?.add("disabled");
  } else {
    document.querySelector(".sticker-bar")?.classList?.remove("disabled");
  }
  // 初始化顶部侧边栏
  document.querySelectorAll(".nav.sidebar__nav .nav-item").forEach((el, index) => {
    const find = options.sidebar.top.find((opt) => opt.index == index);
    if (find) {
      if (find.disabled) {
        el.classList.add("disabled");
      } else {
        el.classList.remove("disabled");
      }
    }
  });
  // 初始化底部侧边栏
  document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item").forEach((el, index) => {
    const find = options.sidebar.bottom.find((opt) => opt.index == index);
    if (find) {
      if (find.disabled) {
        el.classList.add("disabled");
      } else {
        el.classList.remove("disabled");
      }
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

  localEmoticons();
  observeChatTopFunc();
  observerChatArea();
  observeChatBox();
  observerMessageList(".ml-list.list", ".ml-list.list .ml-item");
}
