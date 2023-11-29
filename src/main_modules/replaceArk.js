// appid对应小程序名称
const appidName = new Map([
  ["1109224783", "微博"],
  ["1109937557", "哔哩哔哩"],
]);

// 获取ark卡片对应内容
function getArkData(json) {
  return json.meta.detail_1.title || appidName.get(json.meta.detail_1.appid) || json.meta.detail_1.desc;
}

// 卡片替换函数
function replaceArk(json, msg_seq) {
  return JSON.stringify({
    app: "com.tencent.structmsg",
    config: json.config,
    desc: "新闻",
    extra: { app_type: 1, appid: json.meta.detail_1.appid, msg_seq, uin: json.meta.detail_1.host.uin },
    meta: {
      news: {
        action: "",
        android_pkg_name: "",
        app_type: 1,
        appid: json.meta.detail_1.appid,
        ctime: json.config.ctime,
        desc: json.meta.detail_1.desc,
        jumpUrl: json.meta.detail_1.qqdocurl.replace(/\\/g, ""),
        preview: json.meta.detail_1.preview,
        source_icon: json.meta.detail_1.icon,
        source_url: "",
        tag: getArkData(json),
        title: getArkData(json),
        uin: json.meta.detail_1.host.uin,
      },
    },
    prompt: `[分享]${getArkData(json)}`,
    ver: "0.0.0.1",
    view: "news",
  });
}
exports.replaceArk = replaceArk;
