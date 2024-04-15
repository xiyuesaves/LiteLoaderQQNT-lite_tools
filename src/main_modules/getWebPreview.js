async function getWebText(url) {
  try {
    const data = await fetch(url, {
      method: "GET",
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
    const name = tag.match(/name=["']([^"']+)["']/);
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
  const webMeta = await getMeatData(url);
  if (!webMeta.success) {
    return webMeta;
  }
  const standardData = {
    title: webMeta.data["og:title"] || webMeta.data["twitter:title"] || webMeta.data["title"],
    image: webMeta.data["og:image"] || webMeta.data["twitter:image:src"] || webMeta.data["image"],
    imageHeight: webMeta.data["og:image:height"],
    imageWidth: webMeta.data["og:image:width"],
    alt: webMeta.data["og:image:alt"] || webMeta.data["twitter:description"] || webMeta.data["description"],
    description: webMeta.data["og:description"] || webMeta.data["twitter:description"] || webMeta.data["description"],
    site_name: webMeta.data["og:site_name"] || webMeta.data["twitter:site"] || webMeta.data["url"],
  };
  return {
    success: true,
    data: standardData,
  };
};
