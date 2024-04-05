const path = require("path");
const fs = require("fs");
const { downloadPic } = require("./downloadPic");
const logs = require("./logs");
const log = logs("图片处理模块");
const BASE_URL = "https://gchat.qpic.cn";
const TEMP_RKEY = "&rkey=CAMSKLgthq-6lGU_w8qRmii91Wd89eUjW4Rg44v_zM9qUrjZjrZd-CfXFtI";

// 获取图片链接
function getPicUrl(picData) {
  console.log(picData);
  if (!picData.original) {
    if (picData.originImageUrl) {
      if (picData.originImageUrl.includes("&rkey=")) {
        return `${BASE_URL}${picData.originImageUrl}`;
      } else {
        return `${BASE_URL}${picData.originImageUrl}${TEMP_RKEY}`;
      }
    } else {
      return `${BASE_URL}/gchatpic_new/0/0-0-${picData.originImageMd5}/`;
    }
  } else {
    return `${BASE_URL}/gchatpic_new/0/0-0-${picData.md5HexStr.toUpperCase()}/`;
  }
}

function getPicArr(picData) {
  const rawUrl = getPicUrl(picData);
  return [0, 198, 720].map((el) => {
    if (rawUrl.includes("gchatpic_new")) {
      return `${rawUrl}${el}`;
    } else {
      return rawUrl.replace("&spec=0", `&spec=${el}`);
    }
  });
}

/**
 * 下载消息内含有的图片
 * @param {Object} msgItem 消息数据
 */
async function processPic(msgItem) {
  if (msgItem?.elements && msgItem?.elements?.length) {
    for (let i = 0; i < msgItem.elements.length; i++) {
      const el = msgItem.elements[i];
      if (el?.picElement) {
        log("该消息含有图片", el);
        const pic = el.picElement;
        const picUrls = getPicArr(pic);
        if (!fs.existsSync(pic.sourcePath)) {
          log("下载原图", picUrls);
          const body = await downloadPic(picUrls[0]);
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
        // log("缩略图", typeof pic?.thumbPath, pic?.thumbPath instanceof Map);
        if (pic?.thumbPath) {
          if (pic.thumbPath instanceof Map) {
            const toArray = Array.from(pic.thumbPath);
            // log("开始下载缩略图", toArray);
            for (let i = 0; i < toArray.length; i++) {
              const el = toArray[i][1];
              if (!fs.existsSync(el)) {
                try {
                  // log("尝试下载", el, picUrls[i]);
                  const body = await downloadPic(picUrls[i]);
                  fs.mkdirSync(path.dirname(el), { recursive: true });
                  fs.writeFileSync(el, body);
                } catch (err) {
                  // log("缩略图下载失败", el, err?.message);
                }
              } else {
                // log("缩略图已存在", el);
              }
            }
          }
        }
      }
    }
  }
}
module.exports = processPic;
