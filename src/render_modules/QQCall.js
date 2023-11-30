import { logs } from "./logs.js";
const log = new logs("QQ通信模块").log;

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
      const type = await lite_tools.QQCall("ns-fsApi", "getFileType", [path], true, false);
      const md5 = await lite_tools.QQCall("ns-fsApi", "getFileMd5", [path], true, false);
      const fileName = `${md5}.${type.ext}`;
      const filePath = await lite_tools.QQCall(
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
        true,
        false,
      );
      await lite_tools.QQCall("ns-fsApi", "copyFile", [{ fromPath: path, toPath: filePath }]);
      const imageSize = await lite_tools.QQCall("ns-fsApi", "getImageSizeFromPath", [path], true, false);
      const fileSize = await lite_tools.QQCall("ns-fsApi", "getFileSize", [path], true, false);
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
 * @param {Peer} peer peer对象，通过lite_tools.getPeer()异步获取
 * @param {Array} messages 消息链
 */
async function sendMessage(peer, messages) {
  log("发送消息", peer, messages);
  lite_tools.QQCall("ns-ntApi", "nodeIKernelMsgService/sendMsg", [
    {
      msgId: "0",
      peer: convertPeer(peer),
      msgElements: await Promise.all(messages.map((message) => convertMessage(message))),
    },
  ]);
}

/**
 *
 * @param {Peer} srcpeer 转发消息Peer
 * @param {Peer} dstpeer 目标Peer
 * @param {Array} msgIds 消息Id数组
 */
function forwardMessage(srcpeer, dstpeer, msgIds) {
  log("转发消息", srcpeer, dstpeer, msgIds);
  lite_tools.QQCall(
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
    false,
    false,
  );
}

export { sendMessage, forwardMessage };
