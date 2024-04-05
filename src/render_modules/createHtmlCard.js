import { miniappArkCard, urlArkCard } from "./HTMLtemplate.js";
import { miniappIcon } from "./svg.js";
import { Logs } from "./logs.js";
const log = new Logs("消息列表处理");

export function createHtmlCard(arkData) {
  log("接收到卡片数据", arkData);
  // 当前只处理小程序和url卡片
  switch (arkData.app) {
    case "com.tencent.miniapp_01":
      const newMiniappCard = miniappArkCard.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
        switch (name) {
          case "appIcon":
            return arkData.meta.detail_1.icon.replace(/^(http:\/\/|https:\/\/)?/,"https://");
          case "appName":
            return arkData.meta.detail_1.title;
          case "shareDesc":
            return arkData.meta.detail_1.desc;
          case "previewImg":
            return arkData.meta.detail_1.preview.replace(/^(http:\/\/|https:\/\/)?/,"https://");
          case "miniappIcon":
            return miniappIcon;
          default:
            return name;
        }
      });
      return newMiniappCard;
    case "com.tencent.structmsg":
      const newUrlCard = urlArkCard.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
        switch (name) {
          case "appIcon":
            return arkData.meta.news.source_icon;
          case "title":
            return arkData.meta.news.title;
          case "desc":
            return arkData.meta.news.desc;
          case "descImg":
            return arkData.meta.news.preview.replace(/^(http:\/\/|https:\/\/)?/,"https://");
          default:
            return name;
        }
      });
      return newUrlCard;
    default:
      return undefined;
  }
}
