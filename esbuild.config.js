const { buildSync } = require("esbuild");
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
thisTime = new Date().getTime();
// debug页面
buildSync({
  entryPoints: ["./src/render_modules/debug.js"],
  bundle: true,
  outfile: "./dist/debug.js",
  target: "es2020",
  platform: "browser",
  charset: "utf8",
});
console.log(`debug页面打包耗时：${(new Date().getTime() - thisTime) / 1000} s`);
// 渲染进程 - 不需要被打包
// buildSync({
//   entryPoints: ["./src/renderer.js"],
//   bundle: true,
//   outfile: "./dist/render.js",
//   target: "es2020",
//   platform: "neutral",
//   charset: "utf8",
// });
