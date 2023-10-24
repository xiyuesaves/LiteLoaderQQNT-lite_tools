// 监听输入框上方功能
async function observerChatArea() {
  const { options } = await import("./options.js");
  const { localEmoticons } = await import("./localEmoticons.js");

  new MutationObserver((mutations, observe) => {
    // 禁用指定功能
    document.querySelectorAll(".chat-func-bar .bar-icon").forEach((el) => {
      const name = el.querySelector(".icon-item").getAttribute("aria-label");
      const find = options.textAreaFuncList.find((el) => el.name === name);
      if (find) {
        if (find.disabled) {
          el.classList.add("disabled");
        } else {
          el.classList.remove("disabled");
        }
      }
    });
    const textAreaList = Array.from(document.querySelectorAll(".chat-func-bar .bar-icon"))
      .map((el) => {
        return {
          name: el.querySelector(".icon-item").getAttribute("aria-label"),
          id: el.querySelector(".icon-item").id,
          disabled: el.classList.contains(".disabled"),
        };
      })
      .filter((el) => !options.textAreaFuncList.find((_el) => _el.name === el.name));
    if (textAreaList.length) {
      lite_tools.sendTextAreaList(textAreaList);
    }
    // 插入图标
    if (true && !document.querySelector(".lite-tools-bar")) {
      localEmoticons();
    }
  }).observe(document.querySelector(".chat-input-area .chat-func-bar"), {
    attributes: false,
    childList: true,
    subtree: true,
  });
}

export { observerChatArea };
