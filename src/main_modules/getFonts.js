import { exec } from "node:child_process";
import { ipcMain } from "electron";
import { Logs } from "./logs";
import os from "os";
const log = new Logs("获取字体模块");
const release = os.release();
/**
 * windows系统获取字体列表
 * @returns {Promise}
 */
function winGetFonts() {
  if (parseInt(release) >= 10) {
    return new Promise((res, rej) => {
      exec(
        `[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
      [System.Reflection.Assembly]::LoadWithPartialName("System.Drawing");
      (New-Object System.Drawing.Text.InstalledFontCollection).Families;`,
        {
          shell: "powershell.exe",
          encoding: "utf8",
        },
        (err, stdout, stderr) => {
          if (err) {
            rej(err);
          }
          if (stderr) {
            rej(stderr);
          }
          const fontList = stdout
            .split("\n")
            .filter((line) => line.startsWith("Name"))
            .map((line) => line.substring(7, line.length - 1));
          res(fontList);
        },
      );
    });
  } else {
    return Promise.reject("系统不支持");
  }
}
/**
 * Linux获取字体列表
 * @returns {Promise}
 */
function linuxGetFonts() {
  return new Promise((res, rej) => {
    exec(
      `fc-list | grep -oP "(?<=: ).*?(?=:)"`,
      {
        shell: "/bin/sh",
        encoding: "utf8",
      },
      (err, stdout, stderr) => {
        if (err) {
          rej(err);
        }
        if (stderr) {
          rej(stderr);
        }
        const fontList = stdout.split("\n").filter((v) => v.trim());
        const uniqueFontList = [];
        const seen = new Set();
        fontList.forEach((v) => {
          if (!seen.has(v)) {
            seen.add(v);
            uniqueFontList.push(v);
          }
        });
        res(uniqueFontList);
      },
    );
  });
}

/**
 * Mac系统获取字体列表
 * @returns {Promise}
 */
function macGetFonts() {
  return new Promise((res, rej) => {
    exec(
      "atsutil fonts -list",
      {
        encoding: "utf8",
      },
      (err, stdout, stderr) => {
        if (err) {
          rej(err);
        }
        if (stderr) {
          rej(stderr);
        }
        const fontsAndFamilies = stdout.split("\n").map((s) => s.trim());
        const familyStart = fontsAndFamilies.indexOf("System Families:");
        const fontList = fontsAndFamilies.slice(familyStart + 1);
        res(fontList);
      },
    );
  });
}
let systemFontList = [];
// 获取系统字体列表
ipcMain.handle("LiteLoader.lite_tools.getSystemFonts", async (_) => {
  if (systemFontList.length <= 1) {
    try {
      switch (LiteLoader.os.platform) {
        case "win32":
          systemFontList = await winGetFonts();
          break;
        case "darwin":
          systemFontList = await macGetFonts();
          break;
        case "linux":
          systemFontList = await linuxGetFonts();
          break;
      }
    } catch (err) {
      log("获取字体列表失败", err);
      systemFontList = ["获取系统字体列表失败"];
    }
  }
  return systemFontList;
});
