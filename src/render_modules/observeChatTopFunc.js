// 监听聊天框上方功能
async function observeChatTopFunc() {
  const { options } = await import("./options.js");
  new MutationObserver((mutations, observe) => {
    document.querySelectorAll(".panel-header__action .func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.chatAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    // 更新聊天框上方功能列表
    const textAreaList = Array.from(document.querySelectorAll(".panel-header__action .func-bar .bar-icon"))
      .map((el) => {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          id: el.querySelector(".icon-item").id,
          disabled: el.classList.contains(".disabled"),
        };
      })
      .filter((el) => !options.chatAreaFuncList.find((_el) => _el.name === el.name));
    if (textAreaList.length) {
      log("发送聊天框上方功能列表");
      lite_tools.sendChatTopList(textAreaList);
    }
    observe.disconnect();
  }).observe(document.querySelector(".panel-header__action"), {
    attributes: false,
    childList: true,
    subtree: true,
  });
}

export { observeChatTopFunc };
