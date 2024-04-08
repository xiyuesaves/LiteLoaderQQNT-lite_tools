import superjson from 'superjson';

// 导出到window对象便于调试
window.superjson = superjson;

const port = location.port;
console.log("通信端口", port);
(async () => {
  try {
    while (true) {
      let log = superjson.parse(await (await fetch(`http://localhost:${port}/`)).text());
      if (log && log.length) {
        for (let i = 0; i < log.length; i++) {
          const singLog = log[i];
          if (singLog[3] !== "info" && singLog[3]?.[0]?.eventName !== "ns-LoggerApi-2") {
            console.log(...singLog);
          }
        }
      }
    }
  } catch (err) {
    console.log("=========已断开连接=========");
  }
})();