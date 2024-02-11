const { exec } = require("node:child_process");
function winGetFonts(cwd) {
  return new Promise((res, rej) => {
    exec(
      "chcp 65001; ./win_getFonts.ps1",
      {
        cwd,
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
  return Promise.resolve([]);
}

// 等待有缘人提pr
function macGetFonts() {
  return Promise.resolve([]);
}
module.exports = { winGetFonts, linuxGetFonts, macGetFonts };
