const { shell } = require("electron");
const fs = require("fs");
const http = require("http");
const net = require("net");
const Opt = require("./option");
const debounce = require("./debounce");
import superjson from "superjson";
let options = Opt.value;

/**
 * 日志类
 */
class Logs {
  constructor() {
    this.logMsg = [];
    this.res = [];
    this.server = http.createServer(this.httpHandel.bind(this));
    if (options.debug.showWeb) {
      this.startLogServer();
    }
  }
  createLog(logname) {
    const name = logname;
    const fn = (...args) => this.log(name, ...args);
    return fn;
  }
  log = (moduleName, ...args) => {
    if (options.debug.mainConsole) {
      const logArr = [`\x1B[32m[LT]<${moduleName}> \x1B[0m`, ...args];
      this.logMsg.push(logArr);
      console.log(...logArr);
    }
  };
  startLogServer() {
    // 获取空闲端口号
    const port = (() => {
      const server = net.createServer();
      server.listen(0);
      const { port } = server.address();
      server.close();
      return port;
    })();
    if (!this.server.listening) {
      this.server.listen(port, () => {
        shell.openExternal(`http://localhost:${port}/debug`);
      });
    }
  }
  httpHandel(req, res) {
    // 处理日志请求
    if (req.url === "/" && req.method === "GET") {
      // 读取日志文件内容
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const log = superjson.stringify(this.logMsg);
      this.logMsg = [];
      res.end(log);
    } else if (req.url === "/debug" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const html = fs.readFileSync(`${LiteLoader.plugins.lite_tools.path.plugin}/src/config/debug.html`, { encoding: "utf-8" });
      res.end(html);
    } else if (req.url === "/debug.js" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      const js = fs.readFileSync(`${LiteLoader.plugins.lite_tools.path.plugin}/dist/debug.js`, { encoding: "utf-8" });
      res.end(js);
    } else {
      // 处理其他请求
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end("Not Found");
    }
  }
  stopLogServer() {
    if (this.server.listening) {
      this.server.closeAllConnections();
      this.server.closeIdleConnections();
      this.server.close();
    }
  }
}

const logs = new Logs();

const debounceUpdateOptions = debounce((newOptions) => {
  options = newOptions;
  if (options.debug.showWeb) {
    logs.startLogServer();
  } else {
    logs.stopLogServer();
  }
  if (!options.debug.mainConsole) {
    logs.logMsg = [];
  }
}, 10);

Opt.on("update", debounceUpdateOptions);

module.exports = logs.createLog.bind(logs);
