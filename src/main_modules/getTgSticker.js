import { fetch } from "undici";
import { Readable } from "stream";
import Ffmpeg from "fluent-ffmpeg";
import { join } from "path";
import { ipcMain } from "electron";
import { writeFileSync, mkdirSync } from "fs";
import { config } from "./config.js";
import { settingWindow } from "./captureWindow.js";
import { folderUpdate, setPauseWatch } from "./localEmoticons.js";
import { spawn } from "child_process";
import { ungzip } from "pako";
const fs = require('fs');
import { Logs } from "./logs.js";
const log = new Logs("getTgSticker");
const MAX_CONCURRENT_DOWNLOADS = 8;
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
        const videoList = [];
        const animatedList = [];
        stickerList.forEach((item) => {
					if (item.is_animated) {
						animatedList.push(item);
					}else if (item.is_video) {
						videoList.push(item);
					} else {
						pictureList.push(item);
					}
        });
        log(`共有 ${pictureList.length}个静图 ${videoList.length + animatedList.length}个动图`);
        if (pictureList.length + animatedList.length + videoList.length > 0) {
          const concatArr = [...pictureList, ...animatedList, ...videoList];
          const downloads = [];
          for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS; i++) {
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
            let message = `${data.result.title} 下载失败 ${err?.message} ${err?.stack}`;
            switch (err?.message) {
              case "fetch failed":
                if (config.proxy.enabled) {
                  message = `${data.result.title} 下载失败，网络错误，无法访问Telegram服务器`;
                } else {
                  message = `${data.result.title} 下载失败，网络错误，请尝试添加代理地址`;
                }
                break;
              default:
                message = `${data.result.title} 下载失败，${err?.message} ${err?.stack}`;
            }
            settingWindow.webContents.send("LiteLoader.lite_tools.onDownloadTgStickerEvent", {
              message,
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

        async function convertLottieToGif(inputBuffer, outputPath){
        	const exePath = config.localEmoticons.tgsToGifPath;

					const convertStdin = spawn(exePath, [outputPath]);
					const inputStream = Readable.from(inputBuffer);
					convertStdin.stdout.on("inputBuffer", (inputBuffer) => {});
					convertStdin.stderr.on("data", (inputBuffer) => {
						log("Lottie转Gif错误:", inputBuffer.toString());
					});
					convertStdin.on("close", (code) => {});
					inputStream.pipe(convertStdin.stdin);
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
          mkdirSync(folderPath, { recursive: true });
          if (item.is_video) {
            const fileName = `${file_unique_id}.gif`;
            const filePath = join(folderPath, fileName);
            await new Promise((res, rej) => {
              Ffmpeg(Readable.from(buffer))
                .inputOptions(["-vcodec", "libvpx-vp9"])
                .outputOptions(["-vf", "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", "-loop", "0"])
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
          } else if (item.is_animated) {
						const fileTgsName = `${file_unique_id}.tgs`;
						const fileName = `${file_unique_id}.gif`;
            const fileInputPath = join(folderPath, fileTgsName);
						const fileOutputPath = join(folderPath, fileName);
						const lottie_json = new TextDecoder("utf-8").decode(await ungzip(buffer));
						await convertLottieToGif(lottie_json, fileOutputPath);
						log("TGS动图下载完成", fileOutputPath);
					} else {
            const fileName = `${file_unique_id}.webp`;
            const filePath = join(folderPath, fileName);
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
      log("下载贴纸包失败", err.message, err.stack);
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
