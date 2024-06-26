import { fetch } from "undici";
import { Readable } from "stream";
import Ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import { ipcMain } from "electron";
import { writeFileSync, mkdirSync } from "fs";
import { config } from "./config.js";
import { settingWindow } from "./captureWindow.js";
import { folderUpdate, setPauseWatch } from "./localEmoticons.js";
import { Logs } from "./logs.js";
const log = new Logs("getTgSticker");

/**
 * 添加贴纸路径
 * @param {String} url
 */
async function getTgSticker(url) {
  const BOT_TOKEN = config.localEmoticons.tgBotToken;
  if (config.localEmoticons.ffmpegPath) {
    Ffmpeg.setFfmpegPath(config.localEmoticons.ffmpegPath);
  }
  if (url.startsWith("https://t.me/addstickers/")) {
    try {
      const stickerName = url.split("/")[4];
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${stickerName}`);
      const data = await res.json();
      log("贴图集数据", data);
      if (data.ok) {
        if (data.result.sticker_type !== "regular") {
          throw new Error("不支持的贴纸包类型");
        }
        const stickerData = {
          title: data.result.title,
          name: data.result.name,
          icon: null,
        };
        settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
          message: `开始下载 ${data.result.title}`,
          type: "default",
          duration: 60 * 60 * 1000,
        });
        const stickerList = data.result.stickers;
        const pictureList = [];
        const animatedList = [];
        const dontSupport = [];
        stickerList.forEach((item) => {
          if (!item.is_animated) {
            if (item.is_video) {
              animatedList.push(item);
            } else {
              pictureList.push(item);
            }
            if (animatedList.length + pictureList.length === 1) {
              const iconData = animatedList[0] ?? pictureList[0];
              stickerData.icon = `${iconData.file_unique_id}.${iconData.is_video ? "gif" : "webp"}`;
            }
          } else {
            dontSupport.push(item);
          }
        });
        log(`共有 ${pictureList.length}个静图 ${animatedList.length}个动图 ${dontSupport.length}个不支持`);
        if (pictureList.length + animatedList.length > 0) {
          const concatArr = [...pictureList, ...animatedList];
          const downloads = [];
          for (let i = 0; i < 8; i++) {
            const item = concatArr.shift();
            downloads.push(downloadFile(item));
          }
          try {
            await Promise.all(downloads);
            // 等待表情文件下载完成后再创建贴纸数据文件
            const folderPath = join(config.localEmoticons.localPath, data.result.name);
            const stickerDataPath = join(folderPath, "sticker.json");
            writeFileSync(stickerDataPath, JSON.stringify(stickerData, null, 2));
            settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
              message: `${data.result.title} 下载完成`,
              type: "success",
              duration: 6000,
            });
          } catch (err) {
            settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
              message: `${data.result.title} 下载失败 ${err?.message} ${err?.stack}`,
              type: "error",
              duration: 6000,
            });
          }
        } else if (dontSupport.length) {
          settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
            message: `不支持的贴纸类型 ${data.result.title}`,
            type: "error",
            duration: 6000,
          });
        } else {
          settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
            message: `没有可下载的贴纸 ${data.result.title}`,
            type: "error",
            duration: 6000,
          });
        }
        async function downloadFile(item) {
          const fileId = item.file_id;
          const file_unique_id = item.file_unique_id;
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileData = await res.json();
          const fileRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`);
          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const folderPath = join(config.localEmoticons.localPath, data.result.name);
          const fileName = `${file_unique_id}.gif`;
          const filePath = join(folderPath, fileName);
          mkdirSync(folderPath, { recursive: true });
          if (item.is_video) {
            await new Promise((res, rej) => {
              Ffmpeg(Readable.from(buffer))
                .outputOptions([
                  '-vf',
                  'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                  '-loop',
                  '0'
                ])
                .save(filePath)
                .on("error", (err) => {
                  log("失败", err);
                  rej(new Error(`ffmpeg 错误\n${err.message}`));
                })
                .on("end", () => {
                  log("动图下载完成", filePath);
                  res();
                });
            });
          } else {
            writeFileSync(filePath, buffer);
            log("静图下载完成", filePath);
          }
          if (stickerList.length) {
            const sticker = stickerList.shift();
            await downloadFile(sticker);
          }
        }
      } else {
        throw new Error(data?.description);
      }
    } catch (err) {
      log("下载贴纸包失败", err.message);
      settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
        message: `下载贴纸集失败 ${err.message}`,
        type: "error",
        duration: 6000,
      });
    }
  } else {
    settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
      message: `输入地址不是tg贴纸包`,
      type: "error",
      duration: 6000,
    });
  }
}

ipcMain.on("LiteLoader.lite_tools.downloadTgSticker", (_, url) => {
  setPauseWatch(true);
  getTgSticker(url).finally(() => {
    setPauseWatch(false);
    folderUpdate();
  });
});
