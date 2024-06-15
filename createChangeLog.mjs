import { readFileSync, writeFileSync } from "fs";
const packageJSON = JSON.parse(readFileSync("./package.json", "utf-8"));
const releaseBody = readFileSync("./release.md", "utf-8");
const relesasText = `## v${packageJSON.version} - ${new Date().toLocaleString("zh-cn", { hour12: false })}\n\n` + releaseBody;
const releaseList = [];

releaseList.push(relesasText);

async function getAllRelease(list = [], page = 1) {
  const res = await fetch(`https://api.github.com/repos/xiyuesaves/LiteLoaderQQNT-lite_tools/releases?per_page=100&page=${page}`);
  const json = await res.json();
  if (typeof json.length === "number") {
    list = list.concat(json);
    console.log(list.length, json.length);
    if (json.length === 100) {
      await getAllRelease(list, ++page);
    } else {
      list.forEach((item) => {
        releaseList.push(`## ${item.tag_name} - ${new Date(item.created_at).toLocaleString("zh-cn", { hour12: false })}\n\n${item.body}`);
      });
      writeFileSync("./changeLog.md", releaseList.join("\n\n"));
    }
  } else {
    throw json;
  }
}

export { getAllRelease };
