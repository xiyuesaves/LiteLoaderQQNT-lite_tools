// 监听输入框上方功能
async function observerChatArea() {
  const { options } = await import("./options.js");
  new MutationObserver((mutations, observe) => {
    document.querySelectorAll(".chat-input-area .chat-func-bar .bar-icon").forEach((el) => {
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
    // 更新输入框上方功能列表
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
  }).observe(document.querySelector(".chat-input-area"), {
    attributes: false,
    childList: true,
    subtree: true,
  });
}

export { observerChatArea };
