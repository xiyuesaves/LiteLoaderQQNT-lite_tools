/**
 * 图片下载函数
 * @param {String} url 图片url
 * @returns {Promise}
 */
function downloadPic(url) {
  return fetch(url)
    .then((res) => res.arrayBuffer())
    .then((buf) => Buffer.from(buf));
}

export { downloadPic };
