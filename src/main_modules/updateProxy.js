// import { ipcMain } from "electron";
import { fetch, setGlobalDispatcher, ProxyAgent } from "undici";
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
      fetch("http://www.google.com/generate_204")
        .then((res) => {
          if (res.status === 204) {
            log("代理地址可用", setProxyUrl);
          } else {
            log("代理地址不可用-1", res.status);
          }
        })
        .catch(() => {
          log("代理地址不可用-2", setProxyUrl);
        });
    }
  } catch (err) {
    log("代理地址有误", err);
  }
});
