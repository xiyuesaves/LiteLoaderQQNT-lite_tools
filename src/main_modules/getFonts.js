const { exec } = require("node:child_process");
/**
 * windows系统获取字体列表
 * @returns {Promise}
 */
function winGetFonts() {
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
        const fontList = stdout.split("\n").filter(v => v.trim());
        const uniqueFontList = [];
        const seen = new Set();
        fontList.forEach((v) => {
          if (!seen.has(v)) {
            seen.add(v);
            uniqueFontList.push(v);
          }
        })
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
      'atsutil fonts -list',
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
        const fontsAndFamilies = stdout
          .split("\n")
          .map((s) => s.trim())
        const familyStart = fontsAndFamilies.indexOf('System Families:')
        const fontList = fontsAndFamilies.slice(familyStart + 1)
        res(fontList);
      },
    );
  });
}
module.exports = { winGetFonts, linuxGetFonts, macGetFonts };
