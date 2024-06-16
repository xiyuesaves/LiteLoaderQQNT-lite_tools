/**
 * 图片下载函数
 * @param {String} url 图片url
 * @returns {Promise}
 */
function downloadPic(url) {
  return fetch(url)
    .then((res) => {
      if (res.status === 200) {
        return res.arrayBuffer();
      } else {
        throw new Error(res.statusText);
      }
    })
    .then((buf) => {
      if (buf.size !== 0) {
        return new Uint8Array(buf);
      } else {
        throw new Error("请求返回无数据");
      }
    });
}

export { downloadPic };
