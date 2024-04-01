import { options } from "./options.js";
import { Logs } from "../render_modules/logs.js";
const log = new Logs("侧边栏功能按钮模块");

/**
 * 更新侧边栏功能列表
 * @param {Object} navStore 侧边栏数据
 */
export function updateSiderbarNavFuncList(navStore) {
  // 获取侧边栏顶部的功能入口
  let top = navStore.finalTabConfig.map((tabIcon) => ({
    name: tabIcon.label,
    id: tabIcon.id,
    disabled: tabIcon.status === 1 ? false : true,
  }));
  // 插入特殊的三个图标数据
  top.unshift(
    { name: "消息", disabled: options?.sidebar?.top?.find((el) => el.name === "消息")?.disabled ?? false, id: -1 },
    { name: "联系人", disabled: options?.sidebar?.top?.find((el) => el.name === "联系人")?.disabled ?? false, id: -1 },
    { name: "更多", disabled: options?.sidebar?.top?.find((el) => el.name === "更多")?.disabled ?? false, id: -1 },
  );
  // 获取侧边栏底部的功能入口
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
  if (
    options.sidebar.top
      .map((el) => el.name)
      .sort()
      .join() !==
      top
        .map((el) => el.name)
        .sort()
        .join() ||
    options.sidebar.bottom
      .map((el) => el.name)
      .sort()
      .join() !==
      bottom
        .map((el) => el.name)
        .sort()
        .join()
  ) {
    log("更新侧边栏数据", top, bottom);
    lite_tools.sendSidebar({
      top,
      bottom,
    });
  }
}
