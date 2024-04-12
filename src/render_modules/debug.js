import superjson from "superjson";

// 导出到window对象便于调试
window.superjson = superjson;

let loop = true;

const port = location.port;
console.log("通信端口", port);
(async () => {
  while (loop) {
    try {
      let log = superjson.parse(await (await fetch(`http://localhost:${port}/`)).text());
      if (log && log.length) {
        for (let i = 0; i < log.length; i++) {
          const singLog = log[i];
          if (singLog[3] !== "info" && (singLog?.[1] === "send" ? singLog?.[4]?.[1] : true)) {
            console.log(...singLog);
          }
        }
      }
    } catch (err) {
      if (err.message === "Failed to fetch") {
        loop = false;
        console.log("=========已断开连接=========");
      } else {
        console.log("解码出错", err.message);
      }
    }
  }
})();
