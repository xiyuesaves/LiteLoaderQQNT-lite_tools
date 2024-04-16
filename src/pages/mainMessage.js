// 背景壁纸模块
import "../render_modules/wallpaper.js";
// 消息后缀提示模块
import "../render_modules/messageTail.js";
// 配置模块
import { options, updateOptions } from "../render_modules/options.js";
// 右键菜单相关操作
import { addEventqContextMenu } from "../render_modules/qContextMenu.js";
// 撤回事件监听
import { newMessageRecall } from "../render_modules/messageRecall.js";
// 消息列表监听
import "../render_modules/observerMessageList.js";
// 监听输入框上方功能
import { observerChatArea } from "../render_modules/observerChatArea.js";
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
// 防抖函数
import { debounce } from "../render_modules/debounce.js";
// 首次执行检测
import { first } from "../render_modules/first.js";
// 提醒词模块
import { injectReminder, hookUpdate } from "../render_modules/keywordReminder.js";
// 更新侧边栏功能列表
import { updateSiderbarNavFuncList } from "../render_modules/updateSiderbarNavFuncList.js";
// 监听聊天对象变动
import { addEventPeerChange } from "../render_modules/curAioData.js";
// log
import { Logs } from "../render_modules/logs.js";
const log = new Logs("主窗口");
// 更新窗口图标
import "../render_modules/setAppIcon.js";

addEventqContextMenu();
touchMoveSelectin("chat-msg-area");
chatMessageList();
newMessageRecall();

/**
 * 记录的聊天对象对应离开时的消息id
 */
let uidToMessageId = new Map();
/**
 * 当前聊天对象的uid
 */
let curUid = undefined;

/**
 * 更新可见消息id
 */
const updateVisibleItem = debounce(() => {
  if (options.message.currentLocation) {
    const visibleItems = document.querySelector(".ml-area.v-list-area").__VUE__[0].exposed.getVisibleItems();
    if (visibleItems.length) {
      const visibleItem = visibleItems.shift();
      // log("更新可见消息id", visibleItem);
      uidToMessageId.set(curUid, visibleItem.id);
    }
  }
}, 100);

addEventPeerChange((newPeer) => {
  log("peer更新", newPeer);
  curUid = newPeer?.peerUid;
  injectReminder(curUid);
  if (options.message.currentLocation && curUid) {
    const messageId = uidToMessageId.get(curUid);
    if (messageId && messageId != "0") {
      document.querySelector(".ml-area.v-list-area").__VUE__[0].exposed.scrollToItem(messageId);
    } else {
      updateVisibleItem();
    }
  }
});

chatMessage();
const observe = new MutationObserver(chatMessage);
observe.observe(document.body, {
  childList: true,
  subtree: true,
});
updateOptions(chatMessage);

/**
 * 监听鼠标侧键返回事件
 */
document.addEventListener("mouseup", (event) => {
  if (event.button === 3 && options.message.goBackMainList) {
    document.querySelector(".two-col-layout__aside .recent-contact .list-toggler")?.__VUE__?.[1]?.proxy?.goBackMainList();
  }
});

/**
 * 初始化聊天消息功能，包括滚动事件、贴纸条、侧边栏项目、GIF热点地图、徽章、头像显示、消息气泡调整和移除VIP红名。
 */
function chatMessage() {
  // 监听消息列表滚动
  if (document.querySelector(".ml-area .q-scroll-view") && first("scrollEvent")) {
    const el = document.querySelector(".ml-area .q-scroll-view");
    el.addEventListener("scroll", updateVisibleItem);
  }
  updateVisibleItem();

  /**
   * 侧边栏数据
   */
  const navStore = document.querySelector(".nav.sidebar__nav")?.__VUE__?.[0]?.proxy?.navStore;
  navStore?.finalTabConfig?.forEach((tabIcon) => {
    const find = options.sidebar.top.find((el) => el?.id == tabIcon?.id);
    if (find && find.id !== undefined) {
      if (find.disabled) {
        tabIcon.status = 2;
      } else {
        tabIcon.status = 1;
      }
    }
  });

  // 只执行一次
  if (navStore && navStore?.finalTabConfig?.length && first("updateSiderbarNavFuncList")) {
    updateSiderbarNavFuncList(navStore);
  }

  // 特殊的三个图标
  const arr = ["消息", "联系人", "更多"];
  for (let i = 0; i < arr.length; i++) {
    const areaLabel = arr[i];
    const findLabel = options.sidebar.top.find((el) => el.name === areaLabel);
    if (findLabel) {
      document
        .querySelector(`.sidebar__upper .nav.sidebar__nav .nav-item[aria-label="${areaLabel}"]`)
        ?.classList?.toggle("LT-disabled", findLabel.disabled);
    }
  }

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

  // 消息列表气泡数字调整
  document.querySelectorAll(".list-item .list-item__container .list-item__summary .summary-bubble .vue-component").forEach((el) => {
    el.__VUE__[0].props.countLimit = options.message.removeBubbleLimit ? Number.MAX_SAFE_INTEGER : 99;
  });

  // 移除vip红名
  document.body.classList.toggle("remove-vip-name", options.message.removeVipName);

  // 禁用GIF热图
  document.querySelector(`.q-icon[title="GIF热图"]`)?.parentElement?.classList?.toggle("LT-disabled", options.message.disabledHotGIF);

  // 禁用小红点
  document.body.classList.toggle("disabled-badge", options.message.disabledBadge);

  // 消息列表只显示头像
  document.querySelector(".two-col-layout__aside")?.classList?.toggle("only-avatar", options.message.onlyAvatar);

  localEmoticons();
  observeChatTopFunc();
  observerChatArea();
  observeChatBox();
  hookUpdate();
}
