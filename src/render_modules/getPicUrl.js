import { options } from "./options.js";
export function getPicUrl(picData) {
  if (picData.originImageUrl) {
    if (picData.originImageUrl.includes("&rkey=")) {
      return `${options.global.PIC_BASE_URL}${picData.originImageUrl}`;
    } else {
      return `${options.global.PIC_BASE_URL}${picData.originImageUrl}${options.global.rkey}`;
    }
  } else {
    return `${options.global.PIC_BASE_URL}/gchatpic_new/0/0-0-${picData.md5HexStr.toUpperCase()}/0`;
  }
}
