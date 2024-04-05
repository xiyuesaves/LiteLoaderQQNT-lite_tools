const BASE_URL = "https://gchat.qpic.cn";
const TEMP_RKEY = "&rkey=CAMSKLgthq-6lGU_w8qRmii91Wd89eUjW4Rg44v_zM9qUrjZjrZd-CfXFtI";
export function getPicUrl(picData) {
  console.log(picData);
  if (!picData.original) {
    if (picData.originImageUrl) {
      if (picData.originImageUrl.includes("&rkey=")) {
        return `${BASE_URL}${picData.originImageUrl}`;
      } else {
        return `${BASE_URL}${picData.originImageUrl}${TEMP_RKEY}`;
      }
    } else {
      return `${BASE_URL}/gchatpic_new/0/0-0-${picData.originImageMd5}/0`;
    }
  } else {
    return `${BASE_URL}/gchatpic_new/0/0-0-${picData.md5HexStr.toUpperCase()}/0`;
  }
}
