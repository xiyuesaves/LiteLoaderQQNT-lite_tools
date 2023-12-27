import { logs } from "./logs.js";
const log = new logs("QQ通信模块").log;
let webContentId = lite_tools.getWebContentId();

if (!webContentId) {
  webContentId = 2;
}

log("获取到当前窗口Id", webContentId);

/**
 *
 * @param {Peer} peer 转换Peer对象
 * @returns Contact
 */
function convertPeer(peer) {
  return {
    chatType: peer.chatType == "friend" ? 1 : peer.chatType == "group" ? 2 : 1,
    peerUid: peer.uid,
    guildId: "",
  };
}

/**
 *
 * @param {Array} message 消息链
 * @returns
 */
async function convertMessage(message) {
  switch (message.type) {
    case "text":
      return {
        elementType: 1,
        elementId: "",
        textElement: {
          content: message.content,
          atType: 0,
          atUid: "",
          atTinyId: "",
          atNtUid: "",
        },
      };
    case "image":
      const path = message.path;
      const type = await lite_tools.nativeCall("ns-fsApi", "getFileType", [path], webContentId, true, false);
      const md5 = await lite_tools.nativeCall("ns-fsApi", "getFileMd5", [path], webContentId, true, false);
      const fileName = `${md5}.${type.ext}`;
      const filePath = await lite_tools.nativeCall(
        "ns-ntApi",
        "nodeIKernelMsgService/getRichMediaFilePath",
        [
          {
            md5HexStr: md5,
            fileName: fileName,
            elementType: 2,
            elementSubType: 0,
            thumbSize: 0,
            needCreate: true,
            fileType: 1,
          },
        ],
        webContentId,
        true,
        false,
      );
      await lite_tools.nativeCall("ns-fsApi", "copyFile", [{ fromPath: path, toPath: filePath }], webContentId, true, false);
      const imageSize = await lite_tools.nativeCall("ns-fsApi", "getImageSizeFromPath", [path], webContentId, true, false);
      const fileSize = await lite_tools.nativeCall("ns-fsApi", "getFileSize", [path], webContentId, true, false);
      const picElement = {
        md5HexStr: md5,
        fileSize: fileSize,
        picWidth: imageSize.width,
        picHeight: imageSize.height,
        fileName: fileName,
        sourcePath: filePath,
        original: true,
        picType: 1001,
        picSubType: 0,
        fileUuid: "",
        fileSubId: "",
        thumbFileSize: 0,
        summary: "",
      };
      return {
        elementType: 2,
        elementId: "",
        picElement,
      };
    default:
      return null;
  }
}

/**
 *
 * @param {Peer} peer peer对象，通过lite_tools.getPeer()获取
 * @param {Array} messages 消息链
 */
async function sendMessage(peer, messages) {
  log("发送消息", peer, messages);
  lite_tools.nativeCall(
    "ns-ntApi",
    "nodeIKernelMsgService/sendMsg",
    [
      {
        msgId: "0",
        peer: convertPeer(peer),
        msgElements: await Promise.all(messages.map((message) => convertMessage(message))),
      },
    ],
    webContentId,
    false,
    false,
  );
}

/**
 *
 * @param {Peer} srcpeer 转发消息Peer
 * @param {Peer} dstpeer 目标Peer
 * @param {Array} msgIds 消息Id数组
 */
function forwardMessage(srcpeer, dstpeer, msgIds) {
  log("转发消息", srcpeer, dstpeer, msgIds);
  lite_tools.nativeCall(
    "ns-ntApi",
    "nodeIKernelMsgService/forwardMsgWithComment",
    [
      {
        msgIds,
        srcContact: convertPeer(srcpeer),
        dstContacts: [convertPeer(dstpeer)],
        commentElements: [],
      },
    ],
    webContentId,
    false,
    false,
  );
}

export { sendMessage, forwardMessage };
