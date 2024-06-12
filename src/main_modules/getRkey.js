import { Logs } from "./logs.js";
import { config } from "./config.js";
const log = new Logs("getRkey");

let rkey;
export async function getRkey(chatType) {
  log("请求rkey", config.rkeyAPI, chatType);
  if (!config.rkeyAPI || !chatType) {
    log("没有配置rkey或没有传入type");
    return config.global.rkey;
  }
  if (!rkey || rkey.expired_time < Date.now() / 1000) {
    rkey = await fetchRkey();
    if (rkey) {
      log("成功更新rkey", rkey);
    } else {
      return config.global.rkey;
    }
  }
  const reqRkey = rkey[chatType];
  log("返回rkey", chatType, reqRkey);
  return reqRkey;
}

async function fetchRkey() {
  try {
    return await fetch(config.rkeyAPI).then((res) => res.json());
  } catch (err) {
    log("获取rkey失败", err);
    return null;
  }
}
