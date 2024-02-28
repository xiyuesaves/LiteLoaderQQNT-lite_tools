const { shell } = require("electron");
const fs = require("fs");

class logs {
  constructor(name) {
    this.moduleName = name;
    this.logMsg = [];
    this.res = [];
  }
  log = (...args) => {
    const logArr = [`\x1B[32m[轻量工具箱]${this.moduleName}> \x1B[0m`, ...args];
    this.logMsg.push(logArr);
    console.log(...logArr);
  };
  step = () => {
    return new Promise((res) => {
      this.res.push(res);
    });
  };
  startLogServer() {
    const http = require("http");
    const net = require("net");

    // 获取空闲端口号
    const port = (() => {
      const server = net.createServer();
      server.listen(0);
      const { port } = server.address();
      server.close();
      return port;
    })();

    const server = http.createServer((req, res) => {
      // 处理日志请求
      if (req.url === "/" && req.method === "GET") {
        // 读取日志文件内容
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        const log = JSON.stringify(this.logMsg);
        this.logMsg = [];
        res.end(log);
      } else if (req.url === "/debug" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        const html = fs.readFileSync(`${LiteLoader.plugins.lite_tools.path.plugin}/src/config/debug.html`, { encoding: "utf-8" });
        res.end(html);
      } else if (req.url === "/step" && req.method === "GET") {
        const res_ = this.res.shift();
        if (res_) {
          res_();
        }
        res.end(`${new Date().toDateString()}-${this.res.length}`);
      } else {
        // 处理其他请求
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
        res.end("Not Found");
      }
    });

    server.listen(port, () => {
      console.log(`日志服务已启用 http://localhost:${port}`);
      shell.openExternal(`http://localhost:${port}/debug`);
    });
  }
}

module.exports = logs;
