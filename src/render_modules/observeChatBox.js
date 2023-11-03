import { options } from "./options.js";

/**
 * 通用监听输入框编辑事件
 */
function observeChatBox() {
  const ckeditorInstance = document.querySelector(".ck.ck-content.ck-editor__editable").ckeditorInstance;
  let isReply = false;

  const originalApplyOperation = ckeditorInstance.editing.model.applyOperation;
  const patchedApplyOperation = function (...args) {
    // 在检测到插入回复节点后，在10ms内阻止插入At节点和空格消息
    if (options.message.removeReplyAt) {
      if (args[0]?.nodes?._nodes[0]?.name === "msg-reply" && !isReply) {
        isReply = true;
        setTimeout(() => {
          isReply = false;
        });
      }
      if (args[0]?.nodes?._nodes[0]?.name === "msg-at" && isReply) {
        args[0].nodes._nodes = [];
      }
      if (args[0]?.nodes?._nodes[0]?._data === " " && isReply) {
        args[0].nodes._nodes = [];
        isReply = false;
      }
    }
    return originalApplyOperation.call(ckeditorInstance.editing.model, ...args);
  };
  ckeditorInstance.editing.model.applyOperation = patchedApplyOperation;
}

export { observeChatBox };
