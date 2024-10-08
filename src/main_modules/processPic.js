import { dirname, join, basename } from "path";
import { loadConfigPath } from "./config.js";
import { existsSync, mkdirSync, writeFileSync, statSync } from "fs";
import { downloadPic } from "./downloadPic.js";
import { config } from "./config.js";
import { getRkey } from "./getRkey.js";
import { Logs } from "./logs.js";
const log = new Logs("图片处理模块");

// 获取图片链接
async function getPicUrl(picData, chatType) {
  let picURL = "";
  if (picData.originImageUrl.startsWith("/download?")) {
    if (picData.originImageUrl.includes("&rkey=")) {
      return `${config.global.IMAGE_HTTP_HOST_NT}${picData.originImageUrl}`;
    } else {
      const rkey = await getRkey(chatType);
      picURL = `${config.global.IMAGE_HTTP_HOST_NT}${picData.originImageUrl}${rkey}`;
    }
  } else {
    picURL = `${config.global.IMAGE_HTTP_HOST}${picData.originImageUrl}`;
  }
  return picURL;
}

/**
 * 获取图片链接数组
 * @param {Object} picData 图片对象
 * @param {String} chatType 消息类型
 * @returns String[]
 */
async function getPicArr(picData, chatType) {
  const rawUrl = await getPicUrl(picData, chatType);
  return [0, 198, 720].map((el) => {
    if (rawUrl.includes("gchatpic_new")) {
      return rawUrl.replace(/\/0(\?term=255&is_origin=0)?$/, `/${el}$1`);
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
        const chatType = msgItem.chatType === 2 ? "group_rkey" : "private_rkey";
        // 另存为图片到插件配置目录
        if (config.preventMessageRecall.redirectPicPath) {
          pic.sourcePath = join(loadConfigPath, `preventMessageRecall/Ori/${basename(pic.sourcePath)}`);
        }
        // 图片url数组
        let picUrls = null;
        if (requireDownload(pic.sourcePath)) {
          picUrls = await getPicArr(pic, chatType);
          try {
            log("下载原图");
            const body = await downloadPic(picUrls[0]);
            mkdirSync(dirname(pic.sourcePath), { recursive: true });
            writeFileSync(pic.sourcePath, body);
          } catch (err) {
            log("原图下载失败", picUrls[0], err?.message, err?.stack);
          }
        }
        if (pic?.thumbPath) {
          if (picUrls) {
            picUrls = await getPicArr(pic, chatType);
          }
          pic.thumbPath = new Map([
            [0, pic.sourcePath],
            [198, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_198")],
            [720, pic.sourcePath.replace("Ori", "Thumb").replace(pic.md5HexStr, pic.md5HexStr + "_720")],
          ]);
          const thumbPics = Array.from(pic.thumbPath);
          for (let i = 0; i < thumbPics.length; i++) {
            const thumbPicPath = thumbPics[i][1];
            if (requireDownload(thumbPicPath)) {
              try {
                log("下载缩略图", thumbPicPath, picUrls[i]);
                const body = await downloadPic(picUrls[i]);
                mkdirSync(dirname(thumbPicPath), { recursive: true });
                writeFileSync(thumbPicPath, body);
              } catch (err) {
                log("缩略图下载失败", picUrls[i], err?.message, err?.stack);
              }
            }
          }
        }
      }
    }
  }
}

/**
 * 判断是否需要下载图片
 * @param {String} path 图片本地路径
 * @returns {Boolean}
 */
function requireDownload(path) {
  if (existsSync(path)) {
    const stats = statSync(path);
    return stats.size < 100;
  }
  return true;
}

export { processPic };
