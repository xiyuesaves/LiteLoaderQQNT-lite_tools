const path = require("path");
const fs = require("fs");
const { downloadPic } = require("./downloadPic");
const { logs } = require("./logs");
const log = new logs("下载被撤回图片").log;

// 下载被撤回的图片
function processPic(msgItem) {
  msgItem?.elements?.forEach(async (el) => {
    if (el?.picElement) {
      log("该消息含有图片", el);
      const pic = el.picElement;
      const picName = pic.md5HexStr.toUpperCase();
      const picUrl = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${picName}/`;
      if (!fs.existsSync(pic.sourcePath)) {
        log("下载原图", `${picUrl}0`);
        const body = await downloadPic(`${picUrl}0`);
        fs.mkdirSync(path.dirname(pic.sourcePath), { recursive: true });
        fs.writeFileSync(pic.sourcePath, body);
      }
      // 修复本地数据中的错误
      if (pic?.thumbPath && (pic.thumbPath instanceof Array || pic.thumbPath instanceof Object)) {
        pic.thumbPath = new Map([
          [0, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_0")],
          [198, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_198")],
          [720, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_720")],
        ]);
      }
      if (pic?.thumbPath && (pic.thumbPath instanceof Array || pic.thumbPath instanceof Map)) {
        pic.thumbPath.forEach(async (el, key) => {
          if (!fs.existsSync(el)) {
            log("下载缩略图", `${picUrl}${key}`);
            const body = await downloadPic(`${picUrl}${key}`);
            fs.mkdirSync(path.dirname(el), { recursive: true });
            fs.writeFileSync(el, body);
          }
        });
      }
    }
  });
}
module.exports = processPic;
