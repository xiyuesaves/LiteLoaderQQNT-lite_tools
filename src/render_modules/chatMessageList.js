/**
 * 通用聊天消息列表处理模块
 */
async function chatMessageList() {
  const { options } = await import("./options.js");
  // 判断是否开启头像黏贴效果
  if (options.message.avatarSticky.enabled) {
    document.body.classList.add("avatar-sticky");
    if (options.message.avatarSticky.toBottom) {
      document.body.classList.add("avatar-end");
    } else {
      document.body.classList.remove("avatar-end");
    }
  } else {
    document.body.classList.remove("avatar-sticky", "avatar-end");
  }
  // 是否开启消息合并
  if (options.message.avatarSticky.enabled && options.message.mergeMessage) {
    document.body.classList.add("merge-message");
  } else {
    document.body.classList.remove("merge-message");
    document.querySelectorAll(".avatar-span").forEach((el) => {
      el.style.height = "unset";
    });
  }
}

export { chatMessageList };
