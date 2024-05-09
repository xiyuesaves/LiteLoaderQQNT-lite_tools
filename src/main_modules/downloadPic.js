import { get as httpGet } from "http";
import { get as httpsGet } from "https";
import { Logs } from "./logs.js";
const log = new Logs("图片下载");

/**
 * 图片下载函数
 * @param {String} url 图片url
 * @returns {Promise}
 */
function downloadPic(url) {
  const get = url.startsWith("https") ? httpsGet : httpGet;
  return new Promise((resolve, reject) => {
    function doRequest(url) {
      log("下载撤回消息中的图片", url);
      get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          doRequest(response.headers.location);
        } else {
          const chunks = [];
          response.on("data", (chunk) => {
            chunks.push(chunk);
          });
          response.on("end", () => {
            const responseData = Buffer.concat(chunks);
            resolve(responseData); // 解析 Promise 并传递数据
            log("下载图片完成");
          });
          response.on("error", (err) => {
            log("下载图片失败", err);
            reject(err); // 解析 Promise 并传递错误
          });
        }
      });
    }
    doRequest(url);
  });
}

export { downloadPic };
