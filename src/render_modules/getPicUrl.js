import { options } from "./options.js";
export async function getPicUrl(picData, chatType) {
  if (picData.originImageUrl) {
    if (picData.originImageUrl.includes("&rkey=")) {
      return `${options.global.IMAGE_HTTP_HOST_NT}${picData.originImageUrl}`;
    } else {
      const rkey = await lite_tools.getRkey(chatType);
      console.log("返回rkey",rkey);
      return `${options.global.IMAGE_HTTP_HOST_NT}${picData.originImageUrl}${rkey}`;
    }
  } else {
    return `${options.global.IMAGE_HTTP_HOST}/gchatpic_new/0/0-0-${picData.md5HexStr.toUpperCase()}/0`;
  }
}
