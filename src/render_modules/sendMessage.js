import { logs } from "./logs.js";
const log = new logs("发送消息模块").log;
const webContentsId = lite_tools.getWebContentsId();
log("已获取到webContentsId", webContentsId);

function sendMessage() {}

export { sendMessage };
