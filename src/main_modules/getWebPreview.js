const Opt = require("./option");
let options = Opt.value;
const logs = require("./logs");
const log = logs("链接预览");
// 把缓存逻辑移到这里，好让所有页面共用
// 缓存1000条url预览数据
const MAX_CACHE_SIZE = 1000;
let previewCatch = new Map();

async function getWebText(url) {
  try {
    const data = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": options.global.UA,
      },
    });
    const text = await data.text();
    return {
      success: true,
      data: text,
    };
  } catch (err) {
    return {
      success: false,
      err: err.message,
    };
  }
}

async function getMeatData(url) {
  const res = await getWebText(url);
  if (!res.success) {
    return res;
  }
  const metaTags = res.data.match(/<meta[^>]+>/g);
  if (!(metaTags && metaTags.length)) {
    return {
      success: false,
      err: "没有找到meta数据",
    };
  }
  console.log(metaTags);
  const meta = {};
  metaTags.forEach((tag) => {
    const name = tag.match(/name=["']([^"']+)["']/) || tag.match(/<title>([^<]+)<\/title>/);
    const content = tag.match(/content=["']([^"']+)["']/);
    const property = tag.match(/property=["']([^"']+)["']/);
    if (((name && name.length) || (property && property.length)) && content && content.length) {
      meta[name?.[1] ?? property?.[1]] = content[1];
    }
  });
  const urlObj = new URL(url);
  meta.url = urlObj.host.replace(/^www\./, "").replace(/^.{1}/, (str) => str.toUpperCase());
  return {
    success: true,
    data: meta,
  };
}

module.exports = async function getWebPrevew(url) {
  let standardData = previewCatch.get(url);
  if (!standardData) {
    const webMeta = await getMeatData(url);
    if (!webMeta.success) {
      return webMeta;
    }
    standardData = {
      title: webMeta.data["og:title"] || webMeta.data["twitter:title"] || webMeta.data["title"],
      image: webMeta.data["og:image"] || webMeta.data["twitter:image:src"] || webMeta.data["image"],
      imageHeight: webMeta.data["og:image:height"],
      imageWidth: webMeta.data["og:image:width"],
      alt: webMeta.data["og:image:alt"] || webMeta.data["twitter:description"] || webMeta.data["description"],
      description: webMeta.data["og:description"] || webMeta.data["twitter:description"] || webMeta.data["description"],
      site_name: webMeta.data["og:site_name"] || webMeta.data["twitter:site"] || webMeta.data["url"],
    };
    previewCatch.set(url, standardData);
    // 如果超过限制则移除最老的10%数据
    if (previewCatch.size >= MAX_CACHE_SIZE) {
      const array = Array.from(previewCatch);
      const arrayLength = array.length;
      previewCatch = new Map(array.splice(0, arrayLength - arrayLength * 0.1));
    }
    log("查询成功", url, standardData);
  } else {
    log("命中缓存", url, standardData);
  }
  return {
    success: true,
    data: standardData,
  };
};
