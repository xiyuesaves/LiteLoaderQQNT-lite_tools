import { Logs } from "./logs.js";
const log = new Logs("QQ通信模块");
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
      const type = await lite_tools.nativeCall("ns-FsApi", "getFileType", [path], webContentId, true, false);
      const md5 = await lite_tools.nativeCall("ns-FsApi", "getFileMd5", [path], webContentId, true, false);
      const fileName = `${md5}.${type.ext}`;
      const filePath = await lite_tools.nativeCall(
        "ns-ntApi",
        "nodeIKernelMsgService/getRichMediaFilePathForGuild",
        [
          {
            path_info: {
              md5HexStr: md5,
              fileName: fileName,
              elementType: 2,
              elementSubType: 0,
              thumbSize: 0,
              needCreate: true,
              downloadType: 1,
              file_uuid: "",
            },
          },
        ],
        webContentId,
        true,
        false,
      );
      await lite_tools.nativeCall("ns-FsApi", "copyFile", [{ fromPath: path, toPath: filePath }], webContentId, true, false);
      const imageSize = await lite_tools.nativeCall("ns-FsApi", "getImageSizeFromPath", [path], webContentId, true, false);
      const fileSize = await lite_tools.nativeCall("ns-FsApi", "getFileSize", [path], webContentId, true, false);
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
        msgAttributeInfos: new Map(),
      },
      null,
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
        msgAttributeInfos: new Map(),
        srcContact: convertPeer(srcpeer),
        dstContacts: [convertPeer(dstpeer)],
        commentElements: [],
      },
      null,
    ],
    webContentId,
    false,
    false,
  );
}

/**
 * 获取用户信息
 * @param {String} uid 用户Uid
 * @returns Object
 */
function getUserInfo(uid) {
  return lite_tools.nativeCall(
    "ns-ntApi",
    "nodeIKernelProfileService/getUserDetailInfo",
    [{ uid: uid }, undefined],
    webContentId,
    ["nodeIKernelProfileListener/onProfileDetailInfoChanged", "nodeIKernelProfileListener/onProfileSimpleChanged"],
    false,
  );
}

/**
 * 跳转到指定群组的指定消息id处
 * @param {Object} sceneData 场景数据
 * @returns
 */
function goMainWindowScene(sceneData) {
  return lite_tools.nativeCall(
    "ns-WindowApi",
    "goMainWindowScene",
    [
      {
        scene: sceneData.scene,
        sceneParams: {
          peerUid: sceneData.peerUid,
          chatType: sceneData.chatType,
          type: sceneData.type,
          params: {
            msgId: sceneData.msgId,
          },
        },
      },
    ],
    webContentId,
    false,
    false,
  );
}

/**
 *
 * @param {String} uid 获取群组信息
 * @returns Object
 */
function getGroupInfo(uid) {
  return lite_tools.nativeCall(
    "ns-ntApi",
    "nodeIKernelGroupService/getGroupDetailInfo",
    [{ groupCode: uid, source: 4 }, undefined],
    webContentId,
    "nodeIKernelGroupListener/onGroupDetailInfoChange",
    false,
  );
}

/**
 * 获取群组列表
 * @param {Boolean} forced 是否强制刷新列表
 */
function getGroupsList(forced = false) {
  return lite_tools.nativeCall(
    "ns-ntApi",
    "nodeIKernelGroupService/getGroupList",
    [{ forceFetch: forced }],
    webContentId,
    "nodeIKernelGroupListener/onGroupListUpdate",
    false,
  );
}

export { sendMessage, forwardMessage, getUserInfo, goMainWindowScene };
