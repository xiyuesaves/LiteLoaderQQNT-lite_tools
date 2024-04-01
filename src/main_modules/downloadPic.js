const http = require("http");
const https = require("https");
const logs = require("./logs");
const log = logs("图片下载");

/**
 * 图片下载函数
 * @param {String} url 图片url
 * @returns {Promise}
 */
function downloadPic(url) {
  const protocolModule = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    function doRequest(url) {
      log("下载撤回消息中的图片", url);
      protocolModule.get(url, (response) => {
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
exports.downloadPic = downloadPic;
