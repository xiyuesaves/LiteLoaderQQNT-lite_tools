import { Logs } from "./logs.js";
import { config } from "./config.js";
const log = new Logs("getRkey");

let rkey;
export async function getRkey(chatType) {
  log("请求rkey", chatType);
  if (!config.rkeyAPI || !chatType) {
    log("没有配置rkey或没有传入type");
    return config.global.rkey;
  }
  if (!rkey || (rkey.expired_time ? rkey.expired_time < Date.now() / 1000 : true)) {
    rkey = await fetchRkey();
    if (!rkey) {
      log("获取rkey失败");
      return config.global.rkey;
    }
  }
  const reqRkey = rkey[chatType];
  log("返回rkey", chatType, reqRkey);
  return reqRkey;
}

async function fetchRkey() {
  try {
    log("正在更新rkey", config.rkeyAPI);
    const newRkey = await fetch(config.rkeyAPI).then((res) => res.json());
    if (typeof newRkey.group_rkey === "string" && typeof newRkey.private_rkey === "string") {
      rkey = newRkey;
      log("成功更新rkey", rkey);
    } else {
      log("数据返回格式错误", newRkey);
      return undefined;
    }
    return rkey;
  } catch (err) {
    log("获取rkey失败", err);
    return undefined;
  }
}
