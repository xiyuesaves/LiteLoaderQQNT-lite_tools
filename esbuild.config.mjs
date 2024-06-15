import { buildSync } from "esbuild";
import * as sass from "sass";
import { getAllRelease } from "./createChangeLog.mjs";
import fs from "fs";
let thisTime = new Date().getTime();
const lite_tools = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const manifest_json = JSON.parse(fs.readFileSync("./manifest.json", "utf-8"));

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

// 更新版本号
console.log(`更新 manifest.json 版本号为 ${lite_tools.version}`);
manifest_json.version = lite_tools.version;
manifest_json.repository.release.tag = `v${lite_tools.version}`;
fs.writeFileSync("./manifest.json", JSON.stringify(manifest_json, null, 2));

// 生成更新日志
console.log("生成更新日志...");
await getAllRelease();

console.log("构建完成");
