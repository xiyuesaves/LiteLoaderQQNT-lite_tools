import http from "http";
import https from "https";
import zlib from "zlib";
import { config } from "./config.js";
import { Logs } from "./logs.js";
const log = new Logs("getWeb");
/**
 * 请求数据最大值
 * @type {Number}
 */
const MAX_CHUNKS = 1024 * 100;

export function get(url, redirects = 0) {
  if (redirects > 20) {
    return Promise.resolve({
      success: false,
      error: "Too many redirects",
    });
  }
  const urlData = new URL(url);
  if (config.proxy.enabled && config.proxy.url) {
    const proxy = new URL(config.proxy.url);
    return new Promise((resolve) => {
      http
        .get(
          {
            host: proxy.hostname,
            port: proxy.port,
            path: urlData.href,
            headers: {
              Host: urlData.host,
              "User-Agent": config.global.UA,
            },
          },
          (res) => {
            handle(res, resolve);
          },
        )
        .end();
    });
  } else {
    return new Promise((resolve) => {
      const request = urlData.protocol === "https:" ? https.get : http.get;
      request(
        {
          hostname: urlData.hostname,
          path: urlData.pathname,
          headers: {
            "User-Agent": config.global.UA,
          },
        },
        (res) => {
          handle(res, resolve);
        },
      ).end();
    });
  }

  function handle(res, resolve) {
    const contentType = res.headers["content-type"];
    log(res.headers);
    // 处理重定向
    if ([301, 302].includes(res.statusCode)) {
      res.destroy();
      resolve(get(res.headers.location, ++redirects));
    } else if (res.statusCode === 200) {
      if (contentType?.startsWith("text/html")) {
        let chunks = [];
        // 请求数据是否有压缩
        if (res.headers["content-encoding"] === "gzip") {
          const unzipStream = zlib.createGunzip();
          res.pipe(unzipStream);
          unzipStream.on("data", (chunk) => {
            chunks.push(chunk);
            log("收到新数据");
            if (Buffer.concat(chunks).length >= MAX_CHUNKS) {
              res.destroy();
              res.unpipe(unzipStream);
              log("结束请求");
              endData();
            }
          });
          unzipStream.on("end", () => {
            res.destroy();
            endData();
          });
          unzipStream.on("error", (err) => {
            log(`解压遇到问题: ${err.message}`);
            res.destroy();
            resolve({
              success: false,
              error: "unzip error",
            });
          });
        } else {
          res.on("data", (chunk) => {
            chunks.push(chunk);
            log("收到新数据");
            if (Buffer.concat(chunks).length >= MAX_CHUNKS) {
              res.destroy();
              log("结束请求");
              endData();
            }
          });
          res.on("end", () => {
            res.destroy();
            endData();
          });
          res.on("error", (err) => {
            log(`请求出错: ${err}`);
            res.destroy();
            resolve({
              success: false,
              error: "require error",
            });
          });
        }
        function endData() {
          const buffer = Buffer.concat(chunks);
          const html = buffer.toString();
          log("返回数据", html);
          resolve({
            success: true,
            data: html,
          });
        }
      } else {
        res.destroy();
        resolve({
          success: false,
          error: "target not html",
        });
      }
    } else {
      res.destroy();
      resolve({
        success: false,
        error: "statusCode error",
      });
    }
  }
}