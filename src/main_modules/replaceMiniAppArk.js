import { config } from "./config.js";
import { checkChatType } from "./checkChatType.js";
import { replaceArk } from "./replaceArk.js";
import { Logs } from "./logs.js";
const log = new Logs("替换小程序卡片");
export function replaceMiniAppArk(args) {
  if (config.message.convertMiniPrgmArk) {
    const msgList = args[2]?.msgList;
    if (msgList && msgList.length && checkChatType(msgList[0])) {
      log("执行", args);
      msgList.forEach((msgItem) => {
        let msg_seq = msgItem.msgSeq;
        // 遍历消息内容数组
        msgItem.elements.forEach((msgElements) => {
          // 替换历史消息中的小程序卡片
          if (msgElements?.arkElement?.bytesData && config.message.convertMiniPrgmArk) {
            const json = JSON.parse(msgElements.arkElement.bytesData);
            if (json?.prompt?.includes("[QQ小程序]")) {
              msgElements.arkElement.bytesData = replaceArk(json, msg_seq);
              log("替换小程序卡片", json);
            }
          }
        });
      });
    }
  }
}
