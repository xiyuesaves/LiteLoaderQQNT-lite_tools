import { shell } from "electron";
import { createServer as createHttpServer } from "http";
import { createServer as creatNetServer } from "net";
import { readFileSync } from "fs";
import superjson from "superjson";

import { config, onUpdateConfig } from "./config.js";

let cacheLogs = [];
class Logs {
  constructor(logName) {
    this.logName = logName;
    return this.log.bind(this);
  }
  log(...args) {
    if (config?.debug?.mainConsole) {
      console.log(`[${this.logName}]`, ...args);
      cacheLogs.push([`[${this.logName}]`, ...args]);
    }
  }
}
class WebLog {
  constructor() {
    this.server = createHttpServer(this.httpHandel.bind(this));
  }
  httpHandel(req, res) {
    // 处理日志请求
    if (req.url === "/" && req.method === "GET") {
      // 读取日志文件内容
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const log = superjson.stringify(cacheLogs);
      cacheLogs = [];
      res.end(log);
    } else if (req.url === "/debug" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const html = readFileSync(`${LiteLoader.plugins.lite_tools.path.plugin}/src/html/debug.html`, { encoding: "utf-8" });
      res.end(html);
    } else if (req.url === "/debug.js" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const js = readFileSync(`${LiteLoader.plugins.lite_tools.path.plugin}/dist/debug.js`, { encoding: "utf-8" });
      res.end(js);
    } else {
      // 处理其他请求
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end("Not Found");
    }
  }
  start() {
    if (!this.server.listening) {
      const port = (() => {
        const server = creatNetServer();
        server.listen(0);
        const { port } = server.address();
        server.close();
        return port;
      })();
      this.server.listen(port, () => {
        shell.openExternal(`http://localhost:${port}/debug`);
      });
    }
  }
  stop() {
    if (this.server.listening) {
      this.server.closeAllConnections();
      this.server.closeIdleConnections();
      this.server.close();
    }
  }
}
const webLog = new WebLog();

onUpdateConfig(() => {
  if (config.debug.showWeb) {
    webLog.start();
  } else {
    webLog.stop();
  }
  if (!config.debug.mainConsole) {
    cacheLogs = [];
  }
});

function sendLog(args) {
  if (config?.debug?.showChannedCommunication) {
    cacheLogs.push(["[send]", ...args]);
  }
}

function ipcLog(args) {
  if (config?.debug?.showChannedCommunication) {
    cacheLogs.push(["[get]", ...args]);
  }
}

export { Logs, webLog, sendLog, ipcLog };
