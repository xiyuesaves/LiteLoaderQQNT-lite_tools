import { extname, basename } from "path";

import { config, onUpdateConfig } from "./config.js";
import { Logs } from "./logs.js";
import { RangesServer } from "./rangesServer.js";
import { globalBroadcast } from "./globalBroadcast.js";
import { ipcMain } from "electron";
const videoServer = new RangesServer();
const log = new Logs("背景模块");

let backgroundData;

onUpdateConfig(() => {
  // 更新窗口背景
  if (config.background.enabled) {
    if ([".mp4", ".webm"].includes(extname(config.background.url))) {
      videoServer.setFilePath(config.background.url);
      videoServer
        .startServer()
        .then((port) => {
          backgroundData = {
            href: `http://localhost:${port}/${basename(config.background.url)}`,
            type: "video",
          };
          log("背景-更新为视频");
          globalBroadcast("LiteLoader.lite_tools.updateWallpaper", config.background.enabled, backgroundData);
        })
        .catch((err) => {
          log("启用视频背景服务时出错", err);
          backgroundData = {
            href: "",
            type: "image",
          };
          globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
        });
    } else {
      videoServer.stopServer();
      backgroundData = {
        href: `local:///${config.background.url.replace(/\\/g, "//")}`,
        type: "image",
      };
      log("背景-更新为图片");
      globalBroadcast("LiteLoader.lite_tools.updateWallpaper", config.background.enabled, backgroundData);
    }
  } else {
    videoServer.stopServer();
    backgroundData = {
      href: "",
      type: "image",
    };
    globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
  }
});

// 选择文件事件
ipcMain.on("LiteLoader.lite_tools.openSelectBackground", () => {
  dialog
    .showOpenDialog({
      title: "请选择文件", //默认路径,默认选择的文件
      defaultPath: "default.jpg", //过滤文件后缀
      filters: [
        {
          name: "img",
          extensions: ["jpg", "png", "gif", "webp", "jpeg", "mp4", "webm"],
        },
      ], //打开按钮
      buttonLabel: "选择", //回调结果渲染到img标签上
    })
    .then((result) => {
      log("选择了文件", result);
      if (!result.canceled) {
        const newFilePath = path.join(result.filePaths[0]);
        // 背景视频相关
        if (config.background.enabled && newFilePath !== config.background.url) {
          if ([".mp4", ".webm"].includes(path.extname(newFilePath))) {
            videoServer.setFilePath(newFilePath);
            videoServer
              .startServer()
              .then((port) => {
                backgroundData = {
                  href: `http://localhost:${port}/${path.basename(newFilePath)}`,
                  type: "video",
                };
                log("背景-更新为视频");
                globalBroadcast("LiteLoader.lite_tools.updateWallpaper", config.background.enabled, backgroundData);
              })
              .catch((err) => {
                log("启用视频背景服务时出错", err);
                backgroundData = {
                  href: "",
                  type: "image",
                };
                globalBroadcast("LiteLoader.lite_tools.updateWallpaper", false, backgroundData);
              });
          } else {
            videoServer.stopServer();
            backgroundData = {
              href: `local:///${newFilePath.replace(/\\/g, "//")}`,
              type: "image",
            };
            log("背景-更新为图片");
            globalBroadcast("LiteLoader.lite_tools.updateWallpaper", config.background.enabled, backgroundData);
          }
        }
        config.background.url = newFilePath;
      }
    })
    .catch((err) => {
      log("无效操作", err);
    });
});

ipcMain.handle("LiteLoader.lite_tools.getWallpaper", (event) => {
  return [config.background.enabled, backgroundData];
});
