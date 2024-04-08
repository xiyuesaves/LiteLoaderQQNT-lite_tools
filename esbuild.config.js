const { buildSync } = require("esbuild");
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
// debug页面
buildSync({
  entryPoints: ["./src/render_modules/debug.js"],
  bundle: true,
  outfile: "./dist/debug.js",
  target: "es2020",
  platform: "browser",
  charset: "utf8",
});
// 渲染进程 - 不需要被打包
// buildSync({
//   entryPoints: ["./src/renderer.js"],
//   bundle: true,
//   outfile: "./dist/render.js",
//   target: "es2020",
//   platform: "neutral",
//   charset: "utf8",
// });