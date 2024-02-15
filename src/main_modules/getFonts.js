const { exec } = require("node:child_process");
function winGetFonts() {
  return new Promise((res, rej) => {
    exec(
      `chcp 65001;
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

// 等待有缘人提pr
function linuxGetFonts() {
  return Promise.resolve(["当前系统不受支持"]);
}

// 等待有缘人提pr
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
