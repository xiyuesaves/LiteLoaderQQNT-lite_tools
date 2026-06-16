import { options } from "./options.js";
import { Logs } from "../render_modules/logs.js";
const log = new Logs("侧边栏功能按钮模块");

/**
 * 更新侧边栏功能列表
 * @param {Object} navStore 侧边栏数据
 */
export function updateSiderbarNavFuncList(navStore) {
  // 获取原始配置（从文件读取）
  const rawOptions = lite_tools.getOptions();

  // 从 navStore 获取当前显示的项目
  const currentNavItems = [];
  if (navStore?.finalTabConfig) {
    navStore.finalTabConfig.forEach((tabIcon) => {
      currentNavItems.push({
        name: tabIcon.label,
        id: tabIcon.id,
        status: tabIcon.status,
      });
    });
  }

  // 使用 Map 去重，以 name 为 key
  const topMap = new Map();

  // 首先添加已保存的项目
  if (rawOptions?.sidebar?.top) {
    rawOptions.sidebar.top.forEach((item) => {
      if (item.name && !topMap.has(item.name)) {
        topMap.set(item.name, { ...item });
      }
    });
  }

  // 然后合并当前 navStore 中的项目
  currentNavItems.forEach((navItem) => {
    if (topMap.has(navItem.name)) {
      // 更新现有项目的 id
      const existing = topMap.get(navItem.name);
      existing.id = navItem.id;
    } else {
      // 添加新项目
      topMap.set(navItem.name, {
        name: navItem.name,
        id: navItem.id,
        disabled: navItem.status === 1 ? false : true,
      });
    }
  });

  // 转换为数组，并过滤掉无用的"频道"选项（保留"腾讯频道"）
  const top = Array.from(topMap.values()).filter((item) => item.name !== "频道");

  // 获取侧边栏底部的功能入口
  const bottomMap = new Map();

  // 首先添加已保存的底部项目
  if (rawOptions?.sidebar?.bottom) {
    rawOptions.sidebar.bottom.forEach((item) => {
      if (item.name && !bottomMap.has(item.name)) {
        bottomMap.set(item.name, { ...item });
      }
    });
  }

  // 从 DOM 获取当前底部项目
  const domBottomItems = Array.from(document.querySelectorAll(".func-menu.sidebar__menu .func-menu__item"))
    .filter((el) => el?.__VUE__?.[0]?.attrs?.item?.id)
    .map((el) => ({
      name: el.__VUE__[0].attrs.item.label,
      id: el.__VUE__[0].attrs.item.id,
      disabled: el.classList.contains("LT-disabled"),
    }));

  // 合并 DOM 中的底部项目
  domBottomItems.forEach((domItem) => {
    if (bottomMap.has(domItem.name)) {
      // 更新现有项目
      const existing = bottomMap.get(domItem.name);
      existing.id = domItem.id;
      if (domItem.disabled !== undefined) {
        existing.disabled = domItem.disabled;
      }
    } else {
      // 添加新项目
      bottomMap.set(domItem.name, domItem);
    }
  });

  // 转换为数组
  const bottom = Array.from(bottomMap.values());

  log("更新侧边栏数据", top, bottom);
  lite_tools.sendSidebar({
    top,
    bottom,
  });
}
