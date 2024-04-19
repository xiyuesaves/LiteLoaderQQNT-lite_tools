const { buildSync } = require("esbuild");
const sass = require("sass");
const fs = require("fs");
let thisTime = new Date().getTime();
// 主进程
buildSync({
  entryPoints: ["./src/main.js"],
  bundle: true,
  outfile: "./dist/main.js",
  target: "node16",
  platform: "node",
  charset: "utf8",
  external: ["electron", "sass"],
});
console.log(`主进程打包耗时：${(new Date().getTime() - thisTime) / 1000} s`);
// debug页面
thisTime = new Date().getTime();
buildSync({
  entryPoints: ["./src/render_modules/debug.js"],
  bundle: true,
  outfile: "./dist/debug.js",
  target: "es2020",
  platform: "browser",
  charset: "utf8",
});
console.log(`debug页面打包耗时：${(new Date().getTime() - thisTime) / 1000} s`);
// 处理scss
thisTime = new Date().getTime();
fs.mkdirSync("./src/css", { recursive: true });
fs.writeFileSync("./src/css/global.css", sass.compile("./src/scss/global.scss").css);
fs.writeFileSync("./src/css/style.css", sass.compile("./src/scss/style.scss").css);
fs.writeFileSync("./src/css/view.css", sass.compile("./src/scss/view.scss").css);
console.log(`编译scss耗时：${(new Date().getTime() - thisTime) / 1000} s`);
console.log("构建完成");
