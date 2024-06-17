import { setGlobalDispatcher, ProxyAgent } from "undici";
import { onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("updateProxy");
let setProxyUrl = "";
onUpdateConfig((config) => {
  try {
    if (config.proxy.url !== setProxyUrl) {
      setProxyUrl = config.proxy.url;
      setGlobalDispatcher(new ProxyAgent(config.proxy.url));
      log("更新代理地址成功", setProxyUrl);
    }
  } catch (err) {
    log("代理地址有误", err);
  }
});
